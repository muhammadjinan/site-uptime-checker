// Use your existing, safe Supabase connection directly
const SUPABASE_URL = "https://supabase.co"; 
const SUPABASE_KEY = "YOUR_PUBLIC_ANON_KEY_HERE"; 

let pollInterval = null;

async function triggerLiveCheck() {
    const urlInput = document.getElementById("url-input").value.trim();
    const btn = document.getElementById("check-btn");
    
    if (!urlInput || urlInput === "https://" || urlInput === "http://") {
        alert("Please enter a valid website address.");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Monitoring...";
    
    const display = document.getElementById("status-display");
    const headline = document.getElementById("checking-headline");
    const grid = document.getElementById("nodes-grid");
    
    display.style.display = "block";
    headline.innerText = "Please trigger the workflow in GitHub for: " + urlInput;
    
    const regions = ["US_EAST_OR_WEST", "US_CENTRAL_OR_EU", "GLOBAL_SECONDARY"];
    grid.innerHTML = "";
    regions.forEach(r => {
        grid.innerHTML += '<div class="card" id="node-' + r.replace(/_/g, '-') + '">' +
                            '<div class="card-header">' +
                                '<span class="card-title">' + r.replace(/_/g, ' ') + '</span>' +
                                '<span class="dot dot-running"></span>' +
                            '</div>' +
                            '<div class="metric"><span class="label">Status:</span><span class="value" style="color:#eab308;">Waiting for live rows...</span></div>' +
                            '<div class="metric"><span class="label">Latency:</span><span class="value">--</span></div>' +
                        '</div>';
    });

    // Capture the exact millisecond you clicked the button to ignore old tests
    const timestampCutoff = new Date().toISOString();
    startPollingSupabase(urlInput, timestampCutoff);
}

async function startPollingSupabase(urlInput, cutoffTime) {
    // Clean up trailing slash mismatches for safety
    const cleanUrl = urlInput.replace(/\/$/, "");
    
    // Query Supabase for checks on this URL created AFTER we pressed the button
    const dbUrl = SUPABASE_URL + "/rest/v1/site_checks?url=eq." + encodeURIComponent(cleanUrl) + "&checked_at=gt." + cutoffTime;
    let attempts = 0;

    pollInterval = setInterval(async () => {
        attempts++;
        if (attempts > 30) { // 2 minutes timeout
            clearInterval(pollInterval);
            document.getElementById("checking-headline").innerText = "Diagnostics timed out waiting for database entries.";
            document.getElementById("check-btn").disabled = false;
            document.getElementById("check-btn").innerText = "Run Diagnostics";
            return;
        }

        try {
            const res = await fetch(dbUrl, {
                headers: {
                    "apikey": SUPABASE_KEY,
                    "Authorization": "Bearer " + SUPABASE_KEY
                }
            });
            const rows = await res.json();
            
            if (rows && rows.length > 0) {
                document.getElementById("checking-headline").innerText = "🌐 Global edge data captured!";
                
                rows.forEach(row => {
                    const regionKey = row.region.replace(/ /g, '-');
                    const card = document.getElementById("node-" + regionKey);
                    
                    if (card) {
                        const dot = card.querySelector(".dot");
                        dot.className = "dot"; // Remove flash pulse
                        
                        const statusVal = card.querySelector(".metric:nth-of-type(1) .value");
                        const latencyVal = card.querySelector(".metric:nth-of-type(2) .value");
                        
                        if (row.status_code === 200) {
                            dot.classList.add("dot-up");
                            statusVal.innerText = "Accessible";
                            statusVal.className = "value text-up";
                        } else {
                            dot.classList.add("dot-down");
                            statusVal.innerText = "Blocked (" + row.status_code + ")";
                            statusVal.className = "value text-down";
                        }
                        
                        latencyVal.innerText = row.latency_ms + "ms";
                    }
                });

                // Check if all active unique elements have been completed to turn off tracking
                const completedChecks = document.querySelectorAll(".text-up, .text-down");
                if (completedChecks.length >= 3) {
                    clearInterval(pollInterval);
                    document.getElementById("checking-headline").innerText = "✅ Diagnostics Complete.";
                    document.getElementById("check-btn").disabled = false;
                    document.getElementById("check-btn").innerText = "Run Diagnostics";
                }
            }
        } catch (e) {
            console.error("Database tracking loop error:", e);
        }
    }, 4000);
}
