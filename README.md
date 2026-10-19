# MOYEN HILLS store

A one-product store for the MOYEN HILLS ART WILL TEE. Plain HTML, CSS and JavaScript, no build step.
Open `index.html` in a browser, or host the folder on GitHub Pages, Netlify or Vercel.

## Files

- `index.html`: home page (intro, wide image, the shirt, email sign-up)
- `product.html`: product page (gallery, sizes, add to cart, details)
- `styles.css`: the design
- `app.js`: cart, checkout, newsletter and the product settings
- `motion.js`: animations (uses GSAP in `vendor/`)
- `images/`: logo and product photos

## Change the price, sizes or stock

Edit `PRODUCT` at the top of `app.js`:

```js
price: 45,
soldOut: false,                          // true = whole product sold out
stock: { S: 10, M: 10, L: 10, XL: 10 },  // 0 = that size is sold out
```

When the product is sold out (`soldOut: true`, or every size at 0), every product photo turns
black and white, "SOLD OUT, DONT BE LATE" appears under the name, and the buy button is disabled.

## Orders and sign-ups (email)

The site has no server. It sends emails through [FormSubmit](https://formsubmit.co):

- **New orders** go to `markuss.suna.veid@gmail.com`, with the items, sizes, total and the buyer's
  name, email, phone and address. Reply to that email to send the buyer payment details.
- **Newsletter sign-ups** go to `moyenhills@gmail.com`.

**One-time activation:** the first time each form is used on the live site, FormSubmit emails an
activation link to that address. Click it, and from then on every order or sign-up arrives.
After activating, FormSubmit also gives you a random alias. Put that alias in `SETTINGS` in
`app.js` in place of the plain email address, so the address is not visible in the page source.

To send marketing emails to subscribers, copy the sign-ups into a newsletter tool (Mailchimp,
Brevo, MailerLite) and send from `moyenhills@gmail.com`.
