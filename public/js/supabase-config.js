/**
 * supabase-config.js
 * Central configuration for Supabase client using CDN approach.
 */

const SUPABASE_URL = 'https://afgvugnicbbhligftkbd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_lWOxXpWSiZLPiVpaxqgSJw_RXISHttw';

// Initialize the Supabase client
// Note: 'supabase' is available globally via the CDN script
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export/Attach to window for global access
window.supabaseClient = _supabase;
