import os
import requests
import time

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")
# Accept a comma-separated list of URLs from GitHub Actions
TARGET_URLS_STR = os.environ.get("TARGET_URL", "https://example.com")
REGION = os.environ.get("RUNNER_REGION", "Unknown")

def log_to_supabase(url, status_code, latency, remarks):
    api_url = f"{SUPABASE_URL}/rest/v1/site_checks"
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
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
        requests.post(api_url, headers=headers, json=data, timeout=5)
    except Exception as e:
        print(f"Failed to log data to Supabase: {e}")

def check_all_sites():
    # Split the comma-separated list into clean URL strings
    urls = [u.strip() for u in TARGET_URLS_STR.split(",") if u.strip()]
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StatusChecker/1.0'}
    
    for url in urls:
        start_time = time.time()
        try:
            response = requests.get(url, headers=headers, timeout=8)
            latency = round((time.time() - start_time) * 1000)
            status = response.status_code
            
            remarks = "Accessible"
            if "access denied" in response.text.lower() or "geo-blocked" in response.text.lower():
                remarks = "Possible Geo-Block Text Detected"
            elif status == 403 or status == 451:
                remarks = "Restricted / Forbidden"
                
            log_to_supabase(url, status, latency, remarks)
            print(f"[{REGION}] URL: {url} | Status: {status} | Latency: {latency}ms | {remarks}")

        except requests.exceptions.Timeout:
            log_to_supabase(url, 0, 0, "Timeout (Potential Geo-block or Down)")
            print(f"[{REGION}] URL: {url} | Result: Timeout")
        except Exception as e:
            log_to_supabase(url, 0, 0, f"Failed: {str(e)}")
            print(f"[{REGION}] URL: {url} | Error: {str(e)}")

if __name__ == "__main__":
    check_all_sites()
