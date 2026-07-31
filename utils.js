const SUPABASE_URL = "https://oqemerijdbximspphlgz.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_iAMHiklN8FM6gisu_EHGRA_XqbkYTSa"; 

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

function closeModal() {
    document.getElementById("detail-modal").style.display = "none";
}

function closeModalOnBackdrop(e) {
    if (e.target.id === "detail-modal") {
        closeModal();
    }
}
