#!/usr/bin/env python3
"""
Comprehensive Backend Testing for Minecraft Server Website
Tests all backend endpoints and functionality
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BACKEND_URL = "https://62f5ef02-bd44-4ced-a88b-7e03c8e0f7da.preview.emergentagent.com/api"
TEST_USERNAME = "Notch"  # Using a real Minecraft username for testing
ADMIN_USERNAME = "jeb_"  # Another real Minecraft username for admin testing

class MinecraftBackendTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.user_token = None
        self.admin_token = None
        self.test_results = {}
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        self.test_results[test_name] = {
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details:
            print(f"   Details: {details}")
    
    def test_server_status(self):
        """Test Minecraft server status endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/server/status")
            if response.status_code == 200:
                data = response.json()
                required_fields = ["players_online", "max_players", "server_version", "motd", "latency"]
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.log_test("Server Status", False, f"Missing fields: {missing_fields}", data)
                else:
                    self.log_test("Server Status", True, f"Server status retrieved successfully", data)
            else:
                self.log_test("Server Status", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Server Status", False, f"Exception: {str(e)}")
    
    def test_server_players(self):
        """Test server players endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/server/players")
            if response.status_code == 200:
                data = response.json()
                if "players_online" in data and "max_players" in data:
                    self.log_test("Server Players", True, "Players count retrieved successfully", data)
                else:
                    self.log_test("Server Players", False, "Missing required fields", data)
            else:
                self.log_test("Server Players", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Server Players", False, f"Exception: {str(e)}")
    
    def test_mojang_api_integration(self):
        """Test Mojang API integration by attempting login"""
        try:
            # Test with a real Minecraft username
            login_data = {"minecraft_username": TEST_USERNAME}
            response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "user" in data:
                    user = data["user"]
                    if "uuid" in user and "skin_url" in user:
                        self.user_token = data["access_token"]
                        self.log_test("Mojang API Integration", True, "UUID and skin retrieved successfully", {
                            "username": user.get("minecraft_username"),
                            "uuid": user.get("uuid"),
                            "has_skin": user.get("skin_url") is not None
                        })
                    else:
                        self.log_test("Mojang API Integration", False, "Missing UUID or skin_url", user)
                else:
                    self.log_test("Mojang API Integration", False, "Missing token or user data", data)
            else:
                self.log_test("Mojang API Integration", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Mojang API Integration", False, f"Exception: {str(e)}")
    
    def test_user_authentication(self):
        """Test user authentication system"""
        try:
            # Test login
            login_data = {"minecraft_username": TEST_USERNAME}
            response = self.session.post(f"{self.base_url}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if "access_token" in data and "token_type" in data:
                    self.user_token = data["access_token"]
                    
                    # Test /auth/me endpoint
                    headers = {"Authorization": f"Bearer {self.user_token}"}
                    me_response = self.session.get(f"{self.base_url}/auth/me", headers=headers)
                    
                    if me_response.status_code == 200:
                        user_data = me_response.json()
                        self.log_test("User Authentication", True, "Login and token validation successful", {
                            "username": user_data.get("minecraft_username"),
                            "user_id": user_data.get("id"),
                            "is_admin": user_data.get("is_admin")
                        })
                    else:
                        self.log_test("User Authentication", False, f"Token validation failed: HTTP {me_response.status_code}", me_response.text)
                else:
                    self.log_test("User Authentication", False, "Missing token data", data)
            else:
                self.log_test("User Authentication", False, f"Login failed: HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test("User Authentication", False, f"Exception: {str(e)}")
    
    def test_database_operations(self):
        """Test database operations"""
        if not self.user_token:
            self.log_test("Database Operations", False, "No user token available for testing")
            return
        
        try:
            headers = {"Authorization": f"Bearer {self.user_token}"}
            
            # Test getting current user (should work)
            me_response = self.session.get(f"{self.base_url}/auth/me", headers=headers)
            if me_response.status_code == 200:
                user_data = me_response.json()
                user_id = user_data.get("id")
                
                # Test getting user by ID
                user_response = self.session.get(f"{self.base_url}/users/{user_id}", headers=headers)
                if user_response.status_code == 200:
                    self.log_test("Database Operations", True, "User data retrieval successful", {
                        "user_found": True,
                        "has_required_fields": all(field in user_response.json() for field in ["id", "minecraft_username", "uuid"])
                    })
                else:
                    self.log_test("Database Operations", False, f"User retrieval failed: HTTP {user_response.status_code}", user_response.text)
            else:
                self.log_test("Database Operations", False, f"Current user retrieval failed: HTTP {me_response.status_code}", me_response.text)
        except Exception as e:
            self.log_test("Database Operations", False, f"Exception: {str(e)}")
    
    def test_admin_system(self):
        """Test admin management system"""
        try:
            # First, try to login with a different username for admin testing
            admin_login_data = {"minecraft_username": ADMIN_USERNAME}
            response = self.session.post(f"{self.base_url}/auth/login", json=admin_login_data)
            
            if response.status_code == 200:
                data = response.json()
                admin_token = data["access_token"]
                headers = {"Authorization": f"Bearer {admin_token}"}
                
                # Test admin stats endpoint (this will fail if user is not admin, which is expected)
                stats_response = self.session.get(f"{self.base_url}/admin/stats", headers=headers)
                
                if stats_response.status_code == 200:
                    stats_data = stats_response.json()
                    self.log_test("Admin System", True, "Admin endpoints accessible", {
                        "total_users": stats_data.get("total_users"),
                        "admin_users": stats_data.get("admin_users"),
                        "has_server_status": "server_status" in stats_data
                    })
                elif stats_response.status_code == 403:
                    # This is expected for non-admin users
                    self.log_test("Admin System", True, "Admin access control working (403 for non-admin)", {
                        "status_code": 403,
                        "message": "Access properly restricted to admin users"
                    })
                else:
                    self.log_test("Admin System", False, f"Unexpected response: HTTP {stats_response.status_code}", stats_response.text)
            else:
                self.log_test("Admin System", False, f"Admin login failed: HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Admin System", False, f"Exception: {str(e)}")
    
    def test_error_handling(self):
        """Test error handling"""
        try:
            # Test invalid username
            invalid_login = {"minecraft_username": "InvalidUser123456789"}
            response = self.session.post(f"{self.base_url}/auth/login", json=invalid_login)
            
            if response.status_code == 400:
                self.log_test("Error Handling", True, "Invalid username properly rejected", {
                    "status_code": 400,
                    "response": response.json() if response.headers.get('content-type') == 'application/json' else response.text
                })
            else:
                self.log_test("Error Handling", False, f"Expected 400 for invalid username, got {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Error Handling", False, f"Exception: {str(e)}")
    
    def run_all_tests(self):
        """Run all tests"""
        print(f"🚀 Starting comprehensive backend testing...")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Test order matters - some tests depend on previous ones
        self.test_server_status()
        self.test_server_players()
        self.test_mojang_api_integration()
        self.test_user_authentication()
        self.test_database_operations()
        self.test_admin_system()
        self.test_error_handling()
        
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results.values() if result["success"])
        total = len(self.test_results)
        
        for test_name, result in self.test_results.items():
            status = "✅ PASS" if result["success"] else "❌ FAIL"
            print(f"{status} {test_name}")
            if not result["success"]:
                print(f"   Error: {result['message']}")
        
        print(f"\nResults: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed!")
        else:
            print(f"⚠️  {total - passed} tests failed")
        
        return self.test_results

if __name__ == "__main__":
    tester = MinecraftBackendTester()
    results = tester.run_all_tests()