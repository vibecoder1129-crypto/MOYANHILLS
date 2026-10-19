/* MOYEN HILLS — customer accounts (Supabase)
 * ---------------------------------------------------------------------------
 * Paste your Supabase project's URL and "anon public" key here
 * (Supabase dashboard → Project Settings → API). Both are safe to publish:
 * the database rules in supabase/schema.sql decide what each customer can see.
 * While these are empty, the site works as before and the account page says
 * accounts are coming soon.
 */
window.MH_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
  // Sign-in buttons to show on the account page.
  providers: { google: true, apple: true, email: true },
};
