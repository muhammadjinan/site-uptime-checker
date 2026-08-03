// 1. Helper function to call your Edge Function for redirect tracing
async function fetchRedirectChain(targetUrl) {
    // Replace with your actual Supabase URL
    const supabaseUrl = 'https://oqemerijdbximspphlgz.supabase.co/functions/v1/trace-redirects';
    
    try {
        const response = await fetch(supabaseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: targetUrl })
        });

        if (!response.ok) return [];
        const data = await response.json();
        return data.chain || [];
    } catch (error) {
        console.error("Error tracing redirects:", error);
        return [];
    }
}

// 2. Updated Main Scan Function (Replace your existing scan trigger function)
async function scanDomain() {
    const inputElement = document.getElementById("domain-input");
    const targetUrl = inputElement.value.trim();
    if (!targetUrl) return;

    // Show loading state
    const resultsContainer = document.getElementById("results-container");
    const loadingIndicator = document.getElementById("loading-indicator");
    if (resultsContainer) resultsContainer.style.display = "none";
    if (loadingIndicator) loadingIndicator.style.display = "block";

    try {
        // Run vendor assessment API call and HTTP redirect trace concurrently in parallel
        const [vendorResults, redirectChain] = await Promise.all([
            fetchVendorAssessments(targetUrl), // Your existing function that calls VT & Cloudflare
            fetchRedirectChain(targetUrl)
        ]);

        if (loadingIndicator) loadingIndicator.style.display = "none";

        // Render the combined card
        renderReputationCards(vendorResults, targetUrl, redirectChain);
    } catch (err) {
        console.error("Scan error:", err);
        if (loadingIndicator) loadingIndicator.style.display = "none";
    }
}

// 3. Updated Card Renderer
function renderReputationCards(results, targetUrl, redirectChain = []) {
    const vendorGrid = document.getElementById("vendor-grid");
    const resultsContainer = document.getElementById("results-container");
    
    vendorGrid.innerHTML = "";
    resultsContainer.style.display = "block";

    const originalUrlClean = targetUrl.replace(/^https?:\/\//, '');
    
    const vtData = results.find(r => r.source === "VirusTotal Threat Intelligence");
    const cfData = results.find(r => r.source === "Cloudflare Radar");

    const isSafe = vtData ? vtData.isSafe : true;
    const cardClass = isSafe ? "card-success" : "card-danger";
    const dotClass = isSafe ? "dot-up" : "dot-down";

    // Determine final destination from redirect chain if available
    const hasRedirects = redirectChain.length > 1;
    const finalHop = hasRedirects ? redirectChain[redirectChain.length - 1] : null;
    const resolvedDomain = finalHop ? finalHop.url.replace(/^https?:\/\//, '') : ((vtData || cfData)?.resolvedDomain || originalUrlClean);

    // Dynamic Source Badges
    const vtBadge = `<span style="font-size: 0.65rem; background: #334155; padding: 2px 6px; border-radius: 4px; margin-left: 6px; color: #cbd5e1;">VirusTotal</span>`;
    const cfBadge = `<span style="font-size: 0.65rem; background: #334155; padding: 2px 6px; border-radius: 4px; margin-left: 6px; color: #cbd5e1;">Cloudflare</span>`;

    const categoryVal = cfData ? `${cfData.category} ${cfBadge}` : 'Unknown';
    const assessmentVal = vtData 
        ? `<span class="${vtData.isSafe ? 'text-up' : 'text-down'}" style="font-weight: bold;">${vtData.reputation}</span> ${vtBadge}` 
        : 'Unknown';

    // Store data globally for the View More modal
    window.currentReputationData = { 
        originalUrlClean, 
        resolvedDomain, 
        hasRedirects, 
        redirectChain, 
        vtData, 
        cfData 
    };

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
                    <span class="value" style="color: #60a5fa;">
                        ${resolvedDomain}
                        ${hasRedirects ? `<span style="font-size: 0.75rem; color: #f59e0b; margin-left: 6px;">(${redirectChain.length - 1} Redirect Hops)</span>` : ''}
                    </span>
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

// 4. Modal Handler displaying Threat Details + Redirect Chain Timeline
function openReputationModal() {
    const data = window.currentReputationData;
    if (!data) return;

    const modal = document.getElementById("detail-modal");
    const content = document.getElementById("modal-content");

    // VirusTotal Section
    let vtDetails = data.vtData ? `
        <div style="margin-bottom: 16px; border-left: 3px solid #3b82f6; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 0 4px 4px 0;">
            <h4 style="margin: 0 0 8px 0; color: #94a3b8; font-size: 12px; letter-spacing: 0.5px;">VIRUSTOTAL THREAT INTELLIGENCE</h4>
            <div class="modal-row"><span class="key">Reputation:</span><span class="val">${data.vtData.reputation}</span></div>
            <div class="modal-row"><span class="key">Safe to Browse:</span><span class="val ${data.vtData.isSafe ? 'text-up' : 'text-down'}">${data.vtData.isSafe ? 'Yes' : 'No'}</span></div>
        </div>
    ` : '';

    // Cloudflare Section
    let cfDetails = data.cfData ? `
        <div style="margin-bottom: 16px; border-left: 3px solid #f59e0b; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 0 4px 4px 0;">
            <h4 style="margin: 0 0 8px 0; color: #94a3b8; font-size: 12px; letter-spacing: 0.5px;">CLOUDFLARE RADAR</h4>
            <div class="modal-row"><span class="key">Category:</span><span class="val">${data.cfData.category}</span></div>
        </div>
    ` : '';

    // HTTP Redirect Chain Section
    let redirectDetails = '';
    if (data.redirectChain && data.redirectChain.length > 0) {
        let chainHtml = `<div style="margin-bottom: 16px; border-left: 3px solid #10b981; padding: 12px; background: rgba(255,255,255,0.03); border-radius: 0 4px 4px 0;">
            <h4 style="margin: 0 0 12px 0; color: #94a3b8; font-size: 12px; letter-spacing: 0.5px;">HTTP REDIRECT TRACE (${data.redirectChain.length} HOPS)</h4>
            <div style="display: flex; flex-direction: column; gap: 8px;">`;

        data.redirectChain.forEach((hop, idx) => {
            let statusColor = hop.status >= 200 && hop.status < 300 ? "#10b981" : (hop.status >= 300 && hop.status < 400 ? "#f59e0b" : "#ef4444");
            chainHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; background: rgba(0,0,0,0.2); padding: 6px 10px; border-radius: 4px;">
                    <span style="color: #e2e8f0; word-break: break-all; margin-right: 8px;">${idx + 1}. ${hop.url}</span>
                    <span style="color: ${statusColor}; font-weight: bold; font-family: monospace;">${hop.status}</span>
                </div>
            `;
        });

        chainHtml += `</div></div>`;
        redirectDetails = chainHtml;
    }

    content.innerHTML = `
        <div style="margin-bottom: 16px;">
            <span style="color:#94a3b8; font-size:12px;">Submitted Domain:</span><br>
            <strong style="color:#60a5fa; font-size:15px; word-break:break-all;">${data.originalUrlClean}</strong>
        </div>
        ${vtDetails}
        ${cfDetails}
        ${redirectDetails}
    `;
    
    modal.style.display = "flex";
}
