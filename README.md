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
- `catalog.js`: **everything you sell**: products, prices, sizes, stock, photos, promo codes, and where emails go
- `data.js`: loads the products and checks promo codes (from Supabase when connected, otherwise `catalog.js`)
- `app.js`: cart, checkout, newsletter and gallery. You shouldn't need to edit it to change what you sell.
- `auth.js` + `config.js`: customer accounts (Supabase); `vendor/supabase.js` is the Supabase library
- `supabase/schema.sql`: the database: accounts, orders, products, promo codes, admins
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

1. Run `supabase/schema.sql` in **SQL Editor** (again, if you ran an older copy: it is safe to re-run).
2. Create an account on the site's account page with your email, and confirm it.
3. In **SQL Editor**, run (with your email):
   ```sql
   insert into public.admins (email) values ('you@example.com');
   ```
4. Open `admin.html` and sign in. To remove an admin: `delete from public.admins where email = '…';`

The first time you connect the database, the shop shows what's in the `products` table. The
schema already adds the ART WILL TEE there; if you changed `catalog.js` before, make the same
changes on the admin page.

## Where orders go

The site has no server of its own. When a buyer presses **Place order**, `app.js` does two things at once:

1. **Email (always on).** The order is sent through [FormSubmit](https://formsubmit.co) to
   `orderEmail` in `catalog.js` (now `markuss.suna.veid@gmail.com`). The email has the items,
   sizes, total and the buyer's name, email, phone, address and note. Reply to it to send the buyer
   payment details; the reply goes straight to the buyer.
2. **Stored record (once Supabase is set up).** The same order is saved in Supabase under
   **Table Editor → orders**, for guests and signed-in customers alike (guest orders have an empty
   `user_id`). Until `config.js` has the Supabase keys, this step is skipped.

The buyer only sees "Order received" if at least one of the two worked. If neither did, the cart is
kept and the buyer gets a link that opens their email app with the whole order written out,
addressed to `contactEmail` in `catalog.js` (`moyenhills@gmail.com`).

Newsletter sign-ups are emailed the same way to `moyenhills@gmail.com`.

**One-time activation (do this before launch):** FormSubmit does not deliver anything to an address
until it is activated. Place one test order on the live site; FormSubmit then emails an
**Activate Form** link to the order address. Click it, then place a second test order and check it
arrives. Until then, buyers see "The order could not be sent" (the site checks FormSubmit's answer,
so an order is never shown as received when it was not). Do the same for the newsletter form.

After activating, FormSubmit gives you a random alias. Put it in `orderEmail` in `catalog.js`
in place of the plain email address, so the address is not visible in the page source.

To send orders to a different inbox, change `orderEmail` in `catalog.js` and activate the new address the
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
