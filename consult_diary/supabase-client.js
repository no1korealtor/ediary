export const SUPABASE_URL = 'https://yqolkvmrfvumpwlxjimp.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_Y3waCN-Y0LA26BC80eUO-g_Njmuq1Hu';

export const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Auth state listener
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        window.location.href = 'index.html';
    }
});
