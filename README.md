# MOYEN HILLS store

A one-product store for the MOYEN HILLS ART WILL TEE. Plain HTML, CSS and JavaScript, no build step.
Open `index.html` in a browser, or host the folder on GitHub Pages, Netlify or Vercel.

## Files

- `index.html`: landing page (photo, the shirt, about, lookbook link, "Join the Hills family" email sign-up)
- `lookbook.html`: the lookbook
- `product.html`: product page (photo gallery, sizes, add to cart, details)
- `account.html`: customer sign-in, saved details and past orders
- `terms.html`, `privacy.html`: terms of sale and privacy policy (fill in the yellow highlighted parts before launch)
- `fonts/`: the Inter Tight font, self-hosted
- `site.css`: the design
- `app.js`: cart, checkout, newsletter, gallery and the product settings
- `auth.js` + `config.js`: customer accounts (Supabase); `vendor/supabase.js` is the Supabase library
- `supabase/schema.sql`: the database tables for accounts and orders
- `images/`: logo and product photos

## Change the price, sizes or stock

Edit `PRODUCT` at the top of `app.js`:

```js
price: 35,
soldOut: false,                          // true = whole product sold out
stock: { S: 10, M: 10, L: 10, XL: 10 },  // 0 = that size is sold out
```

When the product is sold out (`soldOut: true`, or every size at 0), every product photo turns
black and white, "SOLD OUT, DONT BE LATE" appears under the name, and the buy button is disabled.

## Where orders go

The site has no server of its own. When a buyer presses **Place order**, `app.js` does two things at once:

1. **Email (always on).** The order is sent through [FormSubmit](https://formsubmit.co) to
   `SETTINGS.orderEmail` in `app.js` (now `markuss.suna.veid@gmail.com`). The email has the items,
   sizes, total and the buyer's name, email, phone, address and note. Reply to it to send the buyer
   payment details; the reply goes straight to the buyer.
2. **Stored record (once Supabase is set up).** The same order is saved in Supabase under
   **Table Editor → orders**, for guests and signed-in customers alike (guest orders have an empty
   `user_id`). Until `config.js` has the Supabase keys, this step is skipped.

The buyer only sees "Order received" if at least one of the two worked. If neither did, the cart is
kept and the buyer gets a link that opens their email app with the whole order written out,
addressed to `SETTINGS.contactEmail` (`moyenhills@gmail.com`).

Newsletter sign-ups are emailed the same way to `moyenhills@gmail.com`.

**One-time activation (do this before launch):** FormSubmit does not deliver anything to an address
until it is activated. Place one test order on the live site; FormSubmit then emails an
**Activate Form** link to the order address. Click it, then place a second test order and check it
arrives. Until then, buyers see "The order could not be sent" (the site checks FormSubmit's answer,
so an order is never shown as received when it was not). Do the same for the newsletter form.

After activating, FormSubmit gives you a random alias. Put it in `SETTINGS.orderEmail` in `app.js`
in place of the plain email address, so the address is not visible in the page source.

To send orders to a different inbox, change `SETTINGS.orderEmail` and activate the new address the
same way.

To send marketing emails to subscribers, copy the sign-ups into a newsletter tool (Mailchimp,
Brevo, MailerLite) and send from `moyenhills@gmail.com`.

## Customer accounts (Google, Apple, email)

Accounts use [Supabase](https://supabase.com) (free plan). Until `config.js` has your keys,
the account page says "coming soon" and everyone orders as a guest, exactly as before.

### 1. Create the project and tables
1. Sign up at supabase.com and create a project (region: Frankfurt or Stockholm is closest to Latvia).
2. **SQL Editor → New query**: paste everything from `supabase/schema.sql` and press **Run**.
3. **Project Settings → API**: copy the **Project URL** and the **anon public** key into `config.js`.
4. **Authentication → URL Configuration**:
   - **Site URL**: your live site, e.g. `https://moyenhills.com`
   - **Redirect URLs**: add `https://moyenhills.com/account.html` (and any preview address you use).

### 2. Email sign-up
On by default (**Authentication → Providers → Email**). Customers confirm their email with a link.
Supabase's built-in mailer only sends a few emails per hour; before launch, add your own sender
under **Authentication → Emails → SMTP Settings** (for example Gmail for moyenhills@gmail.com, or Brevo).

### 3. Google
1. [Google Cloud Console](https://console.cloud.google.com) → create a project → **APIs & Services → OAuth consent screen**
   (External, app name MOYEN HILLS, support email moyenhills@gmail.com) → publish it.
2. **Credentials → Create credentials → OAuth client ID → Web application**.
   Authorised redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
   (shown in Supabase under **Authentication → Providers → Google**).
3. Paste the **Client ID** and **Client secret** into Supabase → **Providers → Google** → enable.

### 4. Apple (needs the Apple Developer Program, $99/year)
1. [developer.apple.com](https://developer.apple.com/account) → **Certificates, Identifiers & Profiles**.
2. **Identifiers → +** → **App IDs**: create one (e.g. `com.moyenhills.app`) with **Sign in with Apple** ticked.
3. **Identifiers → +** → **Services IDs**: create one (e.g. `com.moyenhills.web`), tick **Sign in with Apple** → Configure:
   - Domains: `<your-project-ref>.supabase.co`
   - Return URL: `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. **Keys → +**: tick **Sign in with Apple**, download the `.p8` file, note the **Key ID** and your **Team ID**.
5. Supabase → **Providers → Apple** → enable; Client ID = the Services ID; use the secret generator there with your
   Team ID, Key ID and `.p8` file. Apple secrets expire after 6 months, so set a reminder to regenerate it.

To hide a sign-in button (for example Apple while it is being set up), set it to `false` under `providers` in `config.js`.

### What customers get
- Sign in with Google, Apple or email; forgotten-password emails.
- **Your details**: name, phone and address, filled in automatically at checkout.
- **Your orders**: every order placed while signed in, with its status.

### What you do
Orders still arrive by email as before. Every order (signed in or guest) is also stored in Supabase
under **Table Editor → orders**. If you set up Supabase before guest orders were stored, run
`supabase/schema.sql` again once so guest orders can be saved. Change an order's **status** to `paid`, `shipped` or `cancelled` there and the
customer sees it on their account page. Customers can only ever see their own details and orders.
