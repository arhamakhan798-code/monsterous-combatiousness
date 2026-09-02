/**
 * Google Apps Script for Monsterous Combatiousness
 * Deploy this to Google Apps Script and use the deployment URL in google-backend.js
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://script.google.com
 * 2. Create a new project
 * 3. Copy and paste this entire script
 * 4. Replace SHEET_ID with: 1x1BJztXoGX9Kej9wXE5A6Vtea74ZHj0icpAmUCtHqFU
 * 5. Deploy as "New deployment" → Type: "Web app" → Execute as: Your Account → Allow access
 * 6. Copy the deployment URL and paste it into js/google-backend.js as SHEET_WEBHOOK
 */

const SHEET_ID = '1x1BJztXoGX9Kej9wXE5A6Vtea74ZHj0icpAmUCtHqFU';

function doPost(e) {
  try {
    const sheet = SpreadsheetApp.openById(SHEET_ID);
    const data = JSON.parse(e.postData.contents);
    
    if (data.action === 'saveLogin') {
      return saveLogin(sheet, data);
    } else if (data.action === 'saveGame') {
      return saveGameResult(sheet, data);
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: 'Unknown action'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function saveLogin(sheet, data) {
  try {
    let loginSheet = sheet.getSheetByName('Logins');
    
    if (!loginSheet) {
      loginSheet = sheet.insertSheet('Logins');
      loginSheet.appendRow(['Timestamp', 'Email', 'Username', 'Platform']);
    }
    
    loginSheet.appendRow([
      data.timestamp,
      data.email,
      data.username,
      data.platform
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Login saved'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Save Login Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function saveGameResult(sheet, data) {
  try {
    let gamesSheet = sheet.getSheetByName('Games');
    
    if (!gamesSheet) {
      gamesSheet = sheet.insertSheet('Games');
      gamesSheet.appendRow([
        'Timestamp',
        'Email',
        'Username',
        'Character',
        'Result',
        'Player HP',
        'Monster HP'
      ]);
    }
    
    gamesSheet.appendRow([
      data.timestamp,
      data.email,
      data.username,
      data.character,
      data.result,
      data.finalPlayerHp,
      data.finalMonsterHp
    ]);
    
    return ContentService.createTextOutput(JSON.stringify({
      success: true,
      message: 'Game result saved'
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    Logger.log('Save Game Error: ' + error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
