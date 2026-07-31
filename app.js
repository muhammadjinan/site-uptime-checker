const SUPABASE_URL = "https://oqemerijdbximspphlgz.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_iAMHiklN8FM6gisu_EHGRA_XqbkYTSa"; 

// Global cache for modal inspection
let currentFetchedRows = [];

// Dictionary of Common Country-Code Top-Level Domains (ccTLDs)
const CCTLD_MAP = {
    "ar": "Argentina", "br": "Brazil", "ca": "Canada", "cl": "Chile", "co": "Colombia",
    "mx": "Mexico", "pe": "Peru", "uk": "United Kingdom", "de": "Germany", "fr": "France",
    "es": "Spain", "it": "Italy", "nl": "Netherlands", "au": "Australia", "in": "India",
    "jp": "Japan", "cn": "China", "ru": "Russia", "kr": "South Korea", "sg": "Singapore",
    "za": "South Africa", "ua": "Ukraine", "nz": "New Zealand", "se": "Sweden", "ch": "Switzerland",
    "pl": "Poland", "at": "Austria", "be": "Belgium", "dk": "Denmark", "fi": "Finland",
    "no": "Norway", "pt": "Portugal", "tr": "Turkey", "sa": "Saudi Arabia", "ae": "UAE",
    "eg": "Egypt", "id": "Indonesia", "my": "Malaysia", "ph": "Philippines", "th": "Thailand",
    "vn": "Vietnam", "tw": "Taiwan", "hk": "Hong Kong", "pk": "Pakistan", "ng": "Nigeria"
};

function normalizeUrl(input) {
  if (!input) return "";

  // Trim whitespace and force lowercase (fixes "GitHub.com" vs "github.com")
  let url = input.trim().toLowerCase();

  // If user explicitly typed http:// or https://, keep it!
  // Otherwise, default to https://
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }

  // Remove trailing slashes for clean DB matching
  return url.replace(/\/$/, "");
}

// Convert HTTP status code into technical label
function formatHttpStatus(code) {
    if (code === 200) return "200 OK";
    if (code === 301) return "301 Moved Permanently";
    if (code === 302) return "302 Found (Redirect)";
    if (code === 400) return "400 Bad Request";
    if (code === 401) return "401 Unauthorized";
    if (code === 403) return "403 Forbidden";
    if (code === 404) return "404 Not Found";
    if (code === 451) return "451 Unavailable For Legal Reasons";
    if (code === 500) return "500 Internal Server Error";
    if (code === 502) return "502 Bad Gateway";
    if (code === 503) return "503 Service Unavailable";
    if (code === 504) return "504 Gateway Timeout";
    if (code === 0 || !code) return "000 TIMEOUT / Network Drop";
    return code + " HTTP Response";
}

// Inspect ccTLD and return Geo-Restriction info if applicable
function evaluateGeoRestriction(urlStr, statusCode, remarks) {
    try {
        const hostname = urlStr.replace(/^https?:\/\//i, '').split('/')[0].toLowerCase();
        const parts = hostname.split('.');
        const tld = parts[parts.length - 1];
        
        const country = CCTLD_MAP[tld];
        
        // If it's a ccTLD and the check failed (Timeout, 5xx, 403, 451, or remarks indicated blocking)
        const isFailure = statusCode !== 200;
        
        if (country && isFailure) {
            return {
                isGeoRestricted: true,
                tld: "." + tld,
                country: country,
                message: `⚠️ Likely Geo-Restricted (ccTLD: .${tld} — ${country})`
            };
        }
    } catch (e) {
        console.error("URL Parsing error: ", e);
    }
    return { isGeoRestricted: false };
}

// Fetch 9 latest tests
async function fetchLatestTests() {
    const display = document.getElementById("status-display");
    const headline = document.getElementById("checking-headline");
    const grid = document.getElementById("nodes-grid");
    
    display.style.display = "block";
    headline.innerText = "Latest 9 Site Evaluations";
    grid.innerHTML = "";

    const dbQueryUrl = SUPABASE_URL + "/rest/v1/site_checks?order=checked_at.desc&limit=15";

    try {
        const response = await fetch(dbQueryUrl, {
            headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
        });
        currentFetchedRows = await response.json();

        if (!currentFetchedRows || currentFetchedRows.length === 0) {
            headline.innerText = "🔍 No historical data found in database.";
            return;
        }

        renderCards(currentFetchedRows);

    } catch (err) {
        console.error("Database lookup error: ", err);
        headline.innerText = "🚨 Error communicating with backend database.";
    }
}

// Search tested URL
async function searchTestedUrl() {
    let rawInput = document.getElementById("url-input").value;
    let urlInput = normalizeUrl(rawInput); // Use our new cleaner

    const btn = document.getElementById("check-btn");
    const headline = document.getElementById("checking-headline");

    if (!urlInput || urlInput === "https://") {
        fetchLatestTests();
        return;
    }

    btn.disabled = true;
    btn.innerText = "Searching...";
    headline.innerText = "Querying repository records for: " + urlInput;

    const dbQueryUrl = SUPABASE_URL + "/rest/v1/site_checks?url=ilike.*" + encodeURIComponent(urlInput) + "*&order=checked_at.desc&limit=15";

    try {
        const response = await fetch(dbQueryUrl, {
            headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
        });
        currentFetchedRows = await response.json();

        if (!currentFetchedRows || currentFetchedRows.length === 0) {
            headline.innerText = "🔍 No historical records found for: " + urlInput;
            btn.disabled = false;
            btn.innerText = "Search Database";
            return;
        }

        headline.innerHTML = `🎯 Showing telemetry results for <strong>${urlInput}</strong>`;
        renderCards(currentFetchedRows);

    } catch (err) {
        console.error("Search error: ", err);
        headline.innerText = "🚨 Error communicating with database.";
    }

    btn.disabled = false;
    btn.innerText = "Search Database";
}

// Render cards into grid
function renderCards(rows) {
    const grid = document.getElementById("nodes-grid");
    grid.innerHTML = "";

    rows.forEach((row, index) => {
        const isUp = row.status_code === 200;
        const nameLabel = row.url.replace(/^https?:\/\//, '');
        const httpStatusText = formatHttpStatus(row.status_code);
        const geoInfo = evaluateGeoRestriction(row.url, row.status_code, row.remarks);
        
        let cardClass = isUp ? "card-success" : "card-danger";
        if (geoInfo.isGeoRestricted) cardClass = "card-warning";

        const dotClass = isUp ? "dot-up" : "dot-down";
        const textColorClass = isUp ? "text-up" : (geoInfo.isGeoRestricted ? "text-warn" : "text-down");
        const latencyDisplay = isUp ? row.latency_ms + " ms" : "--";
        const scanTime = new Date(row.checked_at).toLocaleTimeString();

        const geoBadgeHtml = geoInfo.isGeoRestricted 
            ? `<div class="geo-badge">${geoInfo.message}</div>` 
            : '';

        grid.innerHTML += `
            <div class="card ${cardClass}" onclick="openModal(${index})">
                <div>
                    <div class="card-header">
                        <span class="card-title">${nameLabel}</span>
                        <span class="dot ${dotClass}"></span>
                    </div>
                    <div class="metric">
                        <span class="label">Region:</span>
                        <span class="value">${row.region.replace(/_/g, ' ')}</span>
                    </div>
                    <div class="metric">
                        <span class="label">HTTP Status:</span>
                        <span class="value ${textColorClass}">${httpStatusText}</span>
                    </div>
                    <div class="metric">
                        <span class="label">Latency:</span>
                        <span class="value">${latencyDisplay}</span>
                    </div>
                    <div class="metric">
                        <span class="label">Timestamp:</span>
                        <span class="value" style="font-size:11px; font-weight:normal;">${scanTime}</span>
                    </div>
                    ${geoBadgeHtml}
                </div>
                <button class="inspect-btn">Inspect Telemetry &rarr;</button>
            </div>
        `;
    });
}

// Modal Pop-up Handlers
function openModal(index) {
    const row = currentFetchedRows[index];
    if (!row) return;

    const modal = document.getElementById("detail-modal");
    const content = document.getElementById("modal-content");
    const geoInfo = evaluateGeoRestriction(row.url, row.status_code, row.remarks);
    
    const scanTime = new Date(row.checked_at).toLocaleString();

    content.innerHTML = `
        <div class="modal-row"><span class="key">Target URL:</span><span class="val" style="color:#60a5fa; word-break:break-all;">${row.url}</span></div>
        <div class="modal-row"><span class="key">HTTP Status:</span><span class="val">${formatHttpStatus(row.status_code)}</span></div>
        <div class="modal-row"><span class="key">Response Time:</span><span class="val">${row.latency_ms ? row.latency_ms + ' ms' : 'N/A'}</span></div>
        <div class="modal-row"><span class="key">Runner Region:</span><span class="val">${row.region}</span></div>
        <div class="modal-row"><span class="key">Scan Timestamp:</span><span class="val">${scanTime}</span></div>
        <div class="modal-row"><span class="key">Backend Remarks:</span><span class="val">${row.remarks || 'None'}</span></div>
        ${geoInfo.isGeoRestricted ? `
            <div class="geo-badge" style="margin-top:16px; font-size:12px; padding:10px;">
                <strong>Geo-Restriction Assessment:</strong><br>
                Target uses country top-level domain <code>${geoInfo.tld}</code> (${geoInfo.country}). Non-200 HTTP response from runner region <code>${row.region}</code> indicates access restriction or localized firewall dropping foreign requests.
            </div>
        ` : ''}
    `;

    modal.style.display = "flex";
}

function closeModal() {
    document.getElementById("detail-modal").style.display = "none";
}

function closeModalOnBackdrop(e) {
    if (e.target.id === "detail-modal") {
        closeModal();
    }
}

window.onload = fetchLatestTests;

// Grab the UI elements
const testBtn = document.getElementById('live-test-btn');
const urlInput = document.getElementById('live-url-input');
const pollingStatus = document.getElementById('polling-status');
const statusText = document.getElementById('status-text');

// Polling configuration
let pollInterval;
const MAX_POLL_ATTEMPTS = 25; // Stop checking after ~75 seconds to prevent endless loops

testBtn.addEventListener('click', async () => {
  let rawUrl = urlInput.value;
  const targetUrl = normalizeUrl(rawUrl); // Use our new cleaner
  
  if (!targetUrl || targetUrl === "https://") {
    alert("Please enter a valid URL.");
    return;
  }

  // 1. Lock UI
  testBtn.disabled = true;
  urlInput.disabled = true;
  pollingStatus.classList.remove('hidden');
  statusText.innerText = "Dispatching workflow to GitHub Actions...";

  const testStartTime = new Date().toISOString();

  try {
    // 2. Direct fetch call to your deployed Supabase Edge Function
    // NOTE: Make sure SUPABASE_KEY matches your existing key variable name in app.js
    const response = await fetch(
      'https://oqemerijdbximspphlgz.supabase.co/functions/v1/trigger-github-action',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY
        },
        body: JSON.stringify({ target_url: targetUrl })
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || 'Failed to trigger workflow');
    }

    statusText.innerText = "Test running on Azure infrastructure. Waiting for results...";
    
    // 3. Start Polling the Database
    startPolling(targetUrl, testStartTime);

  } catch (err) {
    console.error("Error triggering test:", err);
    statusText.innerText = `Error: ${err.message || 'Could not start test'}`;
    resetUI();
  }
});

function startPolling(targetUrl, testStartTime) {
  // 30-second buffer for server time differences
  const bufferedStartTime = new Date(new Date(testStartTime).getTime() - 30000).toISOString();
  let attempts = 0;
  const maxAttempts = 30; 
  const pollIntervalMs = 4000;
  
  // Clean the target URL to match how your DB stores it
  const cleanTarget = targetUrl.replace(/\/$/, "").toLowerCase();

  const intervalId = setInterval(async () => {
    attempts++;
    statusText.innerText = `Checking database for results (${attempts}/${maxAttempts})...`;

    try {
      // Fetch the top 10 most recent records to ensure we don't miss anything
      const pollUrl = SUPABASE_URL + "/rest/v1/site_checks?order=checked_at.desc&limit=10";
      
      const response = await fetch(pollUrl, {
          headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
      });

      if (!response.ok) return;

      const data = await response.json();

      // STRICT FILTER: Must match the URL AND be created after we clicked the test button
      const newResults = data.filter(row => {
          const recordTime = new Date(row.checked_at).getTime();
          const startTime = new Date(bufferedStartTime).getTime();
          
          return (recordTime >= startTime) && row.url.toLowerCase().includes(cleanTarget);
      });

      // 🎯 PATIENCE CHECK: Wait until exactly 3 (or more) regional checks have arrived
      if (newResults.length >= 3) {
        console.log("🎉 All 3 regional tests completed!", newResults);
        clearInterval(intervalId);
        statusText.innerText = "Global diagnostic complete!";
        
        // 1. Refresh the background grid so it's up-to-date
        await fetchLatestTests();

        // 2. Build a custom multi-result view for the Pop-up Modal
        let modalHtml = `<div style="margin-bottom: 16px;">
                            <span style="color:#94a3b8; font-size:12px;">Global Diagnostic Results for:</span><br>
                            <strong style="color:#60a5fa; font-size:16px; word-break:break-all;">${targetUrl}</strong>
                         </div>`;
        
        // Loop through all 3 results and create a mini-card for each inside the modal
        newResults.slice(0, 3).forEach(row => {
          const geoInfo = evaluateGeoRestriction(row.url, row.status_code, row.remarks);
          const statusColor = row.status_code === 200 ? '#4ade80' : '#ef4444';
          
          modalHtml += `
            <div style="border-left: 4px solid ${statusColor}; background: rgba(255,255,255,0.05); padding: 12px; margin-bottom: 12px; border-radius: 6px;">
              <div class="modal-row"><span class="key">Region:</span><span class="val" style="font-weight:bold;">${row.region.replace(/_/g, ' ')}</span></div>
              <div class="modal-row"><span class="key">Status:</span><span class="val">${formatHttpStatus(row.status_code)}</span></div>
              <div class="modal-row"><span class="key">Latency:</span><span class="val">${row.latency_ms ? row.latency_ms + ' ms' : 'N/A'}</span></div>
              ${geoInfo.isGeoRestricted ? `<div class="geo-badge" style="margin-top:8px; font-size:12px; padding:6px;">⚠️ ${geoInfo.message}</div>` : ''}
            </div>
          `;
        });

        // 3. Inject the HTML and open the modal
        document.getElementById("modal-content").innerHTML = modalHtml;
        document.getElementById("detail-modal").style.display = "flex";

        // 4. Reset the UI
        resetUI();
        return;
      }

      if (attempts >= maxAttempts) {
        clearInterval(intervalId);
        statusText.innerText = "Test took longer than expected. Please refresh the page.";
        resetUI();
      }
    } catch (err) {
      console.error("❌ [Polling Loop Error]:", err);
    }
  }, pollIntervalMs);
}
function resetUI() {
  testBtn.disabled = false;
  urlInput.disabled = false;
  
  // Hide the status text & spinner box after a brief 1.5s delay
  setTimeout(() => {
    pollingStatus.classList.add('hidden');
  }, 1500);
}
