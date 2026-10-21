/* MOYEN HILLS — customer accounts (Supabase)
 * ---------------------------------------------------------------------------
 * Paste your Supabase project's URL and "anon public" key here
 * (Supabase dashboard → Project Settings → API). Both are safe to publish:
 * the database rules in supabase/schema.sql decide what each customer can see.
 * While these are empty, the site works as before and the account page says
 * accounts are coming soon.
 */
window.MH_CONFIG = {
  supabaseUrl: 'https://kvykvcjwqjzaepdiwydd.supabase.co',
  supabaseAnonKey: 'sb_publishable_3r7gOR4-BLAnIlMnbQ-mvg_wy07p1tp',
  // Sign-in buttons to show. Turn Google/Apple on once they are set up in
  // Supabase → Authentication → Sign In / Providers (see the README).
  providers: { google: false, apple: false, email: true },
};
