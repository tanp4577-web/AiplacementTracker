const SUPABASE_URL = 'PASTE_YOUR_PROJECT_URL_HERE';
const SUPABASE_ANON_KEY = 'PASTE_YOUR_ANON_KEY_HERE';
let supabaseClient;
try {
	supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (error) {
	console.warn('Supabase is not configured yet:', error.message || error);
	const emptyQuery = () => ({
		select: () => emptyQuery(),
		eq: () => emptyQuery(),
		order: () => emptyQuery(),
		delete: () => emptyQuery(),
		update: () => emptyQuery(),
		single: async () => ({ data: null, error: new Error('Supabase is not configured yet.') }),
		insert: async () => ({ data: null, error: null }),
		upsert: async () => ({ data: null, error: null })
	});
	supabaseClient = {
		auth: {
			getSession: async () => ({ data: { session: null }, error: null }),
			getUser: async () => ({ data: { user: null }, error: null }),
			signUp: async () => ({ data: { user: null }, error: new Error('Supabase is not configured yet.') }),
			signInWithPassword: async () => ({ data: { user: null }, error: new Error('Supabase is not configured yet.') }),
			signOut: async () => ({ error: null })
		},
		from: emptyQuery
	};
}
