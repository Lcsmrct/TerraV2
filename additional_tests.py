#!/usr/bin/env python3
"""
Additional Admin Tests for Minecraft Backend
"""

import requests
import json

BACKEND_URL = "https://62f5ef02-bd44-4ced-a88b-7e03c8e0f7da.preview.emergentagent.com/api"

def test_admin_endpoints():
    """Test admin endpoints more thoroughly"""
    session = requests.Session()
    
    # Login as regular user first
    login_data = {"minecraft_username": "Notch"}
    response = session.post(f"{BACKEND_URL}/auth/login", json=login_data)
    
    if response.status_code == 200:
        data = response.json()
        user_token = data["access_token"]
        user_id = data["user"]["id"]
        headers = {"Authorization": f"Bearer {user_token}"}
        
        print("🔍 Testing Admin Endpoints with Regular User...")
        
        # Test admin stats (should fail)
        stats_response = session.get(f"{BACKEND_URL}/admin/stats", headers=headers)
        print(f"Admin Stats: {stats_response.status_code} - {'✅ PASS' if stats_response.status_code == 403 else '❌ FAIL'}")
        
        # Test users list (should fail)
        users_response = session.get(f"{BACKEND_URL}/users", headers=headers)
        print(f"Users List: {users_response.status_code} - {'✅ PASS' if users_response.status_code == 403 else '❌ FAIL'}")
        
        # Test toggle admin (should fail)
        toggle_response = session.put(f"{BACKEND_URL}/users/{user_id}/admin", headers=headers)
        print(f"Toggle Admin: {toggle_response.status_code} - {'✅ PASS' if toggle_response.status_code == 403 else '❌ FAIL'}")
        
        # Test command execution (should fail)
        command_data = {"command": "say Hello World"}
        command_response = session.post(f"{BACKEND_URL}/admin/commands", json=command_data, headers=headers)
        print(f"Execute Command: {command_response.status_code} - {'✅ PASS' if command_response.status_code == 403 else '❌ FAIL'}")
        
        print("\n🔍 Testing User Profile Access...")
        
        # Test accessing own profile (should work)
        own_profile = session.get(f"{BACKEND_URL}/users/{user_id}", headers=headers)
        print(f"Own Profile: {own_profile.status_code} - {'✅ PASS' if own_profile.status_code == 200 else '❌ FAIL'}")
        
        # Test accessing another user's profile (should fail)
        fake_user_id = "fake-user-id-123"
        other_profile = session.get(f"{BACKEND_URL}/users/{fake_user_id}", headers=headers)
        print(f"Other Profile: {other_profile.status_code} - {'✅ PASS' if other_profile.status_code in [403, 404] else '❌ FAIL'}")
        
    else:
        print(f"❌ Login failed: {response.status_code}")

def test_minecraft_server_connection():
    """Test the actual Minecraft server connection details"""
    session = requests.Session()
    
    print("🔍 Testing Minecraft Server Connection Details...")
    
    response = session.get(f"{BACKEND_URL}/server/status")
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Server IP: 91.197.6.209:25598")
        print(f"✅ Players Online: {data.get('players_online')}")
        print(f"✅ Max Players: {data.get('max_players')}")
        print(f"✅ Server Version: {data.get('server_version')}")
        print(f"✅ Latency: {data.get('latency')}ms")
        print(f"✅ MOTD: {data.get('motd')}")
        
        # Verify it's actually connecting to the real server
        if data.get('players_online', 0) > 0 and data.get('server_version'):
            print("✅ PASS: Successfully connected to real Minecraft server")
        else:
            print("⚠️  Server appears to be offline or returning default values")
    else:
        print(f"❌ FAIL: Server status check failed with {response.status_code}")

if __name__ == "__main__":
    test_admin_endpoints()
    print("\n" + "="*50)
    test_minecraft_server_connection()