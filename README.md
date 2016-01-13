# lunch-bot
A Simple Slack Bot for helping us pick a lunch place.

## Set Up

Start by initializing node

`npm init`

Then install the dependencies

`npm i --save slackbots sqlite3`

Run the file to generate the SQLite3 database

`node data/databaseGenerator.js`

## Usage

`BOT_API_KEY=your_api_key node bin/bot.js`
