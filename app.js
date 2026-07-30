// Database connection layer settings mapping
const SUPABASE_URL = "https://oqemerijdbximspphlgz.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_iAMHiklN8FM6gisu_EHGRA_XqbkYTSa"; 

// --- NEW FUNCTION: Fetch the last 5 tests on page load ---
async function fetchLatestTests() {
    const display = document.getElementById("status-display");
    const headline = document.getElementById("checking-headline");
    const grid = document.getElementById("nodes-grid");
    
    display.style.display = "block";
    headline.innerText = "Latest 9 Site Evaluations";
    grid.innerHTML = "";

    // Query Supabase: order by newest first, limit to 9
    const dbQueryUrl = SUPABASE_URL + "/rest/v1/site_checks?order=checked_at.desc&limit=9";

    try {
        const response = await fetch(dbQueryUrl, {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": "Bearer " + SUPABASE_KEY
            }
        });
        const rows = await response.json();

        if (!rows || rows.length === 0) {
            headline.innerText = "🔍 No historical data found in the database.";
            return;
        }

        // Render the recent 5 cards
        rows.forEach(row => {
            const isUp = row.status_code === 200;
            // Use the URL as the card title for the recent view
            const nameLabel = row.url.replace(/^https?:\/\//, ''); 
            const dotClass = isUp ? "dot-up" : "dot-down";
            const statusText = isUp ? "Accessible" : "Blocked (" + (row.status_code || "Timeout") + ")";
            const textColorClass = isUp ? "text-up" : "text-down";
            const latencyDisplay = isUp ? row.latency_ms + "ms" : "--";
            
            const scanTime = new Date(row.checked_at).toLocaleString();

            grid.innerHTML += '<div class="card">' +
                                '<div class="card-header">' +
                                    '<span class="card-title" style="text-transform:lowercase;">' + nameLabel + '</span>' +
                                    '<span class="dot ' + dotClass + '"></span>' +
                                '</div>' +
                                '<div class="metric"><span class="label">Region:</span><span class="value">' + row.region.replace(/_/g, ' ') + '</span></div>' +
                                '<div class="metric"><span class="label">Status:</span><span class="value ' + textColorClass + '">' + statusText + '</span></div>' +
                                '<div class="metric"><span class="label">Time:</span><span class="value" style="font-size:11px; font-weight:normal;">' + scanTime + '</span></div>' +
                            '</div>';
        });

    } catch (err) {
        console.error("Database connection lookup interruption: ", err);
        headline.innerText = "🚨 Error communicating with the tracking backend database.";
    }
}

// Trigger the initial fetch when the window loads
window.onload = fetchLatestTests;

// --- EXISTING SEARCH FUNCTION (Unchanged except for resetting state if empty) ---
async function searchTestedUrl() {
    let urlInput = document.getElementById("url-input").value.trim();
    const btn = document.getElementById("check-btn");
    const display = document.getElementById("status-display");
    const headline = document.getElementById("checking-headline");
    const grid = document.getElementById("nodes-grid");
    
    // If the search is empty, just reload the latest 5 tests
    if (!urlInput || urlInput === "https://" || urlInput === "http://") {
        fetchLatestTests();
        return;
    }

    urlInput = urlInput.replace(/\/$/, "");

    btn.disabled = true;
    btn.innerText = "Searching...";
    display.style.display = "block";
    headline.innerText = "Querying repository records for: " + urlInput;
    grid.innerHTML = "";

    const dbQueryUrl = SUPABASE_URL + "/rest/v1/site_checks?url=eq." + encodeURIComponent(urlInput) + "&order=checked_at.desc&limit=3";

    try {
        const response = await fetch(dbQueryUrl, {
            headers: {
                "apikey": SUPABASE_KEY,
                "Authorization": "Bearer " + SUPABASE_KEY
            }
        });
        const rows = await response.json();

        if (!rows || rows.length === 0) {
            headline.innerText = "🔍 No historical data found for: " + urlInput;
            btn.disabled = false;
            btn.innerText = "Search Database";
            return;
        }

        const lastCheckedTime = new Date(rows[0].checked_at);
        const formattedTime = lastCheckedTime.toLocaleString();

        headline.innerHTML = '🎯 Latest metrics found for <strong>' + urlInput + '</strong><br>' +
                             '<span style="font-size:12px; color:#64748b; font-weight:normal;">Last Evaluation Audit: ' + formattedTime + '</span>';

        rows.forEach(row => {
            const isUp = row.status_code === 200;
            const nameLabel = row.region.replace(/_/g, ' ');
            const dotClass = isUp ? "dot-up" : "dot-down";
            const statusText = isUp ? "Accessible" : "Blocked (" + (row.status_code || "Timeout") + ")";
            const textColorClass = isUp ? "text-up" : "text-down";
            const latencyDisplay = isUp ? row.latency_ms + "ms" : "--";

            grid.innerHTML += '<div class="card">' +
                                '<div class="card-header">' +
                                    '<span class="card-title">' + nameLabel + '</span>' +
                                    '<span class="dot ' + dotClass + '"></span>' +
                                '</div>' +
                                '<div class="metric"><span class="label">Status:</span><span class="value ' + textColorClass + '">' + statusText + '</span></div>' +
                                '<div class="metric"><span class="label">Latency:</span><span class="value">' + latencyDisplay + '</span></div>' +
                                '<div class="metric"><span class="label">Metadata:</span><span class="value" style="font-size:11px; font-weight:normal;">' + row.remarks + '</span></div>' +
                            '</div>';
        });

    } catch (err) {
        console.error("Database connection lookup interruption: ", err);
        headline.innerText = "🚨 Error communicating with the tracking backend database.";
    }

    btn.disabled = false;
    btn.innerText = "Search Database";
}
