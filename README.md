# MOYEN HILLS store

A store for MOYEN HILLS. Plain HTML, CSS and JavaScript, no build step.
Open `index.html` in a browser, or host the folder on GitHub Pages, Netlify or Vercel.

## Files

- `index.html`: landing page (the featured piece, about, lookbook link, "Join the Hills family" email sign-up)
- `shop.html`: every product in the shop
- `product.html`: one product (`product.html?id=art-will-tee`): photo gallery, sizes, add to cart, details
- `lookbook.html`: the lookbook
- `account.html`: customer sign-in, saved details and past orders
- `admin.html` + `admin.js` + `admin.css`: the admin page (products, prices, stock, photos, promo codes, orders)
- `terms.html`, `privacy.html`: terms of sale and privacy policy (fill in the yellow highlighted parts before launch)
- `withdraw.html` + `withdraw.js`: **Cancel an order**, the EU withdrawal button (linked in every footer)
- `boot.js`: tiny start-up script in each page's head (kept in a file so the security policy can block inline scripts)
- `catalog.js`: **everything you sell**: products, prices, sizes, stock, photos, promo codes, and where emails go
- `data.js`: loads the products and checks promo codes (from Supabase when connected, otherwise `catalog.js`)
- `app.js`: cart, checkout, newsletter and gallery. You shouldn't need to edit it to change what you sell.
- `auth.js` + `config.js`: customer accounts (Supabase); `vendor/supabase.js` is the Supabase library
- `supabase/schema.sql`: the database: accounts, orders, products, promo codes, admins
- `supabase/privacy.sql`: privacy and EU rules on top of it: delete/download my data, cancellations, 30-day price rule, retention. **Run it after `schema.sql`, every time.**
- `supabase/notify.sql`: order and cancellation emails, sent by the database through Brevo. Run it third (see "Where orders go").
- `supabase/payments.sql` + `supabase/functions/`: card payments with Stripe (delivery prices, payment page, webhook). **Run it after `notify.sql`, every time.** See [Card payments](#card-payments-stripe)
- `vercel.json` + `.vercelignore` (Vercel) or `netlify.toml` (Netlify): security headers, and files kept off the public site
- `fonts/`: the Inter Tight font, self-hosted
- `site.css`: the design
- `images/`: logo and product photos

## Add, change or remove products

Use the **admin page**: open `admin.html` (on the live site: `moyenhills.com/admin.html`).
Nothing on the site links to it, and search engines are told to skip it.

- **New product:** name, price, colour, sizes with how many pieces are left of each, photos, texts.
  The link name (`product.html?id=…`) is made from the name and can't be changed after saving.
- **Change a price:** open the product, change **Price**. For a sale, put the old price in
  **Old price** and it shows crossed out next to the new one.
- **Stock:** pieces left per size. 0 = that size is sold out. With the database connected, stock
  goes down by itself when someone orders and back up if you cancel the order.
- **Sold out:** tick **Sold out** (or set every size to 0). The photos turn black and white and
  "SOLD OUT, DONT BE LATE" shows under the name.
- **Remove:** untick **Show in the shop** to hide it but keep it, or **Delete product**.
- **Home page:** tick **Feature on the home page** on the product that should be the big one there.
- **Order in the shop:** lower **Position** numbers show first.

The admin page works in two ways:

1. **Preview mode** (now, before Supabase is connected). Changes are saved in that browser only,
   and the shop pages in the same browser show them straight away. When you're happy, press
   **Download catalog.js**, put it in the website folder in place of the old `catalog.js`
   (and any photos it downloads into `images/`), then publish the site. **Undo all changes**
   goes back to what `catalog.js` says.
2. **Live** (once Supabase is connected, see below). Changes are saved in the database and show on the
   site for everyone straight away, from any computer or phone. Photos are uploaded to Supabase.
   Only emails on the admins list can sign in.

You can also edit `catalog.js` by hand; it explains each field at the top.

## Promo codes

Customers type a code in the cart and see the discount and the new total straight away. The
code, discount and total are in the order email and the order record.

Make codes on the admin page under **Promo codes**: % off or € off, a minimum order, a last valid
day, a maximum number of uses (e.g. 1 for a one-off code for one client), and on/off.
**Who it's for** is a note only you see.

- **With the database connected**, codes are private, uses are counted, and the database checks
  the code and works out the prices again when the order is placed, so a customer can't change
  the price or the discount in their browser.
- **In preview mode / `catalog.js`**, codes are saved as a fingerprint, so they can't be read
  from the page source, but uses aren't counted. Connect the database for one-off codes.

## Make yourself an admin (once Supabase is connected)

1. Run `supabase/schema.sql` in **SQL Editor** (again, if you ran an older copy: it is safe to re-run),
   then `supabase/privacy.sql`, then `supabase/notify.sql`. Always run all three, in that order.
2. Create an account on the site's account page with your email, and confirm it.
3. In **SQL Editor**, run (with your email):
   ```sql
   insert into public.admins (email, role) values ('you@example.com', 'owner');
   ```
   (Admins added before roles existed became owners automatically.)
4. Open `admin.html`, sign in, and set up the two-step code: scan the QR code with Google
   Authenticator, Microsoft Authenticator or Authy, then type the 6-digit code. From then on you
   need your password **and** a code from the app each time.
5. Add other admins on the admin page under **Admins**.

## How the admin is protected

- **Two-step login is required.** The database only accepts admin changes from someone who signed
  in with their password *and* an authenticator code. A stolen password alone can't change anything.
- **Roles.** Owners can do everything, including adding/removing admins. Editors can add, change
  and delete products, and manage prices, stock, photos, promo codes, orders and cancellations.
  There is always at least one owner. Editors only see the other editors on the **Team** tab (not
  who the owners are, nor the owners' entries in the change log) and can't add, remove or change anyone.
- **Cancellations** sent on withdraw.html show under the **Cancellations** tab; tick "Sorted" once
  refunded. A cancelled order can't be reopened (its stock is already back).
- **Change log.** Every change on the admin page is recorded with who made it and when, under
  **Change log**. Nobody, owners included, can edit or delete entries.
- **The database does the checking.** Hiding `admin.html` isn't what protects it: every rule lives in
  `supabase/schema.sql`. Customers can only place orders and check a promo code they typed.
- **Orders can't be faked cheaply.** Prices come from the database, orders for products, sizes or
  amounts that aren't in stock are refused, and one visitor can place at most 5 orders per 10 minutes.
- **Promo codes can't be guessed.** At most 15 tries per 10 minutes per visitor. For one-off client
  codes, use something hard to guess, like `VIP-7KX2Q`.
- **Photos only.** Uploads are limited to JPEG, PNG or WebP under 8 MB.
- **Idle sign-out.** The admin page signs out after 30 minutes without use.
- **Security headers** (in `vercel.json`): HTTPS only, the site can't be put inside another site's
  frame, and the admin page only runs its own scripts.

In Supabase, also check:
- **Authentication → Sign In / Providers → Email:** "Confirm email" on.
- **Authentication → Policies (Password security):** minimum length 12, require letters and numbers.
  On a paid plan, turn on leaked password protection.
- **Authentication → Multi-Factor:** TOTP (authenticator app) enabled. It is on by default.
- Never put the `service_role` / secret key in the website or GitHub. Only the publishable key goes
  in `config.js`.

The first time you connect the database, the shop shows what's in the `products` table. The
schema already adds the ART WILL TEE there; if you changed `catalog.js` before, make the same
changes on the admin page.

## Privacy and EU rules

What the site does for you (details in `supabase/privacy.sql`, `terms.html`, `privacy.html`):

- **Cancel an order (EU withdrawal button).** Every footer links to `withdraw.html`. The customer fills
  in the form, checks it and presses **Confirm withdrawal**. You get an email, the customer gets an
  automatic confirmation email, and it is saved in the Supabase table `withdrawals` (tick `handled`
  once refunded). EU law requires this button since 19 June 2026.
- **Download my data / Delete my account** on the account page. Deleting removes the sign-in and
  saved details; orders stay as order records (needed for accounting) but are no longer linked.
  Admins must be removed as admins before they can delete their account.
- **Crossed-out prices follow the EU 30-day rule.** The database keeps a price history and refuses an
  "old price" higher than the lowest price of the 30 days before the reduction. (In `catalog.js`
  mode, check this yourself.)
- **No tracking, so no cookie banner.** The site only stores the cart, the intro flag and the
  sign-in in the browser. If you ever add analytics, pixels or embeds, you need a consent banner first.
- **Rate-limit fingerprints** are salted, one-way and forgotten after 24 hours.
- **Retention.** About once a year, delete records accounting law no longer needs, in SQL Editor:
  `select public.purge_old_records(5);` (use the number of years your accountant confirms).
- **Security headers** apply to every page: only the site's own scripts can run, and data can only be
  sent to Supabase and Brevo's sign-up form.

Requests by email (someone without an account asks for their data or for deletion): find their rows
in Table Editor (`orders`, `withdrawals`), send or delete them within one month, and keep order
records only as long as accounting law requires.

## Where orders go

The site has no server of its own. When a buyer presses **Send order request**, `app.js` saves the
order in Supabase (**Table Editor → orders**, or the admin page → Orders), for guests and signed-in
customers alike. The database then emails it, through Brevo (`supabase/notify.sql`):

- to the shop (`mail_shop`, now `ordersmoyenhills@gmail.com`): items, sizes, total and the buyer's
  name, email, phone, address and note. Reply to it to send the buyer payment details; the reply goes
  straight to the buyer.
- to the buyer: a copy of their order request, with the link to cancel.

Cancellations from `withdraw.html` work the same way: saved, then emailed to the shop with a dated
confirmation to the buyer.

The emails used to be sent from the browser through FormSubmit, but some Latvian internet providers
block formsubmit.co, so they silently never left. Sending from the database works on every network.

The buyer only sees "Order received" once the order is saved. If it can't be saved (or Supabase is
not set up yet), the cart is kept and the buyer gets a link that opens their email app with the whole
order written out, addressed to `contactEmail` in `catalog.js` (`moyenhills@gmail.com`).

**One-time email setup:**
1. In Brevo, check that the sender (`mail_from`, now `ordersmoyenhills@gmail.com`) is verified:
   Settings → Senders.
2. Brevo → your name (top right) → **SMTP & API** → **API keys** → Generate a new API key.
3. Supabase → SQL Editor, run with your key (then clear the editor; the key is stored encrypted in Vault):
   `select vault.create_secret('xkeysib-…', 'brevo_api_key');`
4. Run `supabase/notify.sql` (after `schema.sql` and `privacy.sql`). Place a test order.
If an email doesn't arrive, the order is still saved; Brevo → Transactional → Logs, or
`select * from net._http_response order by created desc limit 5;` in SQL Editor, shows why.

Newsletter sign-ups ("Join the Hills family") go to **Brevo**, to the form in `newsletterForm` in
`catalog.js`. Brevo emails each person a confirmation link (double opt-in) and only adds them to the
list once they click it. See and email subscribers in Brevo → Contacts.

Send newsletters from Brevo → Campaigns, to the list the form fills. Every Brevo email has an
unsubscribe link; don't import email addresses from elsewhere without their confirmation.

## Card payments (Stripe)

Off until you switch it on (`cardPayments` in `config.js`). While it is off, orders work as
described above and you send payment details by email.

With it on, the cart button says **Continue to payment**:

1. The order is saved in Supabase first. The database checks the prices, promo code and stock,
   takes the pieces out of stock and adds the delivery cost from **shipping_rates**.
2. The `create-checkout` Edge Function opens a Stripe payment page for exactly that order. The
   buyer sees the pieces, discount, delivery and full total, and presses **Pay**.
3. Stripe tells the `stripe-webhook` Edge Function, which marks the order **paid**. If the buyer
   leaves without paying, the page closes after 30 minutes, the order is cancelled and the pieces
   go back on sale. A buyer who comes back from the payment page gets a **Pay now** button.

On the admin page each card order says **Card: paid**, **not paid yet**, **never paid** or
**payment failed**. Only ship orders that say **Card: paid**. Refunds are made in Stripe
(Payments → the payment → Refund); cancelling the order on the admin page only puts the stock back.
Card orders are emailed (shop + buyer, through `notify.sql`) once they are paid, not when the
payment page opens, so an unpaid order never lands in the inbox.

The Stripe secret key lives only in Supabase. Never put it in `config.js`, this repository or a chat.

### Set it up (test mode first)
1. **Stripe:** create an account at stripe.com (country Latvia, currency EUR). Stay in **Test mode**.
2. **Supabase → SQL Editor:** run `supabase/payments.sql`. From now on the order is always
   `schema.sql`, then `privacy.sql`, then `notify.sql`, then `payments.sql`.
3. **Supabase → Table Editor → shipping_rates:** set your delivery prices. `country` is the country
   as buyers type it, in small letters (`latvia`, `lithuania`, …); `*` is everywhere else (delete it to
   only ship to the listed countries). `label` is shown on the payment page. They start at €0.
4. **Supabase → Edge Functions → Deploy a new function → Via Editor**, twice:
   - name `create-checkout`, paste `supabase/functions/create-checkout/index.ts`, **Deploy**;
   - name `stripe-webhook`, paste `supabase/functions/stripe-webhook/index.ts`, **Deploy**.
   Then open each function's **Details** and turn **Verify JWT** off (guests have no sign-in, and
   Stripe proves itself with a signature instead). With the Supabase CLI instead:
   `npx supabase functions deploy create-checkout --no-verify-jwt --project-ref kvykvcjwqjzaepdiwydd`
   (and the same for `stripe-webhook`).
5. **Stripe → Developers → Webhooks → Add endpoint:**
   URL `https://kvykvcjwqjzaepdiwydd.supabase.co/functions/v1/stripe-webhook`, events
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`. Copy its **Signing secret** (`whsec_…`).
6. **Supabase → Edge Functions → Secrets**, add:
   - `STRIPE_SECRET_KEY`: Stripe → Developers → API keys → Secret key (`sk_test_…`)
   - `STRIPE_WEBHOOK_SECRET`: the `whsec_…` from step 5
   - `SITE_URL`: the live site, e.g. `https://moyenhills.com`
   - `ALLOWED_ORIGINS` (optional): other addresses you test from, comma separated, e.g. `http://localhost:8000`
7. Set `cardPayments: true` in `config.js`, publish, and order with the test card
   `4242 4242 4242 4242` (any future date, any CVC). The order should turn **paid** on the admin page.
   Also try leaving the payment page: after about 30 minutes the order is cancelled and the stock is back.
8. **Stripe → Settings:** turn on **Customer emails → Successful payments** (the buyer's receipt);
   fill in the business details, the
   statement descriptor (`MOYEN HILLS`) and **Branding** (logo, black).
9. **Going live:** finish Stripe's account activation, switch off Test mode, add the same webhook again
   in live mode, and replace `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` with the live ones.
   Then switch the order and payment paragraphs in `terms.html` to the card versions (marked in yellow).

## Customer accounts (Google, Apple, email)

Accounts use [Supabase](https://supabase.com) (free plan). Until `config.js` has your keys,
the account page says "coming soon" and everyone orders as a guest, exactly as before.

### 1. Create the project and tables
1. Sign up at supabase.com and create a project (region: Frankfurt or Stockholm is closest to Latvia).
2. **SQL Editor → New query**: paste everything from `supabase/schema.sql` and press **Run**. Then do the
   same with `supabase/privacy.sql`, then `supabase/notify.sql`.
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
