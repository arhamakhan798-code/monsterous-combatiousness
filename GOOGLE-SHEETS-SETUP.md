# Monsterous Combatiousness — Google Sheets Accounts

This version uses **Google Sheets + Google Apps Script** as the persistent account/game database.

## What is stored

### Users sheet
- account ID
- email
- password hash (SHA-256; never plaintext)
- username
- age
- selected fighter
- total wins
- total losses
- total battles
- created/updated timestamps

### History sheet
Every completed battle gets a row with:
- match ID
- user ID
- email
- victory/defeat
- fighter
- timestamp

### Sessions sheet
Short-lived login sessions are stored as hashes so the game can keep the account signed in between page visits.

## Setup

1. Create a **Google Sheet** for the project.
2. In that Sheet, open **Extensions → Apps Script**.
3. Delete the default code and paste the contents of `google-apps-script.gs`.
4. Save the Apps Script project.
5. Run any function once (for example `doGet`) from the Apps Script editor and approve the requested Google permissions.
6. Deploy it using **Deploy → New deployment → Web app**.
7. Set **Execute as: Me**.
8. Set access so the web app can be reached by your game users (Google's current deployment UI may phrase this slightly differently).
9. Copy the deployed `/exec` URL.
10. In `js/google-config.js`, paste that URL into `webAppUrl`.
11. For a Vercel deployment, add the same URL as the environment variable `GOOGLE_APPS_SCRIPT_URL`. The included `/api/auth.js` proxy keeps browser requests same-origin and avoids CORS problems.
12. Deploy the game.

The Apps Script automatically creates `Users`, `History`, and `Sessions` sheets the first time they are needed. If you are reusing an older sheet from the verification version, create a fresh spreadsheet or update the `Users` header row to match the current 11-column schema.

## Account flow

**Create account → profile → battle → stats/history saved → logout → login later with the same email/password.**

The game only checks that the email is in a valid email format. It does **not** send a verification email, so players can choose an email-style login such as `warrior123@example.com` even if they do not own that inbox.

The game does not store the user's plaintext password in localStorage or in Google Sheets. Only a one-way password hash is stored.

## Important

This is a lightweight project/demo account system, not a replacement for a mature production identity provider. Google Sheets has quotas and is not intended for large-scale game authentication. For a portfolio/student project, however, it is a simple and understandable way to demonstrate persistent accounts and database-backed game history.


### Profile vs fighter
The profile stores the player avatar, but NOT their fighter choice. Fighter selection is made inside the arena and can be changed there at any time.
