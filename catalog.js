/* MOYEN HILLS — shop catalog
 * ---------------------------------------------------------------------------
 * Everything you sell lives here: products, prices, sizes, stock and photos.
 *
 * Once Supabase is connected (config.js), you manage all of this on the admin
 * page (admin.html) instead, and the site reads it from the database. This file
 * is then only the backup the site falls back on if the database can't be reached.
 *
 * Add a product:    copy a block in `products`, give it a new `id`, change the rest.
 * Remove a product: set `active: false` (hidden but kept), or delete its block.
 * Sold out:         `soldOut: true`, or set every size's stock to 0.
 *                   The photos turn black and white with "SOLD OUT, DONT BE LATE".
 * Order on the site: products show in the order they are listed here.
 */
window.MH_CATALOG = {
  settings: {
    currency: 'EUR',
    // The orders inbox. Order and cancellation emails are sent by the database
    // (supabase/notify.sql: change 'mail_shop' there to move them).
    orderEmail: 'ordersmoyenhills@gmail.com',
    // "Join the Hills family" sign-ups go to this Brevo form (double opt-in: Brevo emails a
    // confirmation link). Brevo → Contacts → Forms → your form → Share → the form's `action` URL.
    newsletterForm: 'https://49ed994b.sibforms.com/serve/MUIFAON0Ov00jxFmR0y9YqpvB7UI9vwoO-dHGMrbQw0hvest807HNSqBDf7cKYC2Lnsx2E0ehtxAZJt8lhzreLFOUUI6hEVcTZW8dvSVsmlw9zN3jRHFIL9SFn-fW0smQPCt8F8XZ7mZtCVnN2Z3OLVZJat7-K6jdrqihA6ulO-nni44FWzjpSEEtpUO9oxAxFXEY76yM-11OFtlIQ==',
    // Only used if newsletterForm is empty: sign-ups are then emailed here.
    subscribeEmail: 'moyenhills@gmail.com',
    // Shown to buyers if an order cannot be sent.
    contactEmail: 'moyenhills@gmail.com',
  },

  products: [
    {
      id: 'art-will-tee',              // used in the link: product.html?id=art-will-tee
      name: 'ART WILL TEE',
      colour: 'White',
      price: 37,
      wasPrice: null,                  // old price, shown crossed out (e.g. 45 for a sale)
      active: true,                    // false = hidden from the shop
      featured: true,                  // the one shown on the home page
      soldOut: false,
      label: 'Limited first drop',     // small line above the name on the home page
      blurb: 'Out now.',
      description: 'Short-sleeve t-shirt with a boxy fit, including front, back & neck label custom screen printed graphics.',
      details: ['100% cotton', 'Cut-off style bottom', 'MADE IN LATVIA'],
      fit: 'Boxy, with short sleeves and a cut-off style bottom, so it sits wide and a little short.',
      note: 'Pre-made. Please allow 1–3 days for order fulfilling.',
      // The same text in Latvian, for visitors who see the site in Latvian. Leave a line out
      // (or empty) and the English shows instead.
      lv: {
        colour: 'Balta',
        label: 'Ierobežota pirmā kolekcija',
        blurb: 'Jau pieejams.',
        description: 'Plata piegriezuma t-krekls ar īsām piedurknēm un sietspiedes grafiku priekšpusē, aizmugurē un uz kakla etiķetes.',
        details: ['100% kokvilna', 'Nogriezta apakšmala', 'RAŽOTS LATVIJĀ'],
        fit: 'Plats, ar īsām piedurknēm un nogrieztu apakšmalu, tāpēc sēž brīvi un ir mazliet īsāks.',
        note: 'Jau izgatavots. Pasūtījumu sagatavojam 1–3 dienās.',
      },
      // Pieces left per size, in the order they are shown. 0 = that size is sold out.
      sizes: [
        { size: 'S', stock: 2 },
        { size: 'M', stock: 6 },
        { size: 'L', stock: 2 },
        { size: 'XL', stock: 0 },
      ],
      // The first photo is the main one; the second shows on hover in the shop.
      images: [
        { src: 'images/flat-front.jpg', srcset: 'images/flat-front-480.jpg 480w, images/flat-front-800.jpg 800w, images/flat-front.jpg 1002w', width: 1002, height: 1201, alt: 'ART WILL TEE, front, laid flat' },
        { src: 'images/flat-back.jpg', srcset: 'images/flat-back-480.jpg 480w, images/flat-back-800.jpg 800w, images/flat-back.jpg 1002w', width: 1002, height: 1054, alt: 'ART WILL TEE, back, laid flat' },
        { src: 'images/tee-front.jpg', srcset: 'images/tee-front-480.jpg 480w, images/tee-front-800.jpg 800w, images/tee-front.jpg 1200w', width: 1200, height: 1600, alt: 'Worn by a model on concrete stairs' },
        { src: 'images/front-print.jpg', srcset: 'images/front-print-480.jpg 480w, images/front-print-800.jpg 800w, images/front-print.jpg 1002w', width: 1002, height: 1201, alt: 'Close-up of the front print' },
        { src: 'images/back-print.jpg', srcset: 'images/back-print-480.jpg 480w, images/back-print-800.jpg 800w, images/back-print.jpg 1002w', width: 1002, height: 1054, alt: 'Close-up of the back print, ART WILL SAVE US ALL' },
        { src: 'images/neck-label.jpg', srcset: 'images/neck-label-480.jpg 480w, images/neck-label-800.jpg 800w, images/neck-label.jpg 1002w', width: 1002, height: 1054, alt: 'Printed neck label, 100% cotton' },
      ],
    },
  ],

  /* Promo codes for when Supabase is NOT connected. With Supabase, make codes
   * on the admin page instead (they stay private there and uses are counted).
   * Easiest: make them on admin.html in preview mode and press "Download catalog.js".
   * Codes are stored as a fingerprint so they can't be read from the page source.
   * By hand: open the site, press F12 → Console, run  await mhPromoHash('HILLS10')
   * and paste the result as `hash`. Then `percent` OR `amount` (euros off), and
   * optionally `minSubtotal` (euros), `expires` ('2026-12-31', last valid day),
   * `active: false` to switch it off, and a `note` for yourself.
   */
  promoCodes: [
    // { hash: '…', percent: 10, note: 'HILLS10 — friends of the brand' },
  ],
};
