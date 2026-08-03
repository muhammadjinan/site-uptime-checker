// 1. Prove the file actually loaded
console.log("✅ reputation.js is loaded and running!");

const repBtn = document.getElementById('rep-test-btn');
const repInput = document.getElementById('rep-url-input');
const scanStatus = document.getElementById('scanning-status');
const statusText = document.getElementById('status-text');
const resultsContainer = document.getElementById('reputation-results');
const vendorGrid = document.getElementById('vendor-grid');

// Allow "Enter" key to trigger the scan
repInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        event.preventDefault(); // Prevents page reload if wrapped in a form tag
        repBtn.click(); // Programmatically click the button
    }
});

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

function openReputationModal() {
    const data = window.currentReputationData;
    if (!data) return;

    const modal = document.getElementById("detail-modal");
    const content = document.getElementById("modal-content");

    let vtDetails = data.vtData ? `
        <div style="margin-bottom: 16px; border-left: 3px solid #3b82f6; padding-left: 10px; background: rgba(255,255,255,0.05); border-radius: 0 4px 4px 0; padding: 12px;">
            <h4 style="margin: 0 0 8px 0; color: #94a3b8; font-size: 13px;">VIRUSTOTAL THREAT INTELLIGENCE</h4>
            <div class="modal-row"><span class="key">Reputation:</span><span class="val">${data.vtData.reputation}</span></div>
            <div class="modal-row"><span class="key">Safe to Browse:</span><span class="val ${data.vtData.isSafe ? 'text-up' : 'text-down'}">${data.vtData.isSafe ? 'Yes' : 'No'}</span></div>
        </div>
    ` : '';

    let cfDetails = data.cfData ? `
        <div style="margin-bottom: 16px; border-left: 3px solid #f59e0b; padding-left: 10px; background: rgba(255,255,255,0.05); border-radius: 0 4px 4px 0; padding: 12px;">
            <h4 style="margin: 0 0 8px 0; color: #94a3b8; font-size: 13px;">CLOUDFLARE RADAR</h4>
            <div class="modal-row"><span class="key">Category:</span><span class="val">${data.cfData.category}</span></div>
            ${data.cfData.isFallback ? `<div class="modal-row"><span class="key">Note:</span><span class="val" style="color: #f59e0b; font-size: 12px;">Category inherited from root domain (${data.cfData.fallbackDomain})</span></div>` : ''}
        </div>
    ` : '';

    content.innerHTML = `
        <div style="margin-bottom: 16px;">
            <span style="color:#94a3b8; font-size:12px;">Unified assessment for:</span><br>
            <strong style="color:#60a5fa; font-size:16px; word-break:break-all;">${data.resolvedDomain}</strong>
            ${data.wasRedirected ? `<div style="font-size: 12px; color: #9ca3af; margin-top: 4px;">(Redirected from ${data.originalUrlClean})</div>` : ''}
        </div>
        ${vtDetails}
        ${cfDetails}
    `;
    
    modal.style.display = "flex";
}

function renderReputationCards(results, targetUrl) {
    vendorGrid.innerHTML = "";
    resultsContainer.style.display = "block";

    const originalUrlClean = targetUrl.replace(/^https?:\/\//, '');
    
    const vtData = results.find(r => r.source === "VirusTotal Threat Intelligence");
    const cfData = results.find(r => r.source === "Cloudflare Radar");

    const isSafe = vtData ? vtData.isSafe : true;
    const cardClass = isSafe ? "card-success" : "card-danger";
    const dotClass = isSafe ? "dot-up" : "dot-down";

    const resolvedDomain = (vtData || cfData)?.resolvedDomain || originalUrlClean;
    const wasRedirected = (vtData || cfData)?.wasRedirected || false;

    const vtBadge = `<span style="font-size: 0.65rem; background: #334155; padding: 2px 6px; border-radius: 4px; margin-left: 6px; color: #cbd5e1;">VirusTotal</span>`;
    const cfBadge = `<span style="font-size: 0.65rem; background: #334155; padding: 2px 6px; border-radius: 4px; margin-left: 6px; color: #cbd5e1;">Cloudflare</span>`;

    const categoryVal = cfData ? `${cfData.category} ${cfBadge}` : 'Unknown';
    const assessmentVal = vtData 
        ? `<span class="${vtData.isSafe ? 'text-up' : 'text-down'}" style="font-weight: bold;">${vtData.reputation}</span> ${vtBadge}` 
        : 'Unknown';

    window.currentReputationData = { originalUrlClean, resolvedDomain, wasRedirected, vtData, cfData };

    vendorGrid.innerHTML = `
        <div class="card ${cardClass}" style="width: 100%; max-width: 800px;">
            <div>
                <div class="card-header">
                    <span class="card-title">Unified Security & Category Assessment</span>
                    <span class="dot ${dotClass}"></span>
                </div>
                <div class="metric">
                    <span class="label">Submitted:</span>
                    <span class="value">${originalUrlClean}</span>
                </div>
                <div class="metric">
                    <span class="label">Target:</span>
                    <span class="value" style="color: #60a5fa;">${resolvedDomain}${wasRedirected ? ' <span style="font-size: 0.75rem; color: #9ca3af;">(Redirected)</span>' : ''}</span>
                </div>
                <div class="metric">
                    <span class="label">Category:</span>
                    <span class="value">${categoryVal}</span>
                </div>
                <div class="metric">
                    <span class="label">Assessment:</span>
                    <span class="value">${assessmentVal}</span>
                </div>
            </div>
            <button class="inspect-btn" onclick="openReputationModal()" style="margin-top: 16px;">View More &rarr;</button>
        </div>
    `;
}

async function fetchRedirectChain(targetUrl) {
    const supabaseUrl = 'https://oqemerijdbximspphlgz.supabase.co/functions/v1/trace-redirects';
    
    try {
        const response = await fetch(supabaseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Uncomment and add if your edge function requires your anon key:
                // 'Authorization': 'Bearer YOUR_ANON_KEY'
            },
            body: JSON.stringify({ url: targetUrl })
        });

        if (!response.ok) throw new Error('Failed to fetch redirect chain');
        
        const data = await response.json();
        return data.chain;
    } catch (error) {
        console.error("Trace error:", error);
        return null;
    }
}
