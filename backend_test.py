import requests
import sys
import json
import base64
from datetime import datetime
from io import BytesIO
from PIL import Image

class PlantDiseaseAPITester:
    def __init__(self, base_url="https://leafhealth-11.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.session_id = f"test_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    def run_test(self, name, method, endpoint, expected_status, data=None, timeout=30):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=timeout)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=timeout)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return success, response.json()
                except:
                    return success, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def create_test_image_base64(self):
        """Create a simple test plant leaf image in base64 format"""
        # Create a simple green leaf-like image with some texture
        img = Image.new('RGB', (300, 200), color='white')
        pixels = img.load()
        
        # Create a simple leaf pattern with green colors and some brown spots (disease simulation)
        for x in range(300):
            for y in range(200):
                # Create leaf shape (elliptical)
                center_x, center_y = 150, 100
                if ((x - center_x) / 120) ** 2 + ((y - center_y) / 80) ** 2 <= 1:
                    # Green leaf base
                    if (x + y) % 20 < 10:  # Add texture
                        pixels[x, y] = (34, 139, 34)  # Forest green
                    else:
                        pixels[x, y] = (50, 205, 50)  # Lime green
                    
                    # Add some brown spots (disease simulation)
                    if (x % 40 < 10 and y % 30 < 8):
                        pixels[x, y] = (139, 69, 19)  # Saddle brown
        
        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='JPEG')
        img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
        return img_base64

    def test_root_endpoint(self):
        """Test the root API endpoint"""
        success, response = self.run_test(
            "Root Endpoint",
            "GET",
            "",
            200
        )
        return success

    def test_predict_disease(self):
        """Test disease prediction endpoint"""
        test_image = self.create_test_image_base64()
        
        success, response = self.run_test(
            "Disease Prediction",
            "POST",
            "predict",
            200,
            data={"image_base64": test_image},
            timeout=60  # Longer timeout for AI processing
        )
        
        if success and isinstance(response, dict):
            required_fields = ['id', 'disease_name', 'confidence', 'description', 'treatments', 'prevention_tips']
            for field in required_fields:
                if field not in response:
                    print(f"❌ Missing required field: {field}")
                    return False
            
            print(f"   Disease: {response.get('disease_name')}")
            print(f"   Confidence: {response.get('confidence')}%")
            return True
        
        return success

    def test_get_predictions(self):
        """Test getting prediction history"""
        success, response = self.run_test(
            "Get Predictions History",
            "GET",
            "predictions",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} predictions in history")
            return True
        
        return success

    def test_chat_text_only(self):
        """Test chatbot with text-only message"""
        success, response = self.run_test(
            "Chat - Text Only",
            "POST",
            "chat",
            200,
            data={
                "session_id": self.session_id,
                "message": "What are common plant diseases in India?"
            },
            timeout=30
        )
        
        if success and isinstance(response, dict):
            if 'response' in response and response['response']:
                print(f"   AI Response: {response['response'][:100]}...")
                return True
        
        return success

    def test_chat_with_image(self):
        """Test chatbot with image upload"""
        test_image = self.create_test_image_base64()
        
        success, response = self.run_test(
            "Chat - With Image",
            "POST",
            "chat",
            200,
            data={
                "session_id": self.session_id,
                "message": "Can you analyze this plant leaf?",
                "image_base64": test_image
            },
            timeout=60
        )
        
        if success and isinstance(response, dict):
            if 'response' in response and response['response']:
                print(f"   AI Response: {response['response'][:100]}...")
                return True
        
        return success

    def test_chat_history(self):
        """Test getting chat history"""
        success, response = self.run_test(
            "Chat History",
            "GET",
            f"chat/history/{self.session_id}",
            200
        )
        
        if success and isinstance(response, list):
            print(f"   Found {len(response)} messages in chat history")
            return True
        
        return success

def main():
    print("🌱 Starting Plant Disease API Tests...")
    print("=" * 50)
    
    # Setup
    tester = PlantDiseaseAPITester()
    
    # Run all tests
    tests = [
        tester.test_root_endpoint,
        tester.test_predict_disease,
        tester.test_get_predictions,
        tester.test_chat_text_only,
        tester.test_chat_with_image,
        tester.test_chat_history
    ]
    
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
    
    # Print results
    print("\n" + "=" * 50)
    print(f"📊 Tests Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())