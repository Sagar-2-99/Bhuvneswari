# SSS Foundation — Admin Access Control (standalone site)

A static admin dashboard for approving/denying which mobile numbers may use
the SSS Foundation membership app. Hosted independently on GitHub Pages,
talking to the **same Google Apps Script backend** as the main form and the
Flutter app — no separate backend needed.

```
sss-admin/
├── index.html
├── style.css
├── script.js
├── config.js       ← paste your Apps Script Web App URL here (same one as the main form)
└── README.md
```

## Setup

1. **Backend**: make sure your Apps Script `Code.gs` is the latest version
   (the one with `adminGetStatus`, `adminSendClaimOtp`, `adminClaim`,
   `adminSendResetOtp`, `adminResetPassword`, `adminLogin`,
   `adminListAccess`, `adminSetStatus` cases inside `doPost`). Redeploy after
   updating: **Deploy → Manage deployments → edit (pencil) → New version → Deploy.**
   You do **not** need the old `AdminPage.html` Apps Script file anymore —
   delete it from the Apps Script project's Files list if it's still there,
   it's unused now.

2. **Config**: open `config.js` and paste the same Apps Script `/exec` URL
   you're using in the main form and the Flutter app:
   ```js
   const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycb.../exec";
   ```

3. **Host it**: push this `sss-admin/` folder to its own GitHub repo (or a
   subfolder of an existing one) and enable **Settings → Pages → Deploy from
   a branch**, same as the main form. You'll get a URL like
   `https://yourusername.github.io/sss-admin/`.

   Keep this URL **private** — don't link it from the public membership
   form. Anyone who finds it can attempt to log in (they'd need the admin
   password to do anything, but there's no reason to advertise it).

## First use

The very first person to open the site sees **"Claim Admin Access"** — enter
your email, verify the OTP that arrives in your inbox (sent via Gmail, free,
no SMS involved), and choose a password. That becomes the permanent admin
login. Anyone after that just sees a normal password login, with "Forgot
password?" available if needed (same OTP-to-email mechanism).

Once logged in, every mobile number that's ever tried to use the app shows
up with **Approve**/**Deny** buttons and live pending/approved/denied
counts.

## How this connects to the app

When someone opens the membership app and taps **Send OTP**, it calls
`checkAccess` first — registering the number as "pending" if it's brand
new — and only actually sends the OTP if you've approved that number here.
Nothing on the app side needs to change when you add/remove approvals; it's
checked fresh every time.
