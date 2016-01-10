// bin/bot.js

'use strict';

var LunchBot = require('../lib/lunchbot');

var token = process.env.BOT_API_KEY;
var dbPath = process.env.BOT_DB_PATH;
var name = process.env.BOT_NAME;

var lunchbot = new LunchBot({
	token: token,
	dbPath: dbPath,
	name: name
});

lunchbot.run();