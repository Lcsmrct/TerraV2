from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
import bcrypt
from mcstatus import JavaServer
import requests
import json
import base64
import asyncio
from contextlib import asynccontextmanager

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-here')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Minecraft server configuration
MC_SERVER_IP = "91.197.6.209"
MC_SERVER_PORT = 25598

# Security
security = HTTPBearer()

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    minecraft_username: str
    uuid: str
    is_admin: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_login: Optional[datetime] = None
    skin_url: Optional[str] = None

class UserCreate(BaseModel):
    minecraft_username: str

class UserLogin(BaseModel):
    minecraft_username: str

class ServerStats(BaseModel):
    players_online: int
    max_players: int
    server_version: Optional[str] = None
    motd: Optional[str] = None
    latency: Optional[float] = None
    last_updated: datetime = Field(default_factory=datetime.utcnow)

class AdminCommand(BaseModel):
    command: str
    executed_by: str
    executed_at: datetime = Field(default_factory=datetime.utcnow)

# Utility functions
def get_minecraft_uuid(username: str) -> Optional[str]:
    """Get UUID from Minecraft username using Mojang API"""
    try:
        response = requests.get(f"https://api.mojang.com/users/profiles/minecraft/{username}")
        if response.status_code == 200:
            data = response.json()
            return data.get('id')
        return None
    except Exception as e:
        logging.error(f"Error getting UUID for {username}: {e}")
        return None

def get_minecraft_skin(uuid: str) -> Optional[str]:
    """Get skin URL from UUID using Mojang API"""
    try:
        response = requests.get(f"https://sessionserver.mojang.com/session/minecraft/profile/{uuid}")
        if response.status_code == 200:
            data = response.json()
            properties = data.get('properties', [])
            for prop in properties:
                if prop.get('name') == 'textures':
                    texture_data = json.loads(base64.b64decode(prop.get('value')).decode('utf-8'))
                    return texture_data.get('textures', {}).get('SKIN', {}).get('url')
        return None
    except Exception as e:
        logging.error(f"Error getting skin for UUID {uuid}: {e}")
        return None

def create_jwt_token(user_data: dict) -> str:
    """Create JWT token"""
    payload = {
        "user_id": user_data["id"],
        "username": user_data["minecraft_username"],
        "is_admin": user_data["is_admin"],
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_admin_user(current_user: User = Depends(get_current_user)):
    """Get current admin user"""
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# Minecraft server functions
async def get_minecraft_server_status() -> ServerStats:
    """Get Minecraft server status"""
    try:
        server = JavaServer.lookup(f"{MC_SERVER_IP}:{MC_SERVER_PORT}")
        status = server.status()
        
        return ServerStats(
            players_online=status.players.online,
            max_players=status.players.max,
            server_version=status.version.name if status.version else None,
            motd=status.description if hasattr(status, 'description') else None,
            latency=status.latency
        )
    except Exception as e:
        logging.error(f"Error getting server status: {e}")
        # Return default values if server is down
        return ServerStats(
            players_online=0,
            max_players=20,
            server_version="Unknown",
            motd="Server offline",
            latency=0
        )

# Application lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    # Create admin user if not exists
    admin_user = await db.users.find_one({"is_admin": True})
    if not admin_user:
        admin_uuid = get_minecraft_uuid("Admin")
        if admin_uuid:
            admin_skin = get_minecraft_skin(admin_uuid)
            await db.users.insert_one({
                "id": str(uuid.uuid4()),
                "minecraft_username": "Admin",
                "uuid": admin_uuid,
                "is_admin": True,
                "created_at": datetime.utcnow(),
                "skin_url": admin_skin
            })
    
    yield
    # Shutdown
    client.close()

# Create the main app
app = FastAPI(lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Auth endpoints
@api_router.post("/auth/login")
async def login(user_data: UserLogin):
    """Login user with Minecraft username"""
    # Get UUID from Mojang API
    minecraft_uuid = get_minecraft_uuid(user_data.minecraft_username)
    if not minecraft_uuid:
        raise HTTPException(status_code=400, detail="Invalid Minecraft username")
    
    # Check if user exists
    user = await db.users.find_one({"minecraft_username": user_data.minecraft_username})
    
    if not user:
        # Create new user
        skin_url = get_minecraft_skin(minecraft_uuid)
        user_dict = {
            "id": str(uuid.uuid4()),
            "minecraft_username": user_data.minecraft_username,
            "uuid": minecraft_uuid,
            "is_admin": False,
            "created_at": datetime.utcnow(),
            "last_login": datetime.utcnow(),
            "skin_url": skin_url
        }
        await db.users.insert_one(user_dict)
        user = user_dict
    else:
        # Update last login
        await db.users.update_one(
            {"id": user["id"]},
            {"$set": {"last_login": datetime.utcnow()}}
        )
    
    # Create JWT token
    token = create_jwt_token(user)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": User(**user)
    }

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    """Get current user info"""
    return current_user

# Server status endpoints
@api_router.get("/server/status")
async def get_server_status():
    """Get Minecraft server status"""
    return await get_minecraft_server_status()

@api_router.get("/server/players")
async def get_online_players():
    """Get number of online players"""
    status = await get_minecraft_server_status()
    return {"players_online": status.players_online, "max_players": status.max_players}

# User endpoints
@api_router.get("/users", response_model=List[User])
async def get_users(current_user: User = Depends(get_admin_user)):
    """Get all users (admin only)"""
    users = await db.users.find().to_list(1000)
    return [User(**user) for user in users]

@api_router.get("/users/{user_id}")
async def get_user(user_id: str, current_user: User = Depends(get_current_user)):
    """Get user by ID"""
    # Users can only see their own profile or admins can see any
    if current_user.id != user_id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return User(**user)

@api_router.put("/users/{user_id}/admin")
async def toggle_admin(user_id: str, current_user: User = Depends(get_admin_user)):
    """Toggle admin status (admin only)"""
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_admin_status = not user["is_admin"]
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"is_admin": new_admin_status}}
    )
    
    return {"message": f"User admin status updated to {new_admin_status}"}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: User = Depends(get_admin_user)):
    """Delete user (admin only)"""
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

# Admin endpoints
@api_router.get("/admin/stats")
async def get_admin_stats(current_user: User = Depends(get_admin_user)):
    """Get admin statistics"""
    total_users = await db.users.count_documents({})
    admin_users = await db.users.count_documents({"is_admin": True})
    server_status = await get_minecraft_server_status()
    
    return {
        "total_users": total_users,
        "admin_users": admin_users,
        "server_status": server_status,
        "recent_logins": await db.users.find({"last_login": {"$ne": None}}).sort("last_login", -1).limit(10).to_list(10)
    }

@api_router.post("/admin/commands")
async def execute_command(command: AdminCommand, current_user: User = Depends(get_admin_user)):
    """Execute admin command (placeholder - actual implementation depends on server setup)"""
    # This would typically connect to server via RCON
    # For now, we'll just log the command
    command_dict = command.dict()
    command_dict["executed_by"] = current_user.minecraft_username
    
    await db.commands.insert_one(command_dict)
    
    return {"message": f"Command logged: {command.command}"}

@api_router.get("/admin/commands")
async def get_command_history(current_user: User = Depends(get_admin_user)):
    """Get command history"""
    commands = await db.commands.find().sort("executed_at", -1).limit(50).to_list(50)
    return commands

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)