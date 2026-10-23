/* MOYEN HILLS — Latvian / English
 * ---------------------------------------------------------------------------
 * The pages are written in English. boot.js picks the language (a ?lang= link, the
 * visitor's choice on the LV / EN switch, or else the device language); when it is
 * Latvian, this file swaps every piece of English on the page for its Latvian below.
 *
 * Change a translation: find the English on the left and edit the Latvian on the right.
 * New text on a page: add a line here with the exact English (spaces don't matter).
 * Anything without a line here simply stays in English.
 * Longer paragraphs with links, and the legal pages, are written out in both languages
 * in the page itself (data-lang="en" / data-lang="lv").
 * Products: their Latvian is in catalog.js (`lv: { … }`) or on the admin page.
 * In the scripts, mhT('English {name}', { name }) gives the text in the page's language.
 */
(() => {
  const lang = document.documentElement.lang === 'lv' ? 'lv' : 'en';

  const LV = {
    // Page titles and descriptions
    'MOYEN HILLS — ART WILL TEE, made in Latvia': 'MOYEN HILLS — ART WILL TEE, ražots Latvijā',
    'MOYEN HILLS. ART WILL TEE: boxy cut-off t-shirt, 100% cotton, screen printed front, back and neck label. Made in Latvia.':
      'MOYEN HILLS. ART WILL TEE: plats t-krekls ar nogrieztu apakšmalu, 100% kokvilna, sietspiede priekšpusē, aizmugurē un uz kakla etiķetes. Ražots Latvijā.',
    'Shop — MOYEN HILLS': 'Veikals — MOYEN HILLS',
    'Account — MOYEN HILLS': 'Konts — MOYEN HILLS',
    'Terms of sale — MOYEN HILLS': 'Pārdošanas noteikumi — MOYEN HILLS',
    'Terms of sale for MOYEN HILLS.': 'MOYEN HILLS pārdošanas noteikumi.',
    'Privacy policy — MOYEN HILLS': 'Privātuma politika — MOYEN HILLS',
    'Privacy policy for MOYEN HILLS.': 'MOYEN HILLS privātuma politika.',
    'Cancel an order — MOYEN HILLS': 'Atcelt pasūtījumu — MOYEN HILLS',
    'Withdraw from a MOYEN HILLS order within 14 days.': 'Atkāpies no MOYEN HILLS pasūtījuma 14 dienu laikā.',

    // Header, menu, footer (every page)
    'Art will tee — First drop': 'Art will tee — pirmā kolekcija',
    'ART WILL TEE — OUT NOW': 'ART WILL TEE — JAU PIEEJAMS',
    '· Made in Latvia · Ships in 1–3 days': '· Ražots Latvijā · Nosūtām 1–3 dienās',
    'Made in Latvia · Ships in 1–3 days': 'Ražots Latvijā · Nosūtām 1–3 dienās',
    'Open menu': 'Atvērt izvēlni',
    'Close menu': 'Aizvērt izvēlni',
    'Menu': 'Izvēlne',
    'Language': 'Valoda',
    'MOYEN HILLS, back to top': 'MOYEN HILLS, uz lapas sākumu',
    'MOYEN HILLS, home': 'MOYEN HILLS, sākumlapa',
    'Sign in or create an account': 'Pieslēgties vai izveidot kontu',
    'Your account': 'Tavs konts',
    'Open cart': 'Atvērt grozu',
    'Open cart, {n} item': 'Atvērt grozu, preces: {n}',
    'Open cart, {n} items': 'Atvērt grozu, preces: {n}',
    'Home': 'Sākums',
    'Shop': 'Veikals',
    'Account': 'Konts',
    'Contact': 'Kontakti',
    'Terms': 'Noteikumi',
    'Privacy': 'Privātums',
    'Cookies': 'Sīkdatnes',
    'Cancel an order': 'Atcelt pasūtījumu',
    'Site': 'Vietne',
    'Designed & built by Archit Gajjar': 'Dizains un izstrāde: Archit Gajjar',
    'Join the Hills family': 'Pievienojies Hills ģimenei',
    'New drops, news and updates, straight to your inbox.': 'Jaunas kolekcijas, ziņas un jaunumi tieši tavā e-pastā.',
    'email address': 'e-pasta adrese',
    'JOIN': 'PIEVIENOTIES',
    'By joining you agree to get emails about MOYEN HILLS drops and news. Unsubscribe any time from any email.':
      'Pievienojoties tu piekrīti saņemt e-pastus par MOYEN HILLS kolekcijām un jaunumiem. Atrakstīties vari jebkurā brīdī, izmantojot saiti jebkurā e-pastā.',
    'Privacy policy': 'Privātuma politika',
    'Enter a valid email address.': 'Ievadi derīgu e-pasta adresi.',
    'Joining…': 'Pievienojam…',
    'Almost there: check your inbox and tap the link to confirm. Didn’t get it within a few minutes? Check your spam or promotions folder.':
      'Gandrīz gatavs: atver savu e-pastu un apstiprini, uzspiežot saiti. Nav pienācis dažu minūšu laikā? Ieskaties mēstuļu vai reklāmas mapē.',
    'That did not go through. Check the address and try again.': 'Neizdevās. Pārbaudi adresi un mēģini vēlreiz.',
    'Sign-ups open soon.': 'Pieteikšanās drīzumā.',
    'Cookie notice': 'Paziņojums par sīkdatnēm',

    // Home page
    'Two people from behind at night wearing the ART WILL TEE, ART WILL SAVE US ALL printed on the back':
      'Divi cilvēki naktī no mugurpuses ART WILL TEE kreklos, uz muguras uzraksts ART WILL SAVE US ALL',
    'OUT NOW': 'JAU PIEEJAMS',
    'Shop now': 'Uz veikalu',
    '{name}, all photos and details': '{name}: visi foto un detaļas',
    'ART WILL TEE, all photos and details': 'ART WILL TEE: visi foto un detaļas',
    'Front / back': 'Priekša / mugura',
    'SOLD OUT, DONT BE LATE': 'IZPĀRDOTS, NENOKAVĒ',
    'View the piece': 'Apskatīt',
    'About MOYEN HILLS': 'Par MOYEN HILLS',
    'MOYEN HILLS is about conquering your everyday struggles and problems, to get over whats holding you back on the daily and to be free from your everyday worries.':
      'MOYEN HILLS ir par to, kā pārvarēt ikdienas grūtības un problēmas, tikt pāri tam, kas tevi ik dienu bremzē, un būt brīvam no ikdienas raizēm.',
    'Through our art we encourage you to not give up on your true desires in life.':
      'Ar savu mākslu mēs tevi iedrošinām nepadoties un neatteikties no savām patiesajām vēlmēm dzīvē.',
    'However HILLS FAMILY is everyone who is a part of MOYEN HILLS, it should feel like a community. Our goal is to create organised events around the world for HILLS FAMILY to meet each other and support each other through us.':
      'Savukārt HILLS FAMILY ir ikviens, kurš ir daļa no MOYEN HILLS, un tai jājūtas kā kopienai. Mūsu mērķis ir rīkot pasākumus visā pasaulē, kur HILLS FAMILY var satikties un atbalstīt cits citu caur mums.',
    'Open the lookbook': 'Atvērt lookbook',
    'Model on concrete stairs wearing the ART WILL TEE': 'Modelis ART WILL TEE kreklā uz betona kāpnēm',

    // The ART WILL TEE in catalog.js (photo descriptions; product text is in catalog.js `lv`)
    'Limited first drop': 'Ierobežota pirmā kolekcija',
    'The Hills family signed up early for this one. Pre-made in small numbers, screen printed on three sides, made in Latvia. When it’s gone, it’s gone.':
      'Hills ģimene uz šo pieteicās jau laikus. Iepriekš izgatavots nelielā skaitā, sietspiede no trim pusēm, ražots Latvijā. Kad beigsies, tad beigsies.',
    'ART WILL TEE, front, laid flat': 'ART WILL TEE, priekšpuse',
    'ART WILL TEE, back, laid flat': 'ART WILL TEE, aizmugure',
    'Worn by a model on concrete stairs': 'Modelis uz betona kāpnēm',
    'Close-up of the front print': 'Priekšpuses apdruka tuvplānā',
    'Close-up of the back print, ART WILL SAVE US ALL': 'Aizmugures apdruka tuvplānā, ART WILL SAVE US ALL',
    'Printed neck label, 100% cotton': 'Apdrukāta kakla etiķete, 100% kokvilna',
    'Short-sleeve t-shirt with a boxy fit, including front, back & neck label custom screen printed graphics.':
      'Plata piegriezuma t-krekls ar īsām piedurknēm un sietspiedes grafiku priekšpusē, aizmugurē un uz kakla etiķetes.',
    '100% cotton': '100% kokvilna',
    'Cut-off style bottom': 'Nogriezta apakšmala',
    'MADE IN LATVIA': 'RAŽOTS LATVIJĀ',
    'Boxy, with short sleeves and a cut-off style bottom, so it sits wide and a little short.':
      'Plats, ar īsām piedurknēm un nogrieztu apakšmalu, tāpēc sēž brīvi un ir mazliet īsāks.',
    'Pre-made. Please allow 1–3 days for order fulfilling.': 'Jau izgatavots. Pasūtījumu sagatavojam 1–3 dienās.',

    // Shop and product page
    'New pieces are on the way. Join the Hills family below to hear first.': 'Jaunas lietas jau ceļā. Pievienojies Hills ģimenei zemāk, lai uzzinātu pirms citiem.',
    'This piece is gone': 'Šīs lietas vairs nav',
    'It may have sold out or been taken down.': 'Tā ir izpārdota vai noņemta no veikala.',
    'Back to the shop': 'Atpakaļ uz veikalu',
    'Product photos': 'Produkta foto',
    '{i} of {n}': '{i}. no {n}',
    'Previous photo': 'Iepriekšējais foto',
    'Next photo': 'Nākamais foto',
    'Show photo {n}': 'Rādīt {n}. foto',
    'Size': 'Izmērs',
    'Add to cart': 'Pievienot grozam',
    'Sold out': 'Izpārdots',
    'Details': 'Detaļas',
    'Fit': 'Piegriezums',
    'For exact measurements, email': 'Precīzus izmērus jautā, rakstot uz',
    'before you order.': 'pirms pasūtīšanas.',
    'Shipping': 'Piegāde',
    'Free delivery in Latvia. We send your order within 1–3 days and email you the tracking number when it is on its way.':
      'Bezmaksas piegāde Latvijā. Pasūtījumu nosūtām 1–3 dienu laikā, un, kad tas būs ceļā, e-pastā atsūtīsim sūtījuma numuru.',
    'Payment': 'Apmaksa',
    'Pay by card in the cart, on Stripe’s secure payment page. The price already includes delivery.':
      'Maksā ar karti grozā, Stripe drošajā maksājumu lapā. Cenā jau ir iekļauta piegāde.',
    'Almost gone — only {n} left': 'Gandrīz izpārdots — atlikumā tikai {n} gab.',
    'Limited stock — only {n} left': 'Ierobežots daudzums — atlikumā tikai {n} gab.',
    'Only {n} left in {size}': 'Izmērā {size} atlikumā tikai {n} gab.',
    '{size} is sold out': 'Izmērs {size} ir izpārdots',
    '{size} is sold out.': 'Izmērs {size} ir izpārdots.',
    'No more {size} left.': 'Izmērā {size} vairāk nav.',
    'Choose a size first.': 'Vispirms izvēlies izmēru.',
    'Added to cart: {name}, size {size}.': 'Pievienots grozam: {name}, izmērs {size}.',
    'Added to cart': 'Pievienots grozam',
    'Was {price}': 'Iepriekš {price}',

    // Lookbook
    'Lookbook — First drop': 'Lookbook — pirmā kolekcija',
    '— the back print': '— aizmugures apdruka',
    '— the front print': '— priekšpuses apdruka',
    '— handwritten on the front': '— ar roku rakstīts priekšpusē',
    'Two skaters in golden light at an indoor skatepark, one showing the ART WILL SAVE US ALL back print, one the MOYEN HILLS front':
      'Divi skeiteri zeltainā gaismā iekštelpu skeitparkā, vienam redzama aizmugures apdruka ART WILL SAVE US ALL, otram MOYEN HILLS priekšpuse',
    'Back and front, side by side.': 'Aizmugure un priekša, blakus.',
    'Two friends at the skatepark in the ART WILL TEE, one crouching with a phone, one holding a skateboard':
      'Divi draugi skeitparkā ART WILL TEE kreklos, viens notupies ar telefonu, otrs ar skeitbordu rokās',
    'Front — wordmark and portrait.': 'Priekša — logotips un portrets.',
    'Model in sunglasses wearing the ART WILL TEE next to a lit vending machine at night': 'Modelis saulesbrillēs ART WILL TEE kreklā naktī pie izgaismota tirdzniecības automāta',
    'After dark.': 'Pēc tumsas.',
    'The ART WILL SAVE US ALL back print, walking down a dim corridor': 'Aizmugures apdruka ART WILL SAVE US ALL, ejot pa krēslainu gaiteni',
    'Back — halftone print.': 'Aizmugure — rastra apdruka.',
    '“Keep climbing. The view from the top is worth it.”': '“Turpini kāpt. Skats no virsotnes ir tā vērts.”',
    'SHOP NOW': 'UZ VEIKALU',
    'Visit the shop': 'Uz veikalu',

    // Cart and checkout
    'Cart': 'Grozs',
    'Close': 'Aizvērt',
    'Your cart is empty.': 'Tavs grozs ir tukšs.',
    'Subtotal': 'Starpsumma',
    'Promo code': 'Atlaides kods',
    'Apply': 'Izmantot',
    'Promo': 'Atlaide',
    'Remove': 'Noņemt',
    'Total': 'Kopā',
    'One less': 'Par vienu mazāk',
    'One more': 'Par vienu vairāk',
    'Delivery is added when we confirm your order by email.': 'Piegādes cenu pievienosim, kad apstiprināsim pasūtījumu e-pastā.',
    'Your details': 'Tava informācija',
    'Full name': 'Vārds, uzvārds',
    'Email': 'E-pasts',
    'Country code': 'Valsts kods',
    'Country code, for example +371': 'Valsts kods, piemēram, +371',
    'Phone': 'Tālrunis',
    'Numbers only, for example 20 000 000': 'Tikai cipari, piemēram, 20 000 000',
    'Choose your country code or type it yourself.': 'Izvēlies valsts kodu vai ieraksti to pats.',
    'Address': 'Adrese',
    'City': 'Pilsēta',
    'Postcode': 'Pasta indekss',
    'Country': 'Valsts',
    'Note (optional)': 'Piezīme (nav obligāti)',
    'Signed in — this order will be saved to your account.': 'Tu esi pieslēdzies — pasūtījums tiks saglabāts tavā kontā.',
    'Send order request': 'Nosūtīt pasūtījumu',
    'Order received': 'Pasūtījums saņemts',
    'Keep looking': 'Turpināt skatīties',
    'Checking…': 'Pārbaudām…',
    'Enter a promo code.': 'Ievadi atlaides kodu.',
    'That code is not valid.': 'Šis kods nav derīgs.',
    'That code has expired.': 'Šī koda derīgums ir beidzies.',
    'That code has been used up.': 'Šis kods jau ir izlietots.',
    'That code needs an order of at least {amount}.': 'Šim kodam pasūtījumam jābūt vismaz {amount}.',
    'Too many tries. Please wait a few minutes.': 'Pārāk daudz mēģinājumu. Lūdzu, pagaidi dažas minūtes.',
    '{p}% off': '−{p}%',
    '{amount} off': '−{amount}',
    'Code applied: you save {amount}.': 'Kods izmantots: tu ietaupi {amount}.',
    'Could not check the code. Please try again.': 'Neizdevās pārbaudīt kodu. Lūdzu, mēģini vēlreiz.',
    'The code no longer applies.': 'Kods šim grozam vairs nav spēkā.',
    'Sending your order…': 'Sūtām pasūtījumu…',
    'The order could not be sent. Please try again, or <a href="{mail}">email the order to {email}</a>.':
      'Pasūtījumu neizdevās nosūtīt. Lūdzu, mēģini vēlreiz vai <a href="{mail}">nosūti pasūtījumu uz {email}</a>.',
    // Card payments (config.js cardPayments)
    'Continue to payment': 'Turpināt uz apmaksu',
    'Prices are in euro and include delivery in Latvia. You see the full total on the next page before you pay. Card payments are handled by Stripe. By ordering you accept our <a href="/terms">Terms of sale</a>. How we use your details: <a href="/privacy">Privacy policy</a>.':
      'Cenas norādītas eiro, un piegāde Latvijā ir iekļauta. Visu kopsummu redzēsi nākamajā lapā, pirms maksā. Kartes maksājumus apstrādā Stripe. Pasūtot tu piekrīti mūsu <a href="/terms">pārdošanas noteikumiem</a>. Kā izmantojam tavus datus: <a href="/privacy">privātuma politika</a>.',
    'Thank you, it’s paid': 'Paldies, apmaksāts',
    'Order #{id} is paid. Stripe emails you a receipt, and we email you when it ships. Changed your mind? You can <a href="/withdraw">cancel</a> up to 14 days after it arrives.':
      'Pasūtījums #{id} ir apmaksāts. Stripe tev atsūtīs čeku, un mēs tev rakstīsim, kad pasūtījums būs nosūtīts. Pārdomāji? Pasūtījumu vari <a href="/withdraw">atcelt</a> 14 dienu laikā pēc saņemšanas.',
    'Payment not finished': 'Apmaksa nav pabeigta',
    'Your order is kept for about 30 minutes, then it cancels itself and nothing is charged.': 'Tavu pasūtījumu paturēsim apmēram 30 minūtes, tad tas atcelsies pats un nauda netiks iekasēta.',
    'Pay now': 'Maksāt tagad',
    'This order is already paid. Stripe emailed you a receipt.': 'Šis pasūtījums jau ir apmaksāts. Stripe tev nosūtīja čeku e-pastā.',
    'Saving your order…': 'Saglabājam pasūtījumu…',
    'Opening the payment page…': 'Atveram apmaksas lapu…',
    'Your order is saved: press the button again to pay.': 'Tavs pasūtījums ir saglabāts: spied pogu vēlreiz, lai samaksātu.',
    'Orders can’t be saved right now.': 'Pašlaik pasūtījumus nevar saglabāt.',
    'The payment page could not be opened. Please try again.': 'Apmaksas lapu neizdevās atvērt. Lūdzu, mēģini vēlreiz.',
    'The payment page could not be opened. Please try again in a moment.': 'Apmaksas lapu neizdevās atvērt. Lūdzu, pēc brīža mēģini vēlreiz.',
    'Card payments are not set up yet.': 'Kartes maksājumi vēl nav ieslēgti.',
    'Could not load the order. Please try again.': 'Neizdevās ielādēt pasūtījumu. Lūdzu, mēģini vēlreiz.',
    'Order not found.': 'Pasūtījums nav atrasts.',
    'This order has expired and its pieces went back on sale. Please order again.': 'Šī pasūtījuma derīgums ir beidzies, un preces atkal ir pārdošanā. Lūdzu, pasūti vēlreiz.',
    'This order can’t be paid by card. Please email us.': 'Šo pasūtījumu nevar apmaksāt ar karti. Lūdzu, raksti mums.',
    'Something went wrong with the price. Please email us.': 'Kaut kas nogāja greizi ar cenu. Lūdzu, raksti mums.',
    // Messages from the database when an order is not accepted
    'Too many orders in a short time. Please wait a few minutes or email us.': 'Pārāk daudz pasūtījumu īsā laikā. Lūdzu, pagaidi dažas minūtes vai raksti mums.',
    'The order is empty or too big.': 'Pasūtījums ir tukšs vai pārāk liels.',
    'That product is no longer available.': 'Šī prece vairs nav pieejama.',
    '{name} in {size} is sold out.': '{name} izmērā {size} ir izpārdots.',
    'Please enter your name.': 'Lūdzu, ievadi savu vārdu.',
    'Please enter a valid email address.': 'Lūdzu, ievadi derīgu e-pasta adresi.',
    'Please enter your delivery address.': 'Lūdzu, ievadi piegādes adresi.',
    'Please check your phone number.': 'Lūdzu, pārbaudi tālruņa numuru.',
    'Sorry, we don’t deliver to {country} yet. Please email us.': 'Diemžēl uz {country} vēl nepiegādājam. Lūdzu, raksti mums.',
    'Too many requests. Please wait a few minutes or email us.': 'Pārāk daudz pieprasījumu. Lūdzu, pagaidi dažas minūtes vai raksti mums.',

    // Account
    'Customer accounts are coming soon. You can still order as a guest from the cart.': 'Klientu konti būs pieejami drīzumā. Pasūtīt vari arī kā viesis, no groza.',
    'Sign in': 'Pieslēgties',
    'See your orders and keep your delivery details saved for next time.': 'Redzi savus pasūtījumus un saglabā piegādes datus nākamajai reizei.',
    'Continue with Google': 'Turpināt ar Google',
    'Continue with Apple': 'Turpināt ar Apple',
    'or with email': 'vai ar e-pastu',
    'Password': 'Parole',
    'At least 12 characters, with letters and numbers. A few random words work well.': 'Vismaz 12 rakstzīmes, ar burtiem un cipariem. Labi der daži nejauši vārdi.',
    'Forgot password?': 'Aizmirsi paroli?',
    'New here?': 'Esi šeit pirmo reizi?',
    'Already have an account?': 'Jau ir konts?',
    'Create an account': 'Izveidot kontu',
    'Create account': 'Izveidot kontu',
    'New password': 'Jauna parole',
    'Save password': 'Saglabāt paroli',
    'Sign out': 'Iziet',
    'Your orders': 'Tavi pasūtījumi',
    'Save details': 'Saglabāt',
    'Your data': 'Tavi dati',
    'Download a copy of everything we keep on your account, or delete your account. To cancel an order within 14 days of delivery, use':
      'Lejupielādē visu, ko glabājam tavā kontā, vai izdzēs savu kontu. Lai atceltu pasūtījumu 14 dienu laikā pēc piegādes, izmanto lapu',
    'Download my data': 'Lejupielādēt manus datus',
    'Delete my account': 'Dzēst manu kontu',
    'This deletes your account, saved details and sign-in for good. Orders stay in our records only as long as accounting law requires, no longer linked to an account.':
      'Tas neatgriezeniski izdzēsīs tavu kontu, saglabātos datus un pieslēgšanos. Pasūtījumi mūsu uzskaitē paliek tikai tik ilgi, cik to prasa grāmatvedības likums, un vairs nav saistīti ar kontu.',
    'Type DELETE to confirm': 'Lai apstiprinātu, ieraksti DELETE',
    'Delete my account for good': 'Dzēst kontu neatgriezeniski',
    'Hi, {name}': 'Sveiki, {name}',
    'Loading your orders…': 'Ielādējam tavus pasūtījumus…',
    'Could not load your orders.': 'Neizdevās ielādēt tavus pasūtījumus.',
    'No orders yet.': 'Pasūtījumu vēl nav.',
    'Order #{id}': 'Pasūtījums #{id}',
    'size {size}': 'izmērs {size}',
    'received': 'saņemts',
    'paid': 'apmaksāts',
    'shipped': 'nosūtīts',
    'delivered': 'piegādāts',
    'Shipped {date}': 'Nosūtīts {date}',
    'Delivered {date}': 'Piegādāts {date}',
    'Parcel': 'Sūtījums',
    'Track your parcel': 'Sekot sūtījumam',
    'cancelled': 'atcelts',
    'Redirecting…': 'Pārvirzām…',
    'Creating your account…': 'Veidojam kontu…',
    'Signing in…': 'Pieslēdzamies…',
    'Check your inbox and tap the link to confirm your email. This page signs you in by itself once you have confirmed, even if you open the link on your phone.': 'Atver savu e-pastu un apstiprini adresi, uzspiežot saiti. Šī lapa tevi pieslēgs pati, tiklīdz būsi apstiprinājis, pat ja saiti atver telefonā.',
    'Type your email above first, then tap “Forgot password”.': 'Vispirms augstāk ieraksti savu e-pastu, tad spied “Aizmirsi paroli?”.',
    'We sent you a link to choose a new password.': 'Nosūtījām tev saiti jaunas paroles izvēlei.',
    'Saving…': 'Saglabājam…',
    'Saved. These details will fill in at checkout.': 'Saglabāts. Šie dati automātiski aizpildīsies, kad pasūtīsi.',
    'Preparing your data…': 'Sagatavojam tavus datus…',
    'Could not prepare your data.': 'Neizdevās sagatavot tavus datus.',
    'Downloaded.': 'Lejupielādēts.',
    'Type DELETE in capitals to confirm.': 'Lai apstiprinātu, ieraksti DELETE ar lielajiem burtiem.',
    'Deleting your account…': 'Dzēšam tavu kontu…',
    'Could not delete your account.': 'Neizdevās izdzēst tavu kontu.',
    'Email us and we will do it for you.': 'Raksti mums, un mēs to izdarīsim tavā vietā.',
    'Your account has been deleted.': 'Tavs konts ir izdzēsts.',
    'Please sign in first.': 'Lūdzu, vispirms pieslēdzies.',
    // Sign-in messages from Supabase
    'Invalid login credentials': 'Nepareizs e-pasts vai parole.',
    'This email already has an account. Sign in with your password, or tap “Forgot password”.': 'Šim e-pastam jau ir konts. Pieslēdzies ar savu paroli vai spied “Aizmirsi paroli?”.',
    'Email not confirmed': 'E-pasts vēl nav apstiprināts. Atver saiti, ko tev nosūtījām.',
    'User already registered': 'Šis e-pasts jau ir reģistrēts. Pieslēdzies vai atjauno paroli.',
    'Password should be at least 12 characters.': 'Parolei jābūt vismaz 12 rakstzīmes garai.',
    'Unable to validate email address: invalid format': 'Nederīgs e-pasta adreses formāts.',
    'For security purposes, you can only request this after 60 seconds.': 'Drošības nolūkos to var pieprasīt tikai pēc 60 sekundēm.',
    'Email rate limit exceeded': 'Nosūtīts pārāk daudz e-pastu. Lūdzu, pamēģini vēlāk.',
    'New password should be different from the old password.': 'Jaunajai parolei jāatšķiras no vecās.',

    // Cancel an order (withdraw.html)
    'Withdraw from contract here': 'Atkāpties no līguma šeit',
    'Email used for the order': 'Pasūtījumā norādītais e-pasts',
    'Order number': 'Pasūtījuma numurs',
    '(from your confirmation email, if you have it)': '(no apstiprinājuma e-pasta, ja tev tāds ir)',
    'Date you ordered or received it': 'Pasūtīšanas vai saņemšanas datums',
    '(optional)': '(nav obligāti)',
    'What you are cancelling': 'Ko vēlies atcelt',
    '(leave empty for the whole order)': '(atstāj tukšu, ja visu pasūtījumu)',
    'Continue': 'Turpināt',
    'Check and confirm': 'Pārbaudi un apstiprini',
    'I hereby give notice that I withdraw from my contract for the sale of the following goods:': 'Ar šo paziņoju, ka atkāpjos no līguma par šādu preču pirkumu:',
    'Confirm withdrawal': 'Apstiprināt atkāpšanos',
    'Change details': 'Labot datus',
    'Withdrawal received': 'Atkāpšanās saņemta',
    'Prefer email or post?': 'Ērtāk ar e-pastu vai pastu?',
    'Name': 'Vārds',
    'Ordered / received on': 'Pasūtīts / saņemts',
    'Items': 'Preces',
    'Not given': 'Nav norādīts',
    'The whole order': 'Viss pasūtījums',
    'Sending…': 'Sūtām…',
    'This could not be sent. Please ': 'To neizdevās nosūtīt. Lūdzu, ',
    'email it to {email}': 'nosūti to uz {email}',
    ' — your notice is already written out.': ' — tavs paziņojums jau ir uzrakstīts.',
    'We received your withdrawal on {stamp}. A confirmation is on its way to {email}. Keep this page or take a screenshot as your record too.':
      'Tavu atkāpšanos saņēmām {stamp}. Apstiprinājums ir ceļā uz {email}. Saglabā arī šo lapu vai ekrānuzņēmumu kā apliecinājumu.',
  };

  const dict = lang === 'lv' ? LV : {};
  const norm = (s) => String(s).replace(/\s+/g, ' ').trim();
  const lookup = new Map(Object.entries(dict).map(([en, lv]) => [norm(en), lv]));

  /* The text in the page's language. {name} in the text is filled from vars. */
  function t(en, vars) {
    let s = lookup.get(norm(en)) ?? en;
    if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return s;
  }

  /* A message from the database or the payment server, some with a name or amount inside */
  const PATTERNS = [
    [/^(.+) in (\S+) is sold out\.$/, '{name} in {size} is sold out.', ['name', 'size']],
    [/^That code needs an order of at least (€[\d.,]+)\.$/, 'That code needs an order of at least {amount}.', ['amount']],
    [/^([\d.,]+)% off$/, '{p}% off', ['p']],
    [/^(€[\d.,]+) off$/, '{amount} off', ['amount']],
    [/^Sorry, we don’t deliver to (.+) yet\. Please email us\.$/, 'Sorry, we don’t deliver to {country} yet. Please email us.', ['country']],
  ];
  function tMessage(msg) {
    const s = norm(msg || '');
    if (lookup.has(s)) return lookup.get(s);
    for (const [re, key, names] of PATTERNS) {
      const m = s.match(re);
      if (m) return t(key, Object.fromEntries(names.map((k, i) => [k, m[i + 1]])));
    }
    return msg;
  }

  /* Translate everything under root: text, and the attributes people see or hear */
  const ATTRS = ['aria-label', 'placeholder', 'title', 'alt'];
  const SKIP = 'script, style, textarea, [data-lang], [translate="no"]';
  function translate(root = document.body) {
    if (lang === 'en' || !root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.parentElement?.closest(SKIP) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    });
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const key = norm(n.nodeValue);
      if (!key || !lookup.has(key)) continue;
      const [, before, , after] = n.nodeValue.match(/^(\s*)([\s\S]*?)(\s*)$/);
      n.nodeValue = before + lookup.get(key) + after;
    }
    const els = root.querySelectorAll(ATTRS.map((a) => `[${a}]`).join(','));
    for (const el of [root, ...els]) {
      if (!el.getAttribute || el.closest(SKIP)) continue;
      for (const a of ATTRS) {
        const v = el.getAttribute(a);
        if (v && lookup.has(norm(v))) el.setAttribute(a, lookup.get(norm(v)));
      }
    }
  }

  /* The LV / EN switch: remember the choice and reload in that language */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-set-lang]');
    // A click on the globe or the pill around the letters switches to the other language
    const pill = !a && e.target.closest('.langs');
    if (!a && !pill) return;
    e.preventDefault();
    let next = pill ? (lang === 'lv' ? 'en' : 'lv') : a.dataset.setLang;
    // On phones only the current language shows: tapping it switches to the other one
    if (a && next === lang && !a.parentElement.querySelector(`[data-set-lang]:not([data-set-lang="${lang}"])`)?.offsetParent) next = lang === 'lv' ? 'en' : 'lv';
    const url = new URL(location.href);
    url.searchParams.delete('lang');
    try { localStorage.setItem('mh-lang', next); } catch { url.searchParams.set('lang', next); /* no storage: keep it in the link */ }
    if (next === lang && url.href === location.href) return;
    if (url.href === location.href) location.reload(); else location.assign(url.href);
  });

  // Translate the page now (this file runs at the end of <body>, before the shop scripts).
  // Text written out in both languages: keep only this one (so links like terms.html#withdrawal
  // find the visible copy).
  document.querySelectorAll(`[data-lang]:not([data-lang="${lang}"])`).forEach((el) => el.remove());
  if (lang === 'lv') {
    document.title = t(document.title);
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.content = t(desc.content);
    translate(document.body);
  }
  document.querySelectorAll('[data-set-lang]').forEach((a) => {
    a.setAttribute('aria-current', String(a.dataset.setLang === lang));
  });
  document.documentElement.classList.remove('i18n-wait');

  window.mhLang = lang;
  window.mhLocale = lang === 'lv' ? 'lv-LV' : 'en-GB';
  window.mhT = t;
  window.mhTMessage = tMessage;
  window.mhTranslate = translate;
})();
