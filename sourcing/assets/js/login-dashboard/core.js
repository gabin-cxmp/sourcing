export const CONFIG = {
  SUPABASE_URL: 'https://ngylxcrcwqfrtefkrilt.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5neWx4Y3Jjd3FmcnRlZmtyaWx0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyMTYyOTIsImV4cCI6MjA3NDc5MjI5Mn0.zUj8ACrn1Uqo44at4F6memM_8mnTi7dMpQxkEJWlstc',
  REDIRECT_AFTER_LOGIN: 'sourcing/dashboard/index.html'
};

export const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

export const sessionState = {
  session: null,
  supplierId: null,
  setSession(s) { this.session = s; },
  setSupplierId(id) { this.supplierId = id; }
};

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function requireAuth({ redirectTo }) {
  const session = await getSession();
  if (!session) {
    window.location.replace(redirectTo);
    return null;
  }
  return session;
}

export async function signOut() {
  await supabase.auth.signOut();
  window.location.replace('https://wsn-events.com/sourcing/login/');
}








