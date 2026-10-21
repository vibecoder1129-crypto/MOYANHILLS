# MOYEN HILLS — complete project history

Backup of everything done on the MOYEN HILLS website, from the first Claude Code session to now.
Written 21 Oct 2026 (UTC) for future context. All times are UTC.

**Secrets are redacted.** Every API key, password or token that was pasted in chat is shown as
`[REDACTED]`. Publishable keys, URLs and email addresses are kept because they are not secret.

Sources read for this file: the original Claude Code session (`session_013s12kGVThwEUdTNToVnfHf`,
19–20 Oct), the project chat, every thread in the project (MOYENHILLS site launch, Order
notifications, Allow 21st.dev network access, Weekly site health check, OmniRoute install,
Partnership agreement, Site security and EU compliance, Stripe payments, Latvian language support),
project memory, and the live GitHub PR list.

---

## Contents

1. [Quick facts](#1-quick-facts)
2. [People and roles](#2-people-and-roles)
3. [Accounts, services and where things live](#3-accounts-services-and-where-things-live)
4. [How the site works (architecture)](#4-how-the-site-works-architecture)
5. [Pull requests #1–#11 and branch map](#5-pull-requests-1-11-and-branch-map)
6. [Chronological log](#6-chronological-log)
   - 6.1 Original session, 19 Oct (design and build)
   - 6.2 Original session, 19–20 Oct (going live, domain, orders, newsletter)
   - 6.3 Project setup, 20 Oct 22:32
   - 6.4 MOYENHILLS site launch thread
   - 6.5 Order notifications thread
   - 6.6 Allow 21st.dev network access thread
   - 6.7 OmniRoute install thread
   - 6.8 Partnership agreement thread
   - 6.9 Site security and EU compliance thread
   - 6.10 Stripe payments thread
   - 6.11 Latvian language support thread
   - 6.12 Weekly site health check routine
7. [Decisions and why](#7-decisions-and-why)
8. [Step-by-step setup procedures (what Archit ran)](#8-step-by-step-setup-procedures-what-archit-ran)
9. [Open to-dos and blockers](#9-open-to-dos-and-blockers)
10. [Security incidents and keys to rotate](#10-security-incidents-and-keys-to-rotate)
11. [Useful links](#11-useful-links)

---

## 1. Quick facts

| Item | Value |
|---|---|
| Brand | MOYEN HILLS (Latvian clothing brand) |
| First product | **ART WILL TEE**, boxy short-sleeve tee, 100% cotton, cut-off hem, screen printed front/back/neck label, made in Latvia, pre-made, ships in 1–3 days |
| Price | **€35** (was €35 → €45 → back to €35 on 19 Oct) |
| Stock | Placeholder **10 each of S, M, L, XL** (real numbers still needed) |
| Domain | **moyenhills.com**, bought through Shopify on 20 Sep 2026. Site is NOT hosted on Shopify |
| Repo | `vibecoder1129-crypto/MOYANHILLS` on GitHub, **private since 21 Oct** |
| Main working branch | `claude/project-thread-ba71sw` (PR #2 into `main`) |
| Database | Supabase project `kvykvcjwqjzaepdiwydd`, region eu-west-1 (Ireland) |
| Orders inbox | **ordersmoyenhills@gmail.com** (also the Brevo sender) |
| Brand / contact email | moyenhills@gmail.com |
| Social | Instagram @moyenhills, TikTok @moyenhills |
| Online preview | https://claude.ai/artifact/8nzPHsMySrgpf5h56g5xDG |
| PC preview | `E:\MoyenHills\MOYANHILLS`, served at http://localhost:8000 (`python -m http.server 8000`) |
| Admin page | `/admin.html` (not linked anywhere; live: moyenhills.com/admin.html) |
| Status (21 Oct 03:51) | Not live. Archit asked to "launch site with latest changes"; launch thread is checking that PR #8 (Stripe + Latvian) is merged first |

---

## 2. People and roles

- **Archit Gajjar** (project user "archit", GitHub `vibecoder1129-crypto`, admin email
  architgajjar72@gmail.com): designs, builds and runs the website and tech accounts. **Owner** role in
  the admin panel.
- **Markuss Veidemanis-Sūna** ("Markuss", founder and brand owner). His personal email
  markuss.suna.veid@gmail.com was the first order inbox. His phone number was shared once
  (`+371 2788****`, masked here). He asked that his name and number are **not shown on the site**,
  except where EU law requires seller details (Terms page). His Shopify bill lists
  "MOYEN HILLS, Markuss Sūna, Grēdu iela 15, Riga LV-1019"; whether to use that on the Terms page is
  still unanswered.
- **Partnership:** Archit gets a **10% partnership stake** from Markuss (draft agreement, section 6.8).
- **Developer credit:** every page shows a small "Designed & built by Archit Gajjar" line under the
  © line, plus a console message, a `<meta name="designer">` tag and an HTML comment. Keep this on
  every new page.
- **Control:** advised open owner/editor roles (Archit = owner, Markuss = editor), agreed in
  writing, no hidden lock-outs. Built in the security work.

---

## 3. Accounts, services and where things live

| Service | What it is used for | State |
|---|---|---|
| **GitHub** `vibecoder1129-crypto/MOYANHILLS` | Code | Private since 21 Oct 01:32. History checked: no secrets ever committed (only the publishable Supabase key, emails, schema) |
| **Supabase** `https://kvykvcjwqjzaepdiwydd.supabase.co` | Database (products, orders, promo codes, admins, accounts), auth, Vault, Edge Functions | Set up. Publishable key `sb_publishable_3r7gOR4-BLAnIlMnbQ-mvg_wy07p1tp` is in `config.js` (meant to be public). Email sign-in on; Google/Apple sign-in off until configured. Owner = architgajjar72@gmail.com with TOTP 2FA |
| **Brevo** (account sender ordersmoyenhills@gmail.com) | Newsletter "Join the Hills family" (double opt-in form `49ed994b.sibforms.com`), and transactional order/cancellation emails from the database | Working. Brevo API key stored in Supabase Vault as `brevo_api_key`. IP blocking for API keys deactivated. Emails can land in spam until moyenhills.com is authenticated in Brevo |
| **FormSubmit** (formsubmit.co) | Original order + newsletter email route | **Removed** in PR #10 because Latvian ISP DNS filters (LMT, internetasargs.lv) block formsubmit.co |
| **Vercel** project `moyenhills` (id `prj_hygZu0VplLPs31QUdjqr2UUykzCc`, team `archit-gajjar`, user `architgajjar72-1179`) | Original hosting choice | First deploy failed (`git_info_fail`, Vercel couldn't read the repo). Cloud connector gets 403 on that team. `vercel.json` has the security headers. Free plan is non-commercial only |
| **Netlify** | Recommended host (free plan allows commercial use) | Archit connected GitHub on 21 Oct, then **deleted the site** to keep it private. `netlify.toml` merged via PR #5 |
| **Shopify** | Holds the domain moyenhills.com only | Keep the plan until at least **19 Nov 2026** (DNS edits need a plan; domain can be moved to another registrar 60 days after purchase) |
| **Stripe** | Card payments (PR #8) | Not set up yet: no account, keys or deployed functions |
| **Canva** (connector) | Generated one AI model photo (not used: blocked download, and AI redrew the print) | https://www.canva.com/M/MAHYd7fGcO4 |
| **21st.dev** (MCP connector) | UI component search | Connector works since 20 Oct 22:38 (free tier: unlimited search, 2 code pulls/day) |
| **OmniRoute** | Local AI gateway on Archit's PC (unrelated to shop) | Installed in `E:\MoyenHills\OmniRoute`, http://localhost:20128 |
| **Archit's PC "Jarvis"** | Local preview, Remote Control sessions | `E:\MoyenHills\MOYANHILLS`; not signed in to GitHub, so it can't pull from the private repo |

---

## 4. How the site works (architecture)

Plain static site (HTML/CSS/JS, no build step). Pages: `index.html` (landing), `shop.html`,
`product.html?id=…`, `lookbook.html`, `account.html`, `admin.html`, `terms.html`, `privacy.html`,
`withdraw.html` (EU "Cancel an order"). Font self-hosted (no Google Fonts, for GDPR).

- **catalog.js** holds everything sold: products, prices, `wasPrice`, sizes/stock, photos, hashed
  promo codes, `orderEmail`, `newsletterForm`. Pages build from it. With Supabase connected, the
  `products` / `promo_codes` tables are the live source and catalog.js is the fallback.
- **config.js** holds the Supabase URL + publishable key and flags (e.g. `cardPayments`).
- **boot.js** (strict CSP means no inline scripts) picks the language: `?lang=` → localStorage
  `mh-lang` → `navigator.languages[0]`.
- **i18n.js** (PR #11): dictionary keyed by the English text, `mhT()` / `mhTMessage()`, translates
  the page at end of body. Legal pages use `data-lang="en"` / `data-lang="lv"` pairs. **Any new page
  text needs a line in i18n.js.**
- **cookie.js**: plain cookie notice with OK (key `mh-cookie-ok`) and a Details link. No tracking, so
  no consent banner is needed. Adding analytics or pixels would need a real consent banner first.
- **Admin page:** preview mode (no Supabase keys: edits kept in localStorage `mh-catalog-draft`,
  "Download catalog.js" exports) or live mode (Supabase). Tabs: Products, Promo codes, Orders,
  Cancellations, Team (owners manage; editors see only other editors), change log.
- **Database (Supabase):** row-level security; `is_admin` requires MFA (aal2); roles `owner` /
  `editor`; append-only `admin_log`; `prepare_order` recomputes prices and promo in the database,
  checks stock, limits 5 orders / 10 min per hashed IP; `check_promo` 15 tries / 10 min; stock drops
  when an order is placed and returns if it's cancelled; image bucket ≤ 8 MB photos only; 30-minute
  idle sign-out on admin; salted `client_hash`; withdrawals table + `request_withdrawal`; GDPR
  `export_my_data` / `delete_my_account`; `price_history` + Omnibus 30-day `was_price` check;
  `purge_old_records(years)`.
- **Emails (PR #10):** `supabase/notify.sql` adds AFTER INSERT triggers `orders_mail` /
  `withdrawals_mail` that call Brevo `/v3/smtp/email` through `pg_net`, reading the key from Vault
  `brevo_api_key`; addresses in `private.secrets` (`mail_from`, `mail_from_name`, `mail_shop`,
  `mail_reply`). The shop gets the order, the customer gets a copy (in their language after PR #11).
  Debug with `net._http_response` and Brevo's transactional logs.
- **Card payments (PR #8, off until `cardPayments: true`):** cart inserts order with secret
  `pay_token` → Edge Function `create-checkout` builds a Stripe Checkout session from DB amounts →
  `stripe-webhook` marks paid/pending, or cancelled on expiry (restocks). Unpaid card orders with no
  session are cancelled after 90 min (`release_unpaid_orders`). `payments.sql` re-creates the mail
  trigger so card orders are emailed only once paid (`orders_mail_paid`) and adds `shipping_rates`
  (placeholder €0 for `latvia` and `*`).
- **Hosting files:** `vercel.json` (headers, strict CSP), `.vercelignore` (keeps `.claude/`,
  `supabase/`, `*.md` off the live site), `netlify.toml` (same headers, copy-to-dist so `supabase/`
  isn't published).
- **SQL run order (always, every time):** `schema.sql` → `privacy.sql` → `notify.sql` →
  `payments.sql`. Re-running `notify.sql` alone re-mails card orders at insert, so keep
  `payments.sql` last. Copies are in the project folder `supabase/`.

---

## 5. Pull requests #1–#11 and branch map

Live status from GitHub on 21 Oct 2026, ~03:55 UTC.

| # | Title | Head → base | Status |
|---|---|---|---|
| 1 | Make sure every order reaches the owner | `claude/project-thread-csnk11` → `main` | **Open** (superseded: FormSubmit later removed in #10) |
| 2 | MOYEN HILLS store: shop, admin, promo codes, security and EU compliance | `claude/project-thread-ba71sw` → `main` | **Open**. The main working branch; merging it puts everything on `main` |
| 3 | Security and EU compliance pass: CSP everywhere, withdrawal button, GDPR tools | `claude/project-thread-x7xr6y` → ba71sw | Merged 21 Oct 01:05 (6ee910c) |
| 4 | Newsletter: tell people to check spam if the confirmation email doesn't arrive | x7xr6y → ba71sw | Merged 01:14 (bd4e871) |
| 5 | Netlify config + lock trigger-only functions out of the API | x7xr6y → ba71sw | Merged 01:41 |
| 6 | Admin: fix two-step setup failing with "Unexpected failure" | x7xr6y → ba71sw | Merged 01:46 (c6a7ef7) |
| 7 | Admin: editors can delete products, cancellations tab, safer stock edits | x7xr6y → ba71sw | Merged 01:58 (2c17721) |
| 8 | Card payments with Stripe Checkout (+ Latvian language from #11) | `claude/project-thread-ph1ar5` → ba71sw | **Open**. Now also carries #11 |
| 9 | Admin: editors see only other editors, not the owners | x7xr6y → ba71sw | Merged 02:24 (dd4c0c0) |
| 10 | Send order and cancellation emails from the database via Brevo | x7xr6y → ba71sw | Merged 02:44 (fa1ce8f) |
| 11 | Latvian language: LV / EN switch, Latvian pages, products and emails | `claude/project-thread-ts337p` → ph1ar5 | Merged 03:51 **into the Stripe branch**, so it reaches ba71sw only when #8 merges |

Other branches: `claude/taste-skill-frontend-design-1158jt` (original session's branch; `main` was
created from it at 12e1591), `backup-pc-2026-10-21` (on Archit's PC only, his PC-only admin/lookbook
version, local commits dc011b9 and 992a2bb, never pushed), PC stash "pc hardening draft".

**Merge order to finish:** merge #8 (brings Stripe + Latvian into ba71sw) → merge #2 (ba71sw into
`main`) → deploy `main`. Close #1 (obsolete). #5 is already merged.

---

## 6. Chronological log

### 6.1 Original session, 19 Oct 2026 (design and build)

Session `session_013s12kGVThwEUdTNToVnfHf`, branch `claude/taste-skill-frontend-design-1158jt`.

| Time | Asked | Done |
|---|---|---|
| 02:25 | `npx skills add …taste-skill --skill "design-taste-frontend"` | Installer failed (invalid YAML in the skill header: unquoted colon). Copied into `.claude/skills/design-taste-frontend/` with the description quoted |
| 02:37 | `npx ui-ux-pro-max-cli init --ai claude` | Installed 7 skills: ui-ux-pro-max, design, design-system, ui-styling, brand, banner-design, slides |
| 02:39–02:41 | Add 21st MCP server (`claude mcp add … x-api-key: [REDACTED]`), `npm i -g @21st-dev/cli`, `21st login` | Registered locally, but cloud network blocked 21st.dev (proxy 403). CLI installed; login can't work (no browser, blocked). Skipped writing `.mcp.json` because it would commit the key; suggested `${TWENTYFIRST_API_KEY}` env secret. Told to rotate the key |
| 02:44–02:45 | Shared a claude.ai share link of a previous chat and "use it" | Couldn't read it (JS/Cloudflare). Asked for the brief |
| 02:46 | Brand brief (see below) | — |
| 02:47 | "Clothing brand MOYENHILLS, Shopify-style store around one tee" | Built the one-product store with the logo from the PDF and two photos; tested in a browser; first price guess €35 |
| 02:57 | "The price is €45" | Price set to €45 |
| 02:58 | "Make the website" (go live) | Vercel project `moyenhills` created, deploy failed `git_info_fail` (Vercel can't read the repo). Offered Vercel import or Netlify Drop |
| 02:59 | "First show me the artifact" | Published preview https://claude.ai/artifact/8nzPHsMySrgpf5h56g5xDG |
| 03:03 | Real tee photos; "Zara / H&M style UI, motion graphics" | Cleaned 5 Instagram photos (removed profile-picture overlays), renamed product **ART WILL TEE**, rebuilt as home + product page, GSAP bundled (cdnjs blocked), intro animation, hero slideshow, horizontal gallery, word-by-word quote |
| 03:15 | "Scrolling animation is lagging" | Scroll-linked effects made 1:1, cheaper reveals, rAF header; slow-phone p95 frame 33ms → 17ms |
| 03:58 | "Don't overdo it, no side scrolling" | Removed all sideways scrolling, calmer motion, buy box after first photo on phone |
| 04:55 | Rounded rectangle buttons, less content, remove highlighted sections | Rounded all controls; removed lookbook text, quote section, "Printed on three sides", facts row (~30% shorter) |
| 04:59 | Sketch: image → shirt → email | Rebuilt home page to the sketch |
| 14:55–15:39 | "Let's restart", "Wait", "step by step", "Do not start making anything yet" | Stopped; reverted a half-started deletion; watched a "default vs premium Shopify" reel and described it |
| 15:41 | Landing page with the night photo | Step 1: header + full-screen photo |
| 15:44 | Lookbook section + header link, landing like the video | Small links left, logo centre, cart right; 6-photo lookbook strip; phone menu |
| 15:49 | More motion + generate model photo | Light motion added; Canva generated a model shot but download blocked and the AI redrew the print, so not used as product photo |
| 15:53 | Product page centred | Done |
| 15:57 | Scrolling gallery on product | Swipe/arrow gallery with counter and thumbnails |
| 15:59 | Remove night photo from gallery; price is **€35** | Done (6 photos, €35) |
| 16:00 | Remove cart side-sliding | Cart fades in; fixed a hidden anti-spam field that caused 24px sideways scroll |
| 16:03 | Premium lookbook with quotes, brand section | Editorial lookbook with the tee's own print lines as quotes ("ART WILL SAVE US ALL.", "We all just some average kids at the end of the day.", "Hey kid, never be afraid to have big desires."); About section |
| 16:07 | No navbar, cart icon | Logo centre + bag icon; header transparent over the photo, white after |
| 16:12 | Login with Google/Apple/email, order history, saved details | Supabase customer accounts (supabase-js 2.100 bundled), `supabase/schema.sql`, account page; off until keys are added. README steps for Supabase, Google, Apple ($99/yr dev account) |
| 19:35 | "ART WILL TEE OUT NOW" in bold on the landing photo | Done, with Shop now under it |
| 19:38 | Lookbook as its own page, linked from a photo with a "LOOKBOOK" button | `lookbook.html`; landing banner with the stairs photo |
| 19:41 | Remove the stairs photo from lookbook | Done |
| 19:44 | "World-class UI/UX redesign" | Tee as centrepiece, fold-out sections, phone buy bar, no dead ends (footer menu), empty-cart CTA, view transitions, 3–7× lighter phone images. Left out fake reviews, timers, "you may also like" |
| 19:56 | Better header | Announcement strip, menu icon with full-screen menu, logo shrinks after the photo |
| 20:05 | Newsletter wording "Join the Hills family" | Heading, JOIN button, "Welcome to the Hills family" |
| 20:08 / 20:10 | Loading screen with logo, then "more cinematic" | Film-grain black screen, logo focus-in, "ART WILL TEE — FIRST DROP", shutter reveal (~2.8s, once per visit) |
| 20:15 | No shopping from landing, scarcity feel | Landing tee section is view-only with "LIMITED STOCK — ONLY X LEFT" counted from real stock; refused a fake sign-up number (EU misleading-advertising risk) |
| 20:19 | Phone country code in checkout | Separate code box (default +371, all of Europe + US/India/UK, manual entry) |

**Brand brief given at 02:46:** orders to markuss.suna.veid@gmail.com; phone (masked) +371 2788****;
name Markuss Veidemanis-Sūna (not to be shown); brand email moyenhills@gmail.com (marketing + info);
Instagram and TikTok @moyenhills; product description (boxy tee, front/back/neck screen prints, 100%
cotton, cut-off bottom, MADE IN LATVIA, 1–3 days fulfilment, pre-made); sold-out = black-and-white
image + "SOLD OUT, DONT BE LATE"; layout: "cart" with count top-right, bold "MOYEN HILLS" top-left
(scroll to top), "subscribe to news and updates" + email + black SUBSCRIBE, instagram link.

### 6.2 Original session, 19–20 Oct (going live, domain, orders, newsletter)

- **20:25 "How can I make this website live":** explained static hosting (Netlify / Vercel / GitHub
  Pages), domain, FormSubmit activation, and pre-launch needs: real stock, shipping, payment options
  (manual → Stripe Payment Links → Shopify), EU legal basics (seller details, terms with 14-day right
  of withdrawal, privacy policy), size measurements, a test run. Day-to-day use and promotion ideas.
- **20:28 "Do it all":** created `main` from the finished branch (no PR needed, main was empty),
  added **Terms and Privacy pages** (yellow gaps for seller details), consent notes under the
  newsletter and above Place order, **self-hosted the font** (Google Fonts removed for GDPR), domain
  check (moyenhills.com/.lv taken; .eu/.store/.shop/.co/.clothing/.net/.org, wearmoyenhills.com,
  shopmoyenhills.com free).
- **20:31 "I bought a domain from Shopify, don't want to host on Shopify":** keep the domain at
  Shopify and point DNS to the host. Don't cancel the Shopify plan before moving the domain.
- **20:33 "Here" (Shopify bill):** domain is **moyenhills.com**. Connecting to Vercel refused (connector
  has no write access). Steps given: import repo on Vercel (branch main, framework Other) → add
  domain, www redirects to apex → Shopify DNS **A @ 76.76.21.21**, **CNAME www cname.vercel-dns.com**.
  Don't point DNS until stock and legal gaps are filled. Asked for stock, seller details (bill shows
  Markuss Sūna, Grēdu iela 15, Riga LV-1019), shipping/VAT/returns.
- **20:36 "How will I email all subscribers":** needs MailerLite or Brevo (EU, free tiers), double
  opt-in, send from hello@moyenhills.com via DNS records; waiting for form embed code.
- **20:43 "Where will I receive orders":** email to markuss.suna.veid@gmail.com via FormSubmit (first
  order triggers an activation link), signed-in orders also in Supabase. Payment is manual.
- **20 Oct 22:28 "I'm on my PC, download the skills":** skills already installed; 21st still blocked
  in the cloud; run the `claude mcp add` command on the PC instead; rotate the key.
- **22:30** Archit pasted the 21st command with the key again (`[REDACTED]`). Ran it; still blocked.
  Key appeared twice in chat: **rotate it**.
- **22:50** (via a preview comment) About section rewritten with Archit's brand story: *"MOYEN HILLS
  is about rising above your everyday struggles, getting past whatever holds you back, and living
  free of the worries that weigh you down. Through our art, we encourage you never to give up on what
  you truly want from life. Keep climbing. The view from the top is worth it. The Hills family is
  everyone who is part of MOYEN HILLS: a community that lifts each other up. Our goal is to bring the
  Hills family together at events around the world, to meet, share and support one another."*

### 6.3 Project setup, 20 Oct 22:32

Archit asked to turn the session into a project. Proposed: name MOYENHILLS, repo MOYANHILLS,
default environment, routine "Weekly site health check" (Mondays 09:17 UTC), threads "Order
notifications" and "Allow 21st.dev network access". Draft project instructions: *"MOYENHILLS is a
storefront website in vibecoder1129-crypto/MOYANHILLS, hosted on Vercel. The custom domain was
bought through Shopify but its DNS points to Vercel, and the site is not hosted on Shopify. Customers
need a reliable way to get orders to the owner. Before you change the domain or deploy settings, ask
first."* Archit then started a continuation thread (sent twice; the duplicate was ignored).

### 6.4 MOYENHILLS site launch thread (20 Oct 22:40 → 21 Oct 03:51)

- **22:42** Caught up. Vercel still refuses changes (403). Gave Vercel + Shopify DNS steps; asked for
  stock, seller details, shipping. Keep Shopify until 19 Nov.
- **22:43** Archit: **"I don't want to make it live yet, just preview locally."** Launch paused; local
  preview steps given (download ZIP / `python -m http.server 8000`).
- **22:50** About section rewritten from Archit's comment (see 6.2).
- **22:54** Archit sent 4 new photos for the lookbook "with professional colour correction". Graded
  (white balance, yellow cast removed, soft film contrast, cool shadows / warm highlights, grain,
  vignette) and swapped in; old photos removed. Before/after in project folder `lookbook/`. Changes in
  **PR #2** (branch `claude/project-thread-ba71sw`).
- **22:58–23:06** "Run this preview on localhost:8000". Remote Control session on PC "Jarvis".
  First server ran from System32 (wrong folder); site served from `E:\MoyenHills\MOYANHILLS`, moved
  to 8001, then back to **8000** after Archit stopped the old python processes.
- **23:09** Screenshots + opened the preview in Claude and the desktop browser pane.
- **23:12** Lookbook redesign with MOYEN HILLS quotes using the 4 photos. Version A (online, print
  quotes + "Keep climbing…") vs Version B (made by the PC session, extra lines "Moyen means
  average. We wear it loud.", "From the hills, for the average kids.", Made in Latvia list, scrolling
  strip). Decision card offered A / B / mix. At sync the online version A was kept (B is on the PC
  backup branch).
- **23:17–23:20** Developer credit: first a hidden easter egg (triple-tap ©), then made **always
  visible** at Archit's request.
- **23:23** "Admin page + promo codes + easy structure to add/change products and prices." Built:
  `catalog.js` single source, `shop.html`, product pages from the catalog, promo codes (% or €, minimum
  order, end date, max uses; rechecked at order time), Supabase tables products / promo_codes /
  admins, admin page (products, prices, was-price, stock per size, photos, sold out, featured
  product, promo codes, orders), preview mode with "Download catalog.js".
- **23:40–23:46** OmniRoute link + "install it" → moved to its own thread. Admin is at
  `localhost:8000/admin.html`.
- **23:49** "How to make admin very secure?" Explained DB-enforced security; suggested 2FA, strong
  passwords, short admin list, never expose service_role, Supabase email confirmation +
  leaked-password protection, optional host password on admin.html.
- **23:54** "How can I be more in control than Markuss?" Advised owner/editor roles enforced by the
  DB, account ownership split (Archit: GitHub/Vercel/Supabase; Markuss: domain), done openly and in
  writing, no hidden lock-out. Offered activity log and order emails to both.
- **21 Oct 00:03–00:11** "Supabase account created, let's connect it." Archit sent the Project URL
  and the publishable key. Added to `config.js` (commit 00e3ede). Steps: run schema.sql, set Auth
  Site URL `http://localhost:8000` and redirect `http://localhost:8000/*`. Archit said **"sync"**: PC
  switched to the GitHub version, old PC work kept on `backup-pc-2026-10-21`.
- **00:11** Make yourself admin: create account on account.html, then
  `insert into public.admins (email) values ('your@email.com');`.
- **00:18 "Now let's make it really safe"** (commit 4896213): required TOTP 2FA checked by the DB
  (aal2), owner/editor roles with Admins tab, immutable change log, order limits (5 / 10 min,
  out-of-stock refused), promo guessing limit (15 / 10 min), photo-only uploads ≤ 8 MB, 30-min idle
  sign-out, security headers. PC hardening draft stashed ("pc hardening draft"), PC reset to GitHub.
- **01:06** After PR #3 merged, PC updated (6ee910c); SQL order now schema then privacy.
- **01:11** Newsletter diagnostic from the PC (curl to the Brevo form): Brevo accepts sign-ups (CORS
  OK). **01:15** spam hint line merged (bd4e871), PC updated.
- **01:46–01:48** 2FA "Unexpected failure" fix (c6a7ef7 + QR-stays-on-refocus fix e19fda2) applied
  to the PC's admin.js by hand (PC can't pull a private repo). Correction: Archit's authenticator was
  already linked, **no rescan needed**; the security thread owns admin onboarding from here.
- **02:01** PC needs a one-time GitHub sign-in to get updates:
  `cd E:\MoyenHills\MOYANHILLS; git stash -u; git fetch https://github.com/vibecoder1129-crypto/MOYANHILLS.git claude/project-thread-ba71sw; git reset --hard FETCH_HEAD`
- **02:31–02:38** Order emails not arriving. With Archit's "send the test", the PC sent a FormSubmit
  test. Found: **Latvia's DNS safety filter (LMT / internetasargs.lv) blocks formsubmit.co.** The test
  went through a pinned IP and FormSubmit sent an Activate link. Recommended moving emails to
  Supabase + Brevo (server side). Workarounds for the link: phone on mobile data, Android Private DNS
  `one.one.one.one`, or the Cloudflare 1.1.1.1 app.
- **02:41** How to create a Brevo API key (SMTP & API → API Keys → Generate). **02:43 Archit pasted a
  Brevo key in chat (`xkeysib-[REDACTED]`)** → told to delete it and make a new one. **02:44** key
  type: **Restricted**, only "send transactional emails". **02:45** done.
- **03:51** Coordinator relayed "launch site with latest changes" and asked to check PR #8's state
  (Latvian is inside it, and there was a card-mode init bug) before launching. In progress.

### 6.5 Order notifications thread (20 Oct 22:34–22:40) → PR #1

Found every order went only by FormSubmit email to markuss.suna.veid@gmail.com; Supabase stored only
signed-in orders (and wasn't set up). Bug: FormSubmit answers "OK" before activation, so buyers saw
"Order received" for orders that never arrived. **PR #1:** checks FormSubmit's `success` field, saves
every order (guests too) in Supabase, buyer fallback (keeps cart, offers a pre-written email to
moyenhills@gmail.com), README "Where orders go". Screenshots in `order-preview/`. Open; superseded by
PR #10.

### 6.6 Allow 21st.dev network access thread (20 Oct 22:34–22:38)

Steps: Project settings → cloud environment → Network access → Limited, add `21st.dev` and
`api.21st.dev`, keep "Allow package managers". After Archit's change the **21st connector works**
(free tier). Direct requests from sessions to 21st.dev were still blocked at that time.

### 6.7 OmniRoute install thread (20 Oct 23:45 → 21 Oct 00:03)

Installed https://github.com/diegosouzapw/OmniRoute on the PC at `E:\MoyenHills\OmniRoute` (outside
the site repo). Safety changes: `HOST=127.0.0.1` (was open to the whole network), cleared the public
default password `CHANGEME`, secrets generated locally in a git-ignored `.env`, "start with Windows"
and traffic interception left off. Fixes: installed a skipped DB package, SWC cache at
`C:\Users\archi\.swc-omniroute`, low-memory build. Start with `E:\MoyenHills\start-omniroute.cmd` or
`npm start`; dashboard **http://localhost:20128** (set password, add providers, copy an OmniRoute key,
point tools at `http://localhost:20128/v1`, model `auto`).

### 6.8 Partnership agreement thread (20 Oct 23:58 → 21 Oct 00:01)

Draft agreement (Claude Doc): https://claude.ai/artifact/Pt2ifSwZRra5eAEvBPbyNn. Latvian law.
Option A = 10% net profit share, Option B = 10% shares in an SIA; vesting; code ownership; account
table (GitHub/Vercel/Supabase run by Archit, domain + Shopify held by Markuss); exit and handover.
Schedule A lists open points. Still undecided: equity vs profit share, whether the business is
registered, vesting, code ownership, whose name the accounts are in. **Must be reviewed by a Latvian
lawyer before signing.**

### 6.9 Site security and EU compliance thread (21 Oct 00:25 → 03:51)

- **00:38 PR #3:** strict CSP on every page (inline head script → boot.js), internal files kept off
  the live site, DB checks real email/name/address on orders, closed a fake-order-limit loophole,
  **EU withdrawal button** page `withdraw.html` (Directive 2023/2673, required since 19 Jun 2026;
  customer gets an automatic receipt), download/delete my data on the account page, spam fingerprints
  forgotten after 24 h, Terms and Privacy rewritten (14-day withdrawal, model form, no-cookie-banner
  reason), Omnibus 30-day was-price rule. `privacy.sql` must run after `schema.sql`.
  Owner checklist: https://claude.ai/artifact/EJUjc8mNZVaenr6pBJMJGY
- **00:50** "Add cookie to the page" → cookie notice on every page (bottom-left, OK + Details, Cookies
  link in footer).
- **00:51–01:02** Archit made a **Brevo** account. ordersmoyenhills@gmail.com = **orders inbox** (and
  Brevo sender). Orders and cancellations routed there instead of Markuss's Gmail. Archit created a
  double opt-in Brevo form and pasted the embed code (public form, not a secret). "Join the Hills
  family" now posts to `49ed994b.sibforms.com` (`?isAjax=1`, fallback plain POST), success text
  "Almost there: check your inbox and tap the link to confirm"; CSP allows `*.sibforms.com`; privacy
  policy names Brevo.
- **01:05** Archit: "do it" → **PR #3 merged**, PC updated.
- **01:10–01:15** Confirmation email landed in **spam** (free gmail sender via Brevo). Fix: authenticate
  moyenhills.com in Brevo (Brevo code, 2 DKIM, DMARC as custom records in Shopify DNS), sender
  hello@moyenhills.com. **PR #4**: "check your spam" line.
- **01:19** Archit connected GitHub to **Netlify**. **PR #5** adds `netlify.toml`. Netlify deploys are
  public at *.netlify.app, so Archit **deleted the Netlify site** (01:28). Recommendation: **Netlify**
  over Vercel, because Vercel's free plan is non-commercial only.
- **01:30–01:32** Repo was public (no secrets in history, but Markuss's Gmail, Archit's git email,
  schema visible). Archit made it **private**.
- **01:35** Admin once live: moyenhills.com/admin.html, email + password + 6-digit code. Remaining
  steps listed.
- **01:36–01:41** Guided Supabase setup (section 8). Errors along the way: `column "role" … does not
  exist` (new schema not yet run) and `syntax error at or near "E"` (pasted the file path instead of
  the contents). Then **DONE**: owner architgajjar72@gmail.com confirmed. Advisor fix: one `revoke
  execute …` line (merged in PR #5's privacy.sql §7). Turn on leaked-password protection if the plan
  allows.
- **01:44–01:49** "Unexpected failure" at 2FA setup = admin started MFA enrolment twice; fixed in
  **PR #6**. QR scan is one-time; later sign-ins are email + password + code (phone: add admin page to
  home screen). Offered to lengthen the 30-min idle sign-out.
- **01:54–02:01** "Check admin thoroughly; editors can add/remove products" → **PR #7**: editors can
  delete products, Cancellations tab (due-back date, "Sorted" tick), optimistic save on
  `products.updated_at` so stock isn't overwritten, cancelled orders can't reopen, first-admin setup
  fixed. DB part in `admin-update-2026-10-21.sql`.
- **02:03** Archit: stock should drop when an order is marked paid. Answer: it already drops at
  order time and returns on cancel (prevents overselling the last piece). Archit: "cool".
- **02:07** "gem install stripe, let's add Stripe" → separate thread (gem is for Ruby; not needed).
- **02:21–02:24** Editors must not see owners or change roles → **PR #9**: Team tab, editors see only
  editors (read-only), change log hides owner entries and team changes from editors. Appended to
  `admin-update-2026-10-21.sql`.
- **02:26** Supabase status page incident (us-east-2) doesn't affect this project (eu-west-1, healthy).
- **02:26** "Blue-red (blue-green) deployment?" Netlify/Vercel already do atomic deploys + one-click
  rollback + preview URLs. DB changes have no rollback; written backward-compatible; a staging
  Supabase project worth adding after launch.
- **02:27** "Will it crash?" Static pages very robust; catalog.js fallback; orders saved in DB +
  email; risks: Supabase free plan **pauses after ~1 week idle**, and **no restorable backups** on free
  plan (Pro $25/mo or a weekly export).
- **02:28–02:40** Order emails not received; orders #1 (€70) and #2 (€31.50) were in Supabase.
  FormSubmit blocked by Latvian DNS filter (see 6.4) → **PR #10**: emails from the DB via Brevo,
  FormSubmit removed, privacy page updated, customer copy email.
- **02:45–03:09** Brevo key setup (section 8): first SQL run had the key typed in place of the vault
  name inside the function, and `vault.create_secret` was run with the arguments swapped (key ended
  up as the plain-text *name*). Cleaned up, key re-created via Supabase **Integrations → Vault → Add
  new secret** (name `brevo_api_key`). The email function line was restored. Brevo then blocked
  Supabase's IP → Archit turned off **Authorised IPs for API keys** at
  https://app.brevo.com/security/authorised_ips. **03:09 Brevo accepted a test email (201). Order
  emails are live via the database.**
- **03:16** "Very important: Latvian language" → separate thread. **03:51** "launch site with latest
  changes" → passed to the launch thread.

### 6.10 Stripe payments thread (21 Oct 02:07 → 03:34) → PR #8

Built Stripe Checkout through Supabase Edge Functions (`create-checkout`, `stripe-webhook`),
"Continue to payment" → Stripe page, return/retry handling, admin shows "Card: paid" etc., EU
"order with obligation to pay" wording, `payments.sql` (tested on local Postgres), Terms §1/§2 card
versions in yellow for launch, README "Card payments" section. Off until `cardPayments: true`.
Delivery prices are €0 placeholders. 03:34: fixed the card checkout label and return screen not
showing (the init bug found by the Latvian thread). **Open; Archit's setup not done** (section 9).

### 6.11 Latvian language support thread (21 Oct 03:16 → 03:51) → PR #11

Spec from Archit: small LV/EN option in the navbar; default follows the device language; manual
choice remembered. Built on the Stripe branch. LV / EN in the header next to the menu button and in
the menu; all pages, cart, checkout, card payments, account, cancel page and cookie notice
translated; full Latvian Terms and Privacy (need lawyer review); product `lv` fields (catalog.js,
`products.lv` jsonb, admin "Latvian text" fieldset); `orders.lang`, `withdrawals.lang`,
`request_withdrawal(…, p_lang default 'en')`; `prepare_order` maps Latvija→Latvia; customer emails
in their language, shop emails in English; Stripe page opens in Latvian. Not translated: admin page,
Supabase auth emails, Brevo DOI email. Online preview updated (`?lang=lv` forces it). Archit merged
#11 at 03:51 **into the Stripe branch**. Also answered questions about the Projects credit (87% used,
expires in ~19.5 h; afterwards work uses the normal Pro allowance; nothing is lost).

### 6.12 Weekly site health check routine

Routine thread created 20 Oct 22:34: every Monday 09:17 UTC, check the domain resolves over HTTPS,
the latest deploy succeeded, key pages and the order form load. No runs yet (site not live). Note:
cloud sessions can't reach moyenhills.com or *.vercel.app, so checks need another route.

---

## 7. Decisions and why

| Decision | Why |
|---|---|
| Static site, no framework | One product; free hosting; nothing to run |
| Keep the domain at Shopify, host elsewhere | Archit didn't want Shopify hosting; DNS can point anywhere. Keep the plan until the domain can move (from 19 Nov) |
| Not live yet (preview only) | Archit's call on 20 Oct 22:43; stock, legal and shipping details still missing |
| Netlify recommended over Vercel | Vercel free plan forbids commercial use; Netlify free allows it |
| Repo private | Avoid exposing emails and schema |
| Supabase as backend | Accounts, orders, admin, server-side price checks; EU region |
| Prices and promo recomputed in DB | Browser can't fake a price |
| Stock drops at order time, returns on cancel | Avoid selling the last piece twice |
| Required TOTP 2FA, owner/editor roles, immutable log | "Really safe" admin; editors can't touch the team |
| Editors can't see owners | Archit wanted his owner identity hidden |
| FormSubmit → Supabase + Brevo emails | Latvian ISP filters (LMT) block formsubmit.co; server-side sending can't be blocked; Brevo is EU |
| Restricted Brevo key, in Supabase Vault | Leak can only send mail; key never in code |
| Brevo IP blocking off for API keys | Supabase's outgoing IP can change |
| No fake scarcity numbers or reviews | EU consumer law (misleading advertising) |
| Self-hosted font, no tracking, simple cookie notice | GDPR: no data to Google; no consent banner needed without tracking |
| AI-generated model photo not used as product photo | The AI redrew the print; buyers would get a different-looking shirt |
| Lookbook version A kept | Quotes are the brand's own words; B kept on PC backup |
| Latvian built on the Stripe branch | Both touch checkout; avoids conflicts |
| Open roles, no hidden lock-out of Markuss | It's his brand; avoid disputes; agree in writing |

---

## 8. Step-by-step setup procedures (what Archit ran)

### 8.1 Local preview on the PC
```
cd E:\MoyenHills\MOYANHILLS
python -m http.server 8000
```
Open http://localhost:8000 (admin: http://localhost:8000/admin.html). Ctrl+F5 after updates.
Stop a server: `Stop-Process -Id <pid>` in PowerShell.

Update the PC (needs a one-time GitHub sign-in, repo is private):
```
cd E:\MoyenHills\MOYANHILLS; git stash -u; git fetch https://github.com/vibecoder1129-crypto/MOYANHILLS.git claude/project-thread-ba71sw; git reset --hard FETCH_HEAD
```
Never `git push` from the PC (its old version would clash).

### 8.2 Connect Supabase (done 21 Oct 00:05)
1. Supabase → Project Settings → API: Project URL + **publishable/anon** key (never the
   service_role/secret key) → put in `config.js`.
2. Authentication → URL Configuration: Site URL `http://localhost:8000`, Redirect URL
   `http://localhost:8000/*`. **At launch add the live URL** (moyenhills.com and the Netlify URL).

### 8.3 Database SQL (run in SQL Editor, paste the file *contents*, not the path)
Open https://supabase.com/dashboard/project/kvykvcjwqjzaepdiwydd/sql/new, new query per file:
1. `supabase/schema.sql` → Run ("Success. No rows returned")
2. `supabase/privacy.sql` → Run
3. `supabase/notify.sql` → Run (emails)
4. `supabase/payments.sql` → Run (only once Stripe is set up; always last)

Done so far: schema + privacy (01:40), the revoke line, and `admin-update-2026-10-21.sql` (02:48,
includes PR #7, #9 and #10 DB parts). Still to do after PR #8 merges: the updated files from #8/#11
in the order above.

Advisor fix run once (01:41):
```
revoke execute on function public.check_new_order(), public.check_was_price(), public.check_profile(), public.record_price(), public.guard_admins(), public.handle_new_user(), public.log_admin_change(), public.prepare_order(), public.restock_cancelled() from public, anon, authenticated;
```

### 8.4 Make yourself the owner (done)
1. http://localhost:8000/account.html → create account (password ≥ 12 chars) → click the confirmation
   email (check spam).
2. SQL Editor:
```
insert into public.admins (email, role) values ('architgajjar72@gmail.com', 'owner');
```
To add Markuss later as editor: same insert with `'editor'` (or use the Team tab as owner).

### 8.5 Two-step login (done 01:43)
1. Install Google Authenticator / Microsoft Authenticator.
2. Open admin.html, sign in, scan the QR code once, type the 6-digit code.
3. Afterwards: email + password + code. Rescan only on a new phone. Back up the authenticator.
4. Optional: Supabase Authentication → leaked password protection.

### 8.6 Brevo newsletter form (done)
Contacts → Forms → Create subscription form → list "Hills family", only Email field → Confirmation:
**Double opt-in** + template → success message "Almost there! Check your inbox…" → Share → Embed →
code sent to Claude. Test: join with your own email, confirm the link (check spam, mark Not spam).

### 8.7 Brevo order emails (done 03:09)
1. Brevo → SMTP & API → **API Keys** tab (not SMTP, not MCP) → Generate, name `moyenhills-orders`,
   **Restricted**, only "send transactional emails". Never paste it in chat.
2. Supabase → **Integrations → Vault → Add new secret**: Name `brevo_api_key`, Secret = the key.
   (SQL alternative: `select vault.create_secret('THE-KEY', 'brevo_api_key');` — key first, name
   second.)
3. Run `admin-update-2026-10-21.sql` (or `notify.sql`).
4. Brevo → https://app.brevo.com/security/authorised_ips → **Deactivate for API keys** (leave SMTP).
5. Place a test order: ordersmoyenhills@gmail.com gets "New order #…" from MOYEN HILLS; the customer
   gets "MOYEN HILLS: we received your order #…".

If emails stop: check `net._http_response` in Supabase, Brevo transactional logs, Brevo unauthorised
IPs, and that the mail function's source has no `xkeysib` in it (it must reference the vault name).

### 8.8 Stripe (to do; full steps in README "Card payments")
1. Create a Stripe account, stay in **test mode**.
2. Run `payments.sql` last (schema → privacy → notify → payments).
3. Deploy Edge Functions `create-checkout` and `stripe-webhook` with **Verify JWT OFF**.
4. Supabase → Edge Functions → Secrets: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SITE_URL`,
   `ALLOWED_ORIGINS` (optional). Never paste keys in chat.
5. Stripe webhook URL: `https://kvykvcjwqjzaepdiwydd.supabase.co/functions/v1/stripe-webhook`.
6. Set `cardPayments: true` in `config.js`, set real `shipping_rates`, test with a test card, swap in
   the card versions of Terms §1/§2.

### 8.9 Going live (when ready)
1. Merge PR #8, then PR #2 (everything onto `main`); close PR #1.
2. Netlify: Add new site → Import from GitHub → MOYANHILLS → branch `main`; leave build command and
   publish directory empty (`netlify.toml` sets them). (Vercel alternative: framework Other, no build;
   needs Pro for commercial use.)
3. Add moyenhills.com in the host; in **Shopify → Settings → Domains → Edit DNS** set the records the
   host shows (Vercel: A @ 76.76.21.21, CNAME www cname.vercel-dns.com; Netlify: A @ 75.2.60.5 and
   the CNAME it gives).
4. Supabase Auth URL Configuration: add the live URL(s).
5. Place one real test order and a newsletter sign-up.
6. Netlify controls: stop builds = Site configuration → Build & deploy → Continuous deployment →
   Stop builds; password protection is Pro only; delete = Site configuration → General → Danger zone.

### 8.10 Brevo domain sender (to do, fixes spam)
Brevo → Senders, Domains & Dedicated IPs → Domains → Add **moyenhills.com** → add the Brevo code, 2
DKIM and DMARC records as custom records in Shopify DNS → Verify → add sender hello@moyenhills.com and
use it for the form and transactional emails.

---

## 9. Open to-dos and blockers

**Archit / Markuss to do**
1. **Rotate keys:** delete the Brevo key pasted at 02:43 (and the one that ended up as a vault name,
   if not already deleted); rotate the 21st.dev API key (pasted 3 times in the original session).
2. **Merge PR #8** (Stripe + Latvian), then run SQL in order schema → privacy → notify → payments
   (payments only if Stripe is set up). Then merge **PR #2** into `main`. Close **PR #1**.
3. **Sign the PC in to GitHub** once (Git Credential Manager) so it can pull updates.
4. **Real stock** per size (placeholder 10 × S/M/L/XL drives the "only X left" badge).
5. **Seller / legal details** for the yellow gaps in Terms and Privacy: seller name or company,
   registration number, address (can the Shopify-bill name and address be used?), VAT status,
   shipping countries and carrier (e.g. Omniva/DPD), shipping prices, who pays returns, record
   retention years (ask accountant), publish date.
6. **Shipping rates** in `shipping_rates` (currently €0).
7. **Stripe account** and setup (8.8).
8. **Brevo domain authentication** for moyenhills.com (8.10).
9. **Hosting choice** (Netlify recommended) and go-live steps (8.9). Keep the Shopify plan until at
   least 19 Nov 2026.
10. **Data processing agreements:** Supabase, Netlify/Vercel, Brevo (Gmail free has none).
11. **Latvian lawyer review** of Terms, Privacy (EN + LV) and the partnership agreement.
12. **Partnership decisions:** profit share vs SIA shares, registration, vesting, code ownership,
    account names.
13. Size measurements (chest width/length) for the Fit section.
14. After launch: consider Supabase Pro (backups) or a weekly export; a staging Supabase project.
15. Optional: Google/Apple sign-in (Apple needs a $99/yr developer account), Supabase custom SMTP for
    auth emails, translate Supabase auth emails and the Brevo DOI email to Latvian, admin tab for
    withdrawals already exists (Cancellations).

**Known blockers**
- Cloud sessions can't reach formsubmit.co, *.supabase.co directly, moyenhills.com, *.vercel.app or
  Brevo's form endpoint (proxy). The Supabase MCP connector can read and (since 02:5x) write SQL.
- Vercel connector has no access to team `archit-gajjar` (403).
- The PC can't pull from the private repo until signed in to GitHub.
- Supabase free plan pauses after ~1 week without visits.

---

## 10. Security incidents and keys to rotate

| When | What | Status |
|---|---|---|
| 19 Oct 02:39, 02:41; 20 Oct 22:30 | 21st.dev API key pasted in chat (`21st_sk_[REDACTED]`) | **Rotate** on 21st.dev |
| 21 Oct 02:43 | Brevo API key pasted in the launch thread (`xkeysib-[REDACTED]`) | Told to delete it; new restricted key made |
| 21 Oct ~02:48 | Brevo key typed into the SQL file in place of the vault name | Function line restored by Claude |
| 21 Oct ~02:52 | `vault.create_secret` arguments swapped, key stored as plain-text name | Entry deleted; key regenerated and stored via Vault UI |
| 21 Oct 01:30 | Repo was public | Made private; history had no secrets |
| 20 Oct 23:04 | Old PC python server was sharing `C:\Windows\System32` on port 8000 | Archit stopped those processes |
| OmniRoute | Default open network bind and public default password | Bound to 127.0.0.1, password cleared |

Never commit or paste: Supabase service_role/secret key, Brevo API key, Stripe secret and webhook
keys, 21st key, passwords, 2FA codes.

---

## 11. Useful links

- Online preview: https://claude.ai/artifact/8nzPHsMySrgpf5h56g5xDG
- Owner security & EU checklist: https://claude.ai/artifact/EJUjc8mNZVaenr6pBJMJGY
- Partnership agreement draft: https://claude.ai/artifact/Pt2ifSwZRra5eAEvBPbyNn
- Repo: https://github.com/vibecoder1129-crypto/MOYANHILLS (PRs: /pull/1 … /pull/11)
- Supabase SQL Editor: https://supabase.com/dashboard/project/kvykvcjwqjzaepdiwydd/sql/new
- Brevo API keys: https://app.brevo.com/settings/keys/api
- Brevo authorised IPs: https://app.brevo.com/security/authorised_ips
- Cloud environment network docs: https://code.claude.com/docs/en/cloud-environments#network-access
- Canva model photo (unused): https://www.canva.com/M/MAHYd7fGcO4
- Project files: `supabase/` (schema, privacy, notify, payments, admin-update-2026-10-21.sql),
  `lookbook/` (graded photos + before/after), `preview/` and `order-preview/` (screenshots),
  `admin/admin-preview.png`
