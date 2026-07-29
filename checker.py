import os
import requests
import time

TARGET_URL = os.environ.get("TARGET_URL", "https://example.com")
REGION = os.environ.get("RUNNER_REGION", "Unknown")

def check_site():
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StatusChecker/1.0'}
    start_time = time.time()
    
    try:
        response = requests.get(TARGET_URL, headers=headers, timeout=10)
        latency = round((time.time() - start_time) * 1000)
        status = response.status_code
        
        remarks = "Accessible"
        if "access denied" in response.text.lower() or "geo-blocked" in response.text.lower():
            remarks = "Possible Geo-Block Text Detected"
        elif status == 403 or status == 451:
            remarks = "Restricted / Forbidden"
            
        print(f"RESULT|{REGION}|{status}|{latency}|{remarks}")

    except requests.exceptions.Timeout:
        print(f"RESULT|{REGION}|0|0|Timeout")
    except Exception as e:
        print(f"RESULT|{REGION}|0|0|Failed: {str(e)}")

if __name__ == "__main__":
    check_site()
