# TissuePaper
A utility to export from GitHub Issues to a Google Sheet

### Installation ###
- `npm i`
- `node index`

### Requirements ###
Node version above 7.6

You will need to register an application with credentials for your Google Sheets API as well as provide an Personal Authorization Token from your Github account if you're using a private repository. 

Follow the instructions [here](https://developers.google.com/sheets/api/quickstart/nodejs) to get started with the Google credentials.
and provide it on the `client_secret.json`
As well as [here](https://help.github.com/articles/creating-a-personal-access-token-for-the-command-line/) to provide a Personal Authorization Token which is referenced on `config.json`, along with the owner/repo name and the Google Spreadsheet ID.

Your Spreadsheet ID can be found in the URL of the browser. Ex:
` https://docs.google.com/spreadsheets/d/HERE_IS_THE_SPREADSHEET_ID/edit#gid=0`

> Note: Do NOT add these files to your GitHub commits. I've included the .gitignore for this purpose 