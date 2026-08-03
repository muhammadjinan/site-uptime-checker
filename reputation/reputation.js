// 1. Prove the file actually loaded
console.log("✅ reputation.js is loaded and running!");

const repBtn = document.getElementById('rep-test-btn');
const repInput = document.getElementById('rep-url-input');
const scanStatus = document.getElementById('scanning-status');
const statusText = document.getElementById('status-text');
const resultsContainer = document.getElementById('reputation-results');
const vendorGrid = document.getElementById('vendor-grid');

// 2. Prove the button was found in the HTML
if (!repBtn) {
    console.error("❌ ERROR: Could not find the 'Scan Domain' button in the HTML.");
} else {
    console.log("✅ Button found, attaching click listener...");
}

repBtn.addEventListener('click', async () => {
    // 3. Prove the click was registered
    console.log("🖱️ Button clicked! Starting scan...");
    
    let rawUrl = repInput.value;
    const targetUrl = normalizeUrl(rawUrl); 
    
    if (!targetUrl || targetUrl === "https://") {
        alert("Please enter a valid domain to scan.");
        return;
    }

    repBtn.disabled = true;
    repInput.disabled = true;
    scanStatus.classList.remove('hidden');
    resultsContainer.style.display = 'none';
    statusText.innerText = `Querying threat intelligence for ${targetUrl}...`;

    try {
        console.log("🌐 Sending request to Supabase Edge Function...");
        
        const response = await fetch(
            'https://oqemerijdbximspphlgz.supabase.co/functions/v1/check-reputation',
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

        console.log("📥 Received response from Supabase. Status:", response.status);

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to analyze domain');
        }

        const data = await response.json();
        console.log("📊 Data parsed successfully:", data);

        renderReputationCards(data.results, targetUrl);

    } catch (err) {
        console.error("❌ Error fetching reputation:", err);
        statusText.innerText = `Error: ${err.message}`;
    } finally {
        repBtn.disabled = false;
        repInput.disabled = false;
        setTimeout(() => scanStatus.classList.add('hidden'), 1000);
    }
});

function renderReputationCards(results, targetUrl) {
    vendorGrid.innerHTML = "";
    resultsContainer.style.display = "block";

    results.forEach(item => {
        const cardClass = item.isSafe ? "card-success" : "card-danger";
        const dotClass = item.isSafe ? "dot-up" : "dot-down";
        const textColor = item.isSafe ? "text-up" : "text-down";

        // Build fallback warning tag if applicable
        const fallbackBadge = item.isFallback 
            ? `<span style="font-size: 0.75rem; color: #f59e0b; font-weight: normal; margin-left: 6px;">(Fell back to ${item.fallbackDomain})</span>`
            : '';

        vendorGrid.innerHTML += `
            <div class="card ${cardClass}" style="cursor: default;">
                <div>
                    <div class="card-header">
                        <span class="card-title">${item.source}</span>
                        <span class="dot ${dotClass}"></span>
                    </div>
                    <div class="metric">
                        <span class="label">Target:</span>
                        <span class="value" style="color: #60a5fa;">${targetUrl.replace(/^https?:\/\//, '')}</span>
                    </div>
                    <div class="metric">
                        <span class="label">Category:</span>
                        <span class="value">${item.category}${fallbackBadge}</span>
                    </div>
                    <div class="metric">
                        <span class="label">Assessment:</span>
                        <span class="value ${textColor}" style="font-weight: bold;">${item.reputation}</span>
                    </div>
                </div>
            </div>
        `;
    });
}
