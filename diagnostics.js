// Grab the UI elements
const testBtn = document.getElementById('live-test-btn');
const urlInput = document.getElementById('live-url-input');
const pollingStatus = document.getElementById('polling-status');
const statusText = document.getElementById('status-text');

// Allow "Enter" key to trigger the scan
urlInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevents page reload if wrapped in a form tag
        testBtn.click(); // Programmatically click the button
    }
});

// Polling configuration
let pollInterval;
const MAX_POLL_ATTEMPTS = 25; 

testBtn.addEventListener('click', async () => {
  let rawUrl = urlInput.value;
  const targetUrl = normalizeUrl(rawUrl); 
  
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
  const bufferedStartTime = new Date(new Date(testStartTime).getTime() - 30000).toISOString();
  let attempts = 0;
  const maxAttempts = 30; 
  const pollIntervalMs = 4000;
  
  const cleanTarget = targetUrl.replace(/\/$/, "").toLowerCase();

  const intervalId = setInterval(async () => {
    attempts++;
    statusText.innerText = `Checking database for results (${attempts}/${maxAttempts})...`;

    try {
      const pollUrl = SUPABASE_URL + "/rest/v1/site_checks?order=checked_at.desc&limit=10";
      
      const response = await fetch(pollUrl, {
          headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
      });

      if (!response.ok) return;

      const data = await response.json();

      const newResults = data.filter(row => {
          const recordTime = new Date(row.checked_at).getTime();
          const startTime = new Date(bufferedStartTime).getTime();
          
          return (recordTime >= startTime) && row.url.toLowerCase().includes(cleanTarget);
      });

      if (newResults.length >= 3) {
        console.log("🎉 All 3 regional tests completed!", newResults);
        clearInterval(intervalId);
        statusText.innerText = "Global diagnostic complete!";

        // Build a custom multi-result view for the Pop-up Modal
        let modalHtml = `<div style="margin-bottom: 16px;">
                            <span style="color:#94a3b8; font-size:12px;">Global Diagnostic Results for:</span><br>
                            <strong style="color:#60a5fa; font-size:16px; word-break:break-all;">${targetUrl}</strong>
                         </div>`;
        
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

        document.getElementById("modal-content").innerHTML = modalHtml;
        document.getElementById("detail-modal").style.display = "flex";

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
  
  setTimeout(() => {
    pollingStatus.classList.add('hidden');
  }, 1500);
}
