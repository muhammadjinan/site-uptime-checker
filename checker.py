import os
import requests
import time

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
TARGET_URL = os.environ.get("TARGET_URL", "https://example.com")
REGION = os.environ.get("RUNNER_REGION", "Unknown")

def log_to_supabase(status_code, latency, remarks):
    # Only try to log if the database secrets are present in the runner environment
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("Supabase credentials not configured in environment parameters. Skipping DB write.")
        return

    api_url = f"{SUPABASE_URL}/rest/v1/site_checks"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    data = {
        "url": TARGET_URL,
        "region": REGION,
        "status_code": status_code,
        "latency_ms": latency,
        "remarks": remarks
    }
    try:
        r = requests.post(api_url, headers=headers, json=data, timeout=5)
        if r.status_code >= 400:
            print(f"Supabase write rejected ({r.status_code}): {r.text}")
    except Exception as e:
        print(f"Failed to push data package to Supabase: {e}")

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
            
        # 1. Fire off database logging layer
        log_to_supabase(status, latency, remarks)
        
        # 2. Output the live streaming print statement for the UI frontend
        print(f"RESULT|{REGION}|{status}|{latency}|{remarks}")

    except requests.exceptions.Timeout:
        log_to_supabase(0, 0, "Timeout (Potential Geo-block or Down)")
        print(f"RESULT|{REGION}|0|0|Timeout")
    except Exception as e:
        log_to_supabase(0, 0, f"Failed: {str(e)}")
        print(f"RESULT|{REGION}|0|0|Failed: {str(e)}")

if __name__ == "__main__":
    check_site()
