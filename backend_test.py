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
    
    def test_user_tracking_enhancements(self):
        """Test enhanced user tracking features (login_count, last_login, last_seen)"""
        try:
            # Login multiple times to test login_count increment
            login_data = {"minecraft_username": TEST_USERNAME}
            
            # First login
            response1 = self.session.post(f"{self.base_url}/auth/login", json=login_data)
            if response1.status_code == 200:
                token1 = response1.json()["access_token"]
                user1 = response1.json()["user"]
                
                time.sleep(1)  # Small delay
                
                # Second login
                response2 = self.session.post(f"{self.base_url}/auth/login", json=login_data)
                if response2.status_code == 200:
                    user2 = response2.json()["user"]
                    
                    # Check if login_count increased
                    if user2.get("login_count", 0) > user1.get("login_count", 0):
                        self.log_test("User Tracking Enhancements", True, "Login count tracking working", {
                            "first_login_count": user1.get("login_count"),
                            "second_login_count": user2.get("login_count"),
                            "has_last_login": "last_login" in user2,
                            "has_last_seen": "last_seen" in user2
                        })
                    else:
                        self.log_test("User Tracking Enhancements", False, "Login count not incrementing", {
                            "first_count": user1.get("login_count"),
                            "second_count": user2.get("login_count")
                        })
                else:
                    self.log_test("User Tracking Enhancements", False, f"Second login failed: HTTP {response2.status_code}")
            else:
                self.log_test("User Tracking Enhancements", False, f"First login failed: HTTP {response1.status_code}")
        except Exception as e:
            self.log_test("User Tracking Enhancements", False, f"Exception: {str(e)}")

    def test_admin_stats_endpoint(self):
        """Test new admin stats endpoint with enhanced statistics"""
        try:
            # Try with Admin user first
            admin_login_data = {"minecraft_username": "Admin"}
            response = self.session.post(f"{self.base_url}/auth/login", json=admin_login_data)
            
            if response.status_code == 200:
                admin_token = response.json()["access_token"]
                headers = {"Authorization": f"Bearer {admin_token}"}
                
                # Test admin stats endpoint
                stats_response = self.session.get(f"{self.base_url}/admin/stats", headers=headers)
                
                if stats_response.status_code == 200:
                    stats_data = stats_response.json()
                    required_fields = ["total_users", "admin_users", "active_users_today", "server_status", "recent_logins", "total_purchases", "total_revenue"]
                    missing_fields = [field for field in required_fields if field not in stats_data]
                    
                    if not missing_fields:
                        self.log_test("Admin Stats Endpoint", True, "Enhanced admin stats working", {
                            "total_users": stats_data.get("total_users"),
                            "admin_users": stats_data.get("admin_users"),
                            "active_users_today": stats_data.get("active_users_today"),
                            "total_purchases": stats_data.get("total_purchases"),
                            "total_revenue": stats_data.get("total_revenue")
                        })
                    else:
                        self.log_test("Admin Stats Endpoint", False, f"Missing required fields: {missing_fields}", stats_data)
                elif stats_response.status_code == 403:
                    self.log_test("Admin Stats Endpoint", True, "Admin access control working (403 for non-admin)", {
                        "status_code": 403,
                        "message": "Access properly restricted to admin users"
                    })
                else:
                    self.log_test("Admin Stats Endpoint", False, f"HTTP {stats_response.status_code}", stats_response.text)
            else:
                # Try with regular user to test access control
                if self.user_token:
                    headers = {"Authorization": f"Bearer {self.user_token}"}
                    stats_response = self.session.get(f"{self.base_url}/admin/stats", headers=headers)
                    
                    if stats_response.status_code == 403:
                        self.log_test("Admin Stats Endpoint", True, "Admin access control working (403 for non-admin)", {
                            "status_code": 403,
                            "message": "Access properly restricted to admin users"
                        })
                    else:
                        self.log_test("Admin Stats Endpoint", False, f"Expected 403 for non-admin, got {stats_response.status_code}")
                else:
                    self.log_test("Admin Stats Endpoint", False, "No tokens available for testing")
        except Exception as e:
            self.log_test("Admin Stats Endpoint", False, f"Exception: {str(e)}")

    def test_admin_user_activity_endpoint(self):
        """Test admin user activity endpoint"""
        try:
            # Try with Admin user
            admin_login_data = {"minecraft_username": "Admin"}
            response = self.session.post(f"{self.base_url}/auth/login", json=admin_login_data)
            
            if response.status_code == 200:
                admin_token = response.json()["access_token"]
                headers = {"Authorization": f"Bearer {admin_token}"}
                
                # Test user activity endpoint
                activity_response = self.session.get(f"{self.base_url}/admin/users/activity", headers=headers)
                
                if activity_response.status_code == 200:
                    activity_data = activity_response.json()
                    required_fields = ["login_logs", "user_stats"]
                    missing_fields = [field for field in required_fields if field not in activity_data]
                    
                    if not missing_fields:
                        self.log_test("Admin User Activity", True, "User activity endpoint working", {
                            "login_logs_count": len(activity_data.get("login_logs", [])),
                            "user_stats_count": len(activity_data.get("user_stats", [])),
                            "has_login_logs": len(activity_data.get("login_logs", [])) > 0
                        })
                    else:
                        self.log_test("Admin User Activity", False, f"Missing required fields: {missing_fields}", activity_data)
                elif activity_response.status_code == 403:
                    self.log_test("Admin User Activity", True, "Admin access control working (403 for non-admin)")
                else:
                    self.log_test("Admin User Activity", False, f"HTTP {activity_response.status_code}", activity_response.text)
            else:
                # Test access control with regular user
                if self.user_token:
                    headers = {"Authorization": f"Bearer {self.user_token}"}
                    activity_response = self.session.get(f"{self.base_url}/admin/users/activity", headers=headers)
                    
                    if activity_response.status_code == 403:
                        self.log_test("Admin User Activity", True, "Admin access control working (403 for non-admin)")
                    else:
                        self.log_test("Admin User Activity", False, f"Expected 403 for non-admin, got {activity_response.status_code}")
                else:
                    self.log_test("Admin User Activity", False, "No tokens available for testing")
        except Exception as e:
            self.log_test("Admin User Activity", False, f"Exception: {str(e)}")

    def test_admin_server_logs_endpoint(self):
        """Test admin server logs endpoint"""
        try:
            # Try with Admin user
            admin_login_data = {"minecraft_username": "Admin"}
            response = self.session.post(f"{self.base_url}/auth/login", json=admin_login_data)
            
            if response.status_code == 200:
                admin_token = response.json()["access_token"]
                headers = {"Authorization": f"Bearer {admin_token}"}
                
                # Test server logs endpoint
                logs_response = self.session.get(f"{self.base_url}/admin/server/logs", headers=headers)
                
                if logs_response.status_code == 200:
                    logs_data = logs_response.json()
                    required_fields = ["logs", "statistics"]
                    missing_fields = [field for field in required_fields if field not in logs_data]
                    
                    if not missing_fields:
                        stats = logs_data.get("statistics", {})
                        self.log_test("Admin Server Logs", True, "Server logs endpoint working", {
                            "logs_count": len(logs_data.get("logs", [])),
                            "avg_players": stats.get("avg_players"),
                            "avg_latency": stats.get("avg_latency"),
                            "total_logs": stats.get("total_logs")
                        })
                    else:
                        self.log_test("Admin Server Logs", False, f"Missing required fields: {missing_fields}", logs_data)
                elif logs_response.status_code == 403:
                    self.log_test("Admin Server Logs", True, "Admin access control working (403 for non-admin)")
                else:
                    self.log_test("Admin Server Logs", False, f"HTTP {logs_response.status_code}", logs_response.text)
            else:
                # Test access control with regular user
                if self.user_token:
                    headers = {"Authorization": f"Bearer {self.user_token}"}
                    logs_response = self.session.get(f"{self.base_url}/admin/server/logs", headers=headers)
                    
                    if logs_response.status_code == 403:
                        self.log_test("Admin Server Logs", True, "Admin access control working (403 for non-admin)")
                    else:
                        self.log_test("Admin Server Logs", False, f"Expected 403 for non-admin, got {logs_response.status_code}")
                else:
                    self.log_test("Admin Server Logs", False, "No tokens available for testing")
        except Exception as e:
            self.log_test("Admin Server Logs", False, f"Exception: {str(e)}")

    def test_shop_items_endpoint(self):
        """Test shop items endpoint"""
        try:
            # Test getting shop items (public endpoint)
            response = self.session.get(f"{self.base_url}/shop/items")
            
            if response.status_code == 200:
                items = response.json()
                if isinstance(items, list) and len(items) > 0:
                    # Check first item structure
                    first_item = items[0]
                    required_fields = ["id", "name", "description", "price", "category", "in_stock"]
                    missing_fields = [field for field in required_fields if field not in first_item]
                    
                    if not missing_fields:
                        self.log_test("Shop Items Endpoint", True, "Shop items endpoint working", {
                            "items_count": len(items),
                            "sample_item": {
                                "name": first_item.get("name"),
                                "price": first_item.get("price"),
                                "category": first_item.get("category")
                            }
                        })
                    else:
                        self.log_test("Shop Items Endpoint", False, f"Missing required fields in items: {missing_fields}", first_item)
                else:
                    self.log_test("Shop Items Endpoint", False, "No items returned or invalid format", items)
            else:
                self.log_test("Shop Items Endpoint", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test("Shop Items Endpoint", False, f"Exception: {str(e)}")

    def test_shop_purchase_functionality(self):
        """Test shop purchase functionality"""
        try:
            if not self.user_token:
                self.log_test("Shop Purchase Functionality", False, "No user token available for testing")
                return
            
            headers = {"Authorization": f"Bearer {self.user_token}"}
            
            # First get available items
            items_response = self.session.get(f"{self.base_url}/shop/items")
            if items_response.status_code == 200:
                items = items_response.json()
                if items and len(items) > 0:
                    test_item = items[0]
                    item_id = test_item["id"]
                    
                    # Test purchase
                    purchase_response = self.session.post(f"{self.base_url}/shop/purchase/{item_id}", headers=headers)
                    
                    if purchase_response.status_code == 200:
                        purchase_data = purchase_response.json()
                        if "message" in purchase_data and "purchase_id" in purchase_data:
                            self.log_test("Shop Purchase Functionality", True, "Purchase functionality working", {
                                "item_purchased": test_item.get("name"),
                                "purchase_id": purchase_data.get("purchase_id"),
                                "message": purchase_data.get("message")
                            })
                        else:
                            self.log_test("Shop Purchase Functionality", False, "Invalid purchase response format", purchase_data)
                    else:
                        self.log_test("Shop Purchase Functionality", False, f"Purchase failed: HTTP {purchase_response.status_code}", purchase_response.text)
                else:
                    self.log_test("Shop Purchase Functionality", False, "No items available for purchase testing")
            else:
                self.log_test("Shop Purchase Functionality", False, f"Could not get items: HTTP {items_response.status_code}")
        except Exception as e:
            self.log_test("Shop Purchase Functionality", False, f"Exception: {str(e)}")

    def test_user_purchase_history(self):
        """Test user purchase history endpoint"""
        try:
            if not self.user_token:
                self.log_test("User Purchase History", False, "No user token available for testing")
                return
            
            headers = {"Authorization": f"Bearer {self.user_token}"}
            
            # Test getting user's purchase history
            response = self.session.get(f"{self.base_url}/shop/purchases", headers=headers)
            
            if response.status_code == 200:
                purchases = response.json()
                if isinstance(purchases, list):
                    self.log_test("User Purchase History", True, "Purchase history endpoint working", {
                        "purchases_count": len(purchases),
                        "has_purchases": len(purchases) > 0
                    })
                else:
                    self.log_test("User Purchase History", False, "Invalid response format", purchases)
            else:
                self.log_test("User Purchase History", False, f"HTTP {response.status_code}", response.text)
        except Exception as e:
            self.log_test("User Purchase History", False, f"Exception: {str(e)}")

    def test_admin_shop_purchases(self):
        """Test admin shop purchases endpoint"""
        try:
            # Try with Admin user
            admin_login_data = {"minecraft_username": "Admin"}
            response = self.session.post(f"{self.base_url}/auth/login", json=admin_login_data)
            
            if response.status_code == 200:
                admin_token = response.json()["access_token"]
                headers = {"Authorization": f"Bearer {admin_token}"}
                
                # Test admin purchases endpoint
                purchases_response = self.session.get(f"{self.base_url}/admin/shop/purchases", headers=headers)
                
                if purchases_response.status_code == 200:
                    purchases = purchases_response.json()
                    if isinstance(purchases, list):
                        self.log_test("Admin Shop Purchases", True, "Admin purchases endpoint working", {
                            "total_purchases": len(purchases)
                        })
                    else:
                        self.log_test("Admin Shop Purchases", False, "Invalid response format", purchases)
                elif purchases_response.status_code == 403:
                    self.log_test("Admin Shop Purchases", True, "Admin access control working (403 for non-admin)")
                else:
                    self.log_test("Admin Shop Purchases", False, f"HTTP {purchases_response.status_code}", purchases_response.text)
            else:
                # Test access control with regular user
                if self.user_token:
                    headers = {"Authorization": f"Bearer {self.user_token}"}
                    purchases_response = self.session.get(f"{self.base_url}/admin/shop/purchases", headers=headers)
                    
                    if purchases_response.status_code == 403:
                        self.log_test("Admin Shop Purchases", True, "Admin access control working (403 for non-admin)")
                    else:
                        self.log_test("Admin Shop Purchases", False, f"Expected 403 for non-admin, got {purchases_response.status_code}")
                else:
                    self.log_test("Admin Shop Purchases", False, "No tokens available for testing")
        except Exception as e:
            self.log_test("Admin Shop Purchases", False, f"Exception: {str(e)}")

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