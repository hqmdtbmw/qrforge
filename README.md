# QRForge

A free, open source QR code studio. Make branded QR codes, track every scan, and keep your data yours.

I built this because every QR tool I tried was either ugly, locked behind a paywall, or kept my data. QRForge does the job properly: styled codes, dynamic links you can change after printing, bulk creation, scan analytics, teams and organisations, and a social profile studio. No account needed to try it.

## What it does

- Styled QR codes: colours, shapes, logos, frames, and templates. Export as PNG, SVG or PDF. The SVG download is a proper standalone file now, with the xml declaration and namespace included, and it waits for the code to finish redrawing before saving, so turning on a transparent background no longer hands you a blank file. That one bit me: the old download grabbed the picture before the redraw had finished.
- Dynamic QR codes: change the destination any time after printing, without reprinting.
- Every kind of code: URL, WiFi, vCard, text, email, SMS, app store links, and more.
- Bulk creation: upload a list, get a zip of codes. A CSV second column names each code, and so does typing a name after a comma on a pasted line, like `https://example.com, My Site`. The names stick to their lines even if you edit the list or move lines around.
- Scan analytics: scans over time, countries, devices, browsers, and campaigns.
- Social Studio: a shareable profile page with your links and a vCard download.
- Teams and organisations: roles, shared folders, and shared analytics.
- AI help (optional): Gemini suggests content for vCards and campaigns when you add a key.
- Works offline as a PWA once installed.

## Run it

You need Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:5173. The dev server runs the Express backend with Vite.

To build for production:

```bash
npm run build
npm run preview
```

## Run it without any setup

Clone it, install, run it. That is all. With no Firebase config the app runs in local demo mode: the full studio works and your data stays in your browser. Add your own Firebase project when you want accounts, cloud storage and real analytics.

## Configure it

Copy `.env.example` to `.env.local` and fill in what you use. Every value is optional except the Firebase ones, and those are only needed if you want the cloud backend.

| Variable | What it is for |
| --- | --- |
| `VITE_FIREBASE_API_KEY` | Your Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Your Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Your Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | Your Firebase app ID |
| `VITE_FIREBASE_DATABASE_ID` | Named Firestore database, if you use one |
| `VITE_FIREBASE_VAPID_KEY` | Web push key for notifications |
| `FIREBASE_SERVICE_ACCOUNT` | Minified service account JSON, for the server only |
| `GEMINI_API_KEY` | Gemini key, for the AI features |
| `VITE_PAYSTACK_PUBLIC_KEY` | Paystack public key, for payments |
| `PAYSTACK_SECRET_KEY` | Paystack secret key, server side only |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | SMS, if you use it |
| `RESEND_API_KEY` | Email, if you use it |

Never commit `.env.local`. It is in `.gitignore` for a reason. There is no config file with secrets in this repo, and there never should be.

## Deploy it

The app ships with a `vercel.json`. Connect the repo to Vercel, set the same environment variables there, and deploy. The Express server also runs as a Vercel function through `api/index.ts`.

## What it can't do yet

- Payments only work with Paystack, and only when you add your own keys.
- Push notifications need Firebase Cloud Messaging configured.
- The Python analytics service under `api/python` is optional. The app works without it.
- Export is PNG, SVG and PDF. Print layouts are basic.
- The test suite in `test/` covers the permission rules, the fingerprint hash, the image sizing maths, the logo checks, type, size, dimensions and shape, including reading an SVG logo's size from the file itself, from its width and height or its viewBox, instead of trusting the size the browser guesses when it loads one, the small helpers in `src/lib`, the AI prompt building and response checks, the bulk forge list, pasted lines and CSV files, which rows are links and which are plain text, repeats, blank lines and the 500 row cap, and how names from a CSV or typed after a comma stay with their line when the list is edited or reordered, and the QR payloads: every type from plain text and WiFi to vCard and the bank codes, SEPA, UPI, Pix, PayNow and PromptPay, with the CRC checked. WiFi names and passwords, vCard fields and event fields escape the characters that would split the payload apart, so a semicolon in a password or a comma in a company name still scans right, and an open network leaves the password field out. Run it with `npm test`. I also cover `optimizeImage` now, with stand-in browser bits for the file reader, the image and the canvas, so the resize, the draw and the jpeg call are all checked, along with every way it can fail. The SVG download helper is covered too: the file gets its declaration and namespace, the shapes survive untouched, and a blank svg is refused instead of being saved. I check the suggestion calls now, the request each one builds and what it does with the reply, but the live Gemini call itself still needs a network call and a key.

## Contributing

See CONTRIBUTING.md. Short version: fork it, make the change, run the typecheck and the build, open a pull request. Every change gets reviewed by a human.

## License

MIT. See LICENSE.
