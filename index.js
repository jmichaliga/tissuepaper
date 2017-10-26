const github = require('octonode')

const fs = require('fs');
const readline = require('readline');
const google = require('googleapis');
const googleAuth = require('google-auth-library');

const sheets = google.sheets('v4');

// Load client secrets from a local file.
const config = require('./config')
const client = github.client(config.gitHubToken)
const repo = client.repo(config.repo)

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/sheets.googleapis.com-nodejs-quickstart.json
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
const TOKEN_PATH = TOKEN_DIR + 'sheets.googleapis.com-nodejs.json';

const headers = [["Number", "Title", "Created At", "Updated At", "URL", "Labels", "Body"]]

// Where the writing of data is passed in and into the Spreadsheet
const initSpreadsheet = function(data){
  fs.readFile('client_secret.json', function processClientSecrets(err, content) {
    if (err) {
      console.log('Error loading client secret file: ' + err);
      return;
    }
    // Authorize a client with the loaded credentials, then call the
    // Google Sheets API and pass over data if you have any
    authorize(JSON.parse(content), writeIssues, data);
  });
}

// First Auth Init, from a secret file, will writeHeaders by default
const initAuth = (fn) => {
  fs.readFile('client_secret.json', function processClientSecrets(err, content) {
    if (err) {
      console.log('Error loading client secret file: ' + err);
      return;
    }
    // Authorize a client with the loaded credentials, then call the
    // Google Sheets API and pass over data if you have any
    if ( fn ) { 
      authorize(JSON.parse(content), fn) 
    } else {
      authorize(JSON.parse(content), writeHeaders)
    }

  });
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 * @param {Object} data If the callback requires data to be passed
 */
const authorize = (credentials, callback, data) => {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client, data);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
const getNewToken = (oauth2Client, callback) => {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
const storeToken = (token) => {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

const createSheet = (auth) => {
  sheets.spreadsheets.create({
    auth: auth,
    resource: {
      properties:{
        title: "Snapshot - " + +new Date()
      }
    }
  }, (err, response) => {
    if (err) {
      console.log('The API returned an error: ' + err);
      return;
    } else {
      console.log("Added", response);
    }
  });
}

const clearSheet = (auth) => {
  sheets.spreadsheets.values.clear({
    auth: auth,
    range: 'Sheet1!A2:G',
    spreadsheetId: config.spreadsheetId,  
  }, function(err, resp){
    if (err) {
      console.error(err);
      return;
    }
    console.log(JSON.stringify(resp, null, 2))
  })
}

const writeHeaders = (auth) => {
  sheets.spreadsheets.values.update({
    auth: auth,
    range: 'Sheet1!A1:G',
    valueInputOption: "USER_ENTERED",
    resource: {
      values: headers
    },
    spreadsheetId: config.spreadsheetId,  
  }, function(err, resp){
    if (err) {
      console.error(err);
      return;
    }
    console.log(JSON.stringify(resp, null, 2))
  })
}

const writeIssues = (auth, issues) => {
  let sheetId = config.spreadsheetId
  if(process.argv[3]){
    console.log('-> sheet')
  }
  sheets.spreadsheets.values.append({
    auth: auth,
    range: 'Sheet1!A2:G',
    valueInputOption: "USER_ENTERED",
    resource: {
      values: issues
    },
    spreadsheetId: sheetId,  
  }, function(err, resp){
    if (err) {
      console.error(err);
      return;
    }
    console.log(JSON.stringify(resp, null, 2))
  })
}

/**
 * Take the issues from the repo and pass them to a spreadsheet
 *
 * @param {Integer} pg The page number to start on from Github Issues
 * @param {Integer} per The number of queries per_page
 */
const parseIssues = async (pg, per) => {
  repo.issues({
    page: pg,
    per_page: per,
  }, (err, body, headers) => {
    const data = body
    let issues = []
    data.forEach(function(issue) {
      let labels = []
      if (issue.labels.length) {
        issue.labels.forEach(function(label) {
          labels.push(label.name)
        })
      }
      let instance = [issue.number, issue.title, issue.created_at, issue.updated_at, issue.html_url, JSON.stringify(labels), issue.body]
      issues.push(instance)
    })
    initAuth() // Writes Header as Test
    initSpreadsheet(issues) // Writes Issues
    if (headers.link) { // If there are multiple pages
      if (headers.link.includes('rel="next"')) { parseIssues(pg+1, per) } // Recursive if there are more issues on the page
    }
  })
}

let n = process.argv[0]
let scr = process.argv[1]
let opt1 = process.argv[2]
let opt2 = process.argv[3]

if ( opt1 ) {
  console.log('>', opt1, opt2 )
  switch( opt1 ){
    case 'create':
      console.log('creating new sheet:')
      initAuth(createSheet)
      break
    case 'read':
      console.log('todo: read data')
      break
    case 'copy':
      break
    case 'pull':
      break
    case 'clear':
      break
    case 'prependCols':
      break
  }
} else {
  parseIssues(1, config.results)
}


