import os
import requests
import time

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
TARGET_URLS_STR = os.environ.get("TARGET_URL", "https://example.com")
REGION = os.environ.get("RUNNER_REGION", "Unknown")

def log_to_supabase(url, status_code, latency, remarks):
    api_url = f"{SUPABASE_URL}/rest/v1/site_checks"
    
    # We pass the publishable key into both apiKey and authorization headers to bypass the legacy JWT constraint
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=minimal"
    }
    data = {
        "url": url,
        "region": REGION,
        "status_code": status_code,
        "latency_ms": latency,
        "remarks": remarks
    }
    try:
        r = requests.post(api_url, headers=headers, json=data, timeout=5)
        print(f"Logged to Supabase for {url}. Server Response Code: {r.status_code}")
        
        # If Supabase rejects it, print out the explanation text in the console logs
        if r.status_code >= 400:
            print(f"🚨 Supabase rejected the insert request: {r.text}")
            
    except Exception as e:
        print(f"Failed to log data to Supabase for {url}: {e}")

def check_all_sites():
    urls = [u.strip() for u in TARGET_URLS_STR.split(",") if u.strip()]
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StatusChecker/1.0'}
    
    for url in urls:
        start_time = time.time()
        try:
            print(f"[{REGION}] Attempting connection to: {url}")
            response = requests.get(url, headers=headers, timeout=10)
            latency = round((time.time() - start_time) * 1000)
            status = response.status_code
            
            remarks = "Accessible"
            
            # Safely check response text if it exists
            html_content = getattr(response, 'text', '') or ''
            if "access denied" in html_content.lower() or "geo-blocked" in html_content.lower():
                remarks = "Possible Geo-Block Text Detected"
            elif status == 403 or status == 451:
                remarks = "Restricted / Forbidden"
                
            log_to_supabase(url, status, latency, remarks)
            print(f"[{REGION}] SUCCESS -> URL: {url} | Status: {status} | Latency: {latency}ms | {remarks}")

        except requests.exceptions.Timeout:
            log_to_supabase(url, 0, 0, "Timeout (Potential Geo-block or Down)")
            print(f"[{REGION}] TIMEOUT -> URL: {url}")
        except Exception as e:
            log_to_supabase(url, 0, 0, f"Failed: {str(e)}")
            print(f"[{REGION}] FAILED -> URL: {url} | Error: {str(e)}")

if __name__ == "__main__":
    check_all_sites()
