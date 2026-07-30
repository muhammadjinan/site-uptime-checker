// Database connection layer settings mapping
const SUPABASE_URL = "https://oqemerijdbximspphlgz.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_iAMHiklN8FM6gisu_EHGRA_XqbkYTSa"; 

async function searchTestedUrl() {
    let urlInput = document.getElementById("url-input").value.trim();
    const btn = document.getElementById("check-btn");
    const display = document.getElementById("status-display");
    const headline = document.getElementById("checking-headline");
    const grid = document.getElementById("nodes-grid");
    
    if (!urlInput || urlInput === "https://" || urlInput === "http://") {
        alert("Please enter a valid URL or domain string to lookup.");
        return;
    }

    // Standardize URL formatting to match database records (strip trailing slash)
    urlInput = urlInput.replace(/\/$/, "");

    btn.disabled = true;
    btn.innerText = "Searching...";
    display.style.display = "block";
    headline.innerText = "Querying repository records for: " + urlInput;
    grid.innerHTML = "";

    // Build API query URL: match target URL, sort by newest entry first, limit to last 3 entries
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

        // Calculate and format the relative or absolute time of the last scan
        const lastCheckedTime = new Date(rows[0].checked_at);
        const formattedTime = lastCheckedTime.toLocaleString();

        headline.innerHTML = '🎯 Latest metrics found for <strong>' + urlInput + '</strong><br>' +
                             '<span style="font-size:12px; color:#64748b; font-weight:normal;">Last Evaluation Audit: ' + formattedTime + '</span>';

        // Loop through the captured rows to build regional card blocks dynamically
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
