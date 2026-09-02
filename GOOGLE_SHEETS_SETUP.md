# Google Sheets Integration Setup Guide

## Your Google Sheet
📊 **Sheet Link:** https://docs.google.com/spreadsheets/d/1x1BJztXoGX9Kej9wXE5A6Vtea74ZHj0icpAmUCtHqFU/edit

**Sheet ID:** `1x1BJztXoGX9Kej9wXE5A6Vtea74ZHj0icpAmUCtHqFU`

---

## Step-by-Step Setup

### Step 1: Create a Google Apps Script Project

1. Visit **https://script.google.com**
2. Click **"New project"**
3. Name it: `Monsterous Combatiousness Backend`

### Step 2: Copy the Script Code

1. Open the file: `GoogleAppsScript.gs` in this folder
2. Copy **all the code**
3. Paste it into the Google Apps Script editor (replacing anything that's there)
4. Click **Save** (Ctrl+S)

### Step 3: Deploy as a Web App

1. Click **"Deploy"** → **"New deployment"**
2. Click the gear icon and select **"Web app"**
3. Set:
   - **Execute as:** Your account (the Google account that owns the sheet)
   - **Who has access:** "Anyone"
4. Click **"Deploy"**
5. Copy the **Deployment URL** (looks like: `https://script.google.com/macros/s/AKfycbx...../useless_ajax`)

### Step 4: Update Your Game Code

1. Open: `js/google-backend.js`
2. Find this line:
   ```javascript
   SHEET_WEBHOOK: 'https://script.google.com/macros/d/{DEPLOYMENT_ID}/useless_ajax',
   ```
3. Replace `{DEPLOYMENT_ID}` with your actual deployment ID from Step 3
4. **Or** replace the entire URL with your full deployment URL
5. Save the file

### Step 5: Test It Out

1. Open your game: `file:///C:/Users/Arham/Desktop/monsterous%20combatiousness/index.html`
2. Log in with your account
3. Check the Google Sheet - you should see a new "Logins" tab with your login data!
4. Play a game and win/lose
5. Check the "Games" tab in your Google Sheet - you should see the match result!

---

## What Gets Saved

### Logins Tab
- **Timestamp** - When you logged in
- **Email** - Your login email
- **Username** - Your game username
- **Platform** - "web"

### Games Tab
- **Timestamp** - When the match happened
- **Email** - Your email
- **Username** - Your username
- **Character** - Shadow or Blade
- **Result** - WIN or LOSS
- **Player HP** - Your remaining health
- **Monster HP** - Monster's remaining health

---

## Troubleshooting

### No data appearing in the sheet?

1. **Check the deployment URL** - Make sure you copied it correctly
2. **Check browser console** - Open DevTools (F12) → Console tab
   - Look for green checkmarks ✅ (success messages)
   - Look for warning triangles ⚠️ (error messages)
3. **Check Apps Script logs** - In your Apps Script project:
   - Click **"Executions"** to see if requests are coming in
   - Click **"View logs"** to see error messages

### Permission Denied Error?

1. Make sure the Google Apps Script is deployed with "Execute as: Your Account"
2. Make sure your Google Sheet is NOT in a shared folder with restricted permissions
3. Check that you have edit access to the sheet

### Deployment URL looks wrong?

1. In Google Apps Script, go to **Deployments** (top-left)
2. Click the **latest deployment**
3. Copy the **URL** shown there
4. Make sure it ends with `/useless_ajax`

---

## Security Note

⚠️ **Important:** With this setup:
- Anyone with the webhook URL can write to your Google Sheet
- The sheet contains login info (emails, usernames)
- Keep the webhook URL private if you don't want other people logging data

For production, consider:
- Adding authentication tokens
- Rate limiting
- IP whitelisting
- Encrypting sensitive data

---

## Support

If you have issues:
1. Check the Google Apps Script logs
2. Verify the deployment URL is correct
3. Make sure the sheet ID in GoogleAppsScript.gs matches your sheet
4. Check browser console for any error messages
