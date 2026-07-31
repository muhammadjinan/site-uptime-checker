// utils.js

// 1. Initialize your Database here (e.g., Supabase client)
const SUPABASE_URL = "https://oqemerijdbximspphlgz.supabase.co"; 
const SUPABASE_KEY = "sb_publishable_iAMHiklN8FM6gisu_EHGRA_XqbkYTSa"; 
const dbQueryUrl = SUPABASE_URL + "/rest/v1/site_checks?order=checked_at.desc&limit=15";

// 2. Shared URL Normalizer
function normalizeUrl(url) {
    if (!url) return '';
    let cleanUrl = url.trim().toLowerCase();
    
    // Default to https:// if no scheme is provided
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = 'https://' + cleanUrl;
    }
    
    // Strip trailing slash for reliable database queries
    if (cleanUrl.endsWith('/')) {
        cleanUrl = cleanUrl.slice(0, -1);
    }
    return cleanUrl;
}
