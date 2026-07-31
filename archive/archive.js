// Global cache for modal inspection
let currentFetchedRows = [];

// Fetch latest tests
async function fetchLatestTests() {
    const display = document.getElementById("status-display");
    const headline = document.getElementById("checking-headline");
    const grid = document.getElementById("nodes-grid");
    
    display.style.display = "block";
    headline.innerText = "Fetching latest 15 site evaluations...";
    grid.innerHTML = "";

    const dbQueryUrl = SUPABASE_URL + "/rest/v1/site_checks?order=checked_at.desc&limit=15";

    try {
        const response = await fetch(dbQueryUrl, {
            headers: { "apikey": SUPABASE_KEY, "Authorization": "Bearer " + SUPABASE_KEY }
        });
        currentFetchedRows = await response.json();

        if (!currentFetchedRows || currentFetchedRows.length === 0) {
            headline.innerText = "⚠️ No historical data found in database.";
            return;
        }

        renderCards(currentFetchedRows);

    } catch (err) {
        console.error("Database lookup error: ", err);
        headline.innerText = "❌ Error communicating with backend database.";
    }
}

// Search tested URL
async function searchTestedUrl() {
    let rawInput = document.getElementById("url-input").value;
    let urlInput = normalizeUrl(rawInput); 

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
            headline.innerText = "⚠️ No historical records found for: " + urlInput;
            btn.disabled = false;
            btn.innerText = "Search Database";
            return;
        }

            headline.innerHTML = `✅ Showing telemetry results for <strong>${urlInput}</strong>`;
        renderCards(currentFetchedRows);

    } catch (err) {
        console.error("Search error: ", err);
        headline.innerText = "❌ Error communicating with database.";
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

window.onload = fetchLatestTests;
