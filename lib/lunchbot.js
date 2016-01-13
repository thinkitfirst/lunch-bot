// lib/lunchbot.js

'use strict';

var util = require('util');
var path = require('path');
var fs = require('fs');
var SQLite = require('sqlite3').verbose();
var Bot = require('slackbots');

var LunchBot = function Constructor(settings) {
	this.settings = settings;
	this.settings.name = this.settings.name || 'lunchbot';
	this.dbPath = settings.dbPath || path.resolve(process.cwd(), 'data', 'lunchbot.db');

	this.user = null;
	this.db = null;
};

// inherits methods and properties from the Bot constructor
util.inherits(LunchBot, Bot);

LunchBot.prototype.run = function() {
	LunchBot.super_.call(this, this.settings);

	this.on('start', this._onStart);
	this.on('message', this._onMessage);
};

LunchBot.prototype._onStart = function() {
	this._loadBotUser();
	this._connectDb();
	this._firstRunCheck();
};

LunchBot.prototype._loadBotUser = function() {
	var self = this;
	this.user = this.users.filter(function(user) {
		return user.name === self.name;
	})[0];
};

LunchBot.prototype._connectDb = function() {
	if(!fs.existsSync(this.dbPath)) {
		console.error('Database path ' + '"' + this.dbPath + '" does not exist or it\'s not readable.');
		process.exit(1);
	}

	this.db = new SQLite.Database(this.dbPath);
}

LunchBot.prototype._firstRunCheck = function() {
	var self = this;
	self.db.get('SELECT val FROM info WHERE name = "lastrun" LIMIT 1', function(err, record) {
		if(err) {
			return console.error('DATABASE ERROR:', err);
		}
		var currentTime = (new Date()).toJSON();

		// this is a first run
		if(!record) {
			self._welcomeMessage();
			return self.db.run('INSERT INTO info(name, val) VALUES("lastrun", ?)', currentTime);
		}

		// updates with new last running time
		self.db.run('UPDATE info SET val = ? WHERE name = "lastrun"', currentTime);
	});
};

LunchBot.prototype._welcomeMessage = function() {
	this.postMessageToChannel(this.channels[0].name, "Hi guys, I'm " + this.name + "! I can help you select today's LunchSpot. LunchBot... LunchSpot... Get it?", {as_user: true});
	this.postMessageToChannel(this.channels[0].name, "... It's a pun.", {as_user: true});
};

LunchBot.prototype._onMessage = function(message) {
	if (this._isChatMessage(message) &&
		this._isChannelConversation(message) &&
		!this._isFromLunchBot(message) &&
		this._isMentioningLunchBot(message)
	) {
		if(this._isAddingLunchSpot(message)) {
			this._addLunchSpot(message);
		} else if(this._isRemovingLunchSpot(message)) {
			this._removeLunchSpot(message);
		} else if(this._isRequestingHelp(message)) {
			this._showHelp(message);
		} else if(this._isViewAll(message)) {
			this._viewAll(message);
		} else if(this._isRequestingRecommendation(message)) {
			this._replyWithRecommendation(message);
		}
	}
};

LunchBot.prototype._isChatMessage = function(message) {
	return message.type === 'message' && Boolean(message.text);
};

LunchBot.prototype._isChannelConversation = function(message) {
	return typeof message.channel === 'string' &&
		message.channel[0] === 'C';
};

LunchBot.prototype._isFromLunchBot = function(message) {
	return message.user === this.user.id;
};

LunchBot.prototype._isMentioningLunchBot = function(message) {
	return message.text.toLowerCase().indexOf(this.name) > -1;
};

LunchBot.prototype._isAddingLunchSpot = function(message) {
	return message.text.toLowerCase().indexOf('add:') > -1;
};

LunchBot.prototype._addLunchSpot = function(message) {
	var stmt = this.db.prepare("INSERT INTO lunch_spots(lunch_spot) VALUES(?)");
	var myRegexp = /add:(.*)/;
	var match = myRegexp.exec(message.text);
	var lunch_spot = match[1].trim();
	stmt.run(lunch_spot);
	stmt.finalize();
	var channel = this._getChannelById(message.channel);
	this.postMessageToChannel(channel.name, "I added " + lunch_spot + " to the list of places.", {as_user: true});
};

LunchBot.prototype._isRemovingLunchSpot = function(message) {
	// not being used because _removeLunchSpot not yet working
	return message.text.toLowerCase().indexOf('remove:') > -1;
};

LunchBot.prototype._removeLunchSpot = function(message) {
	// not being used. I need to work on this.
	var myRegexp = /remove:(.*)/;
	var match = myRegexp.exec(message.text);
	var lunch_spot = match[1].trim();
	var stmt = this.db.prepare("DELETE FROM lunch_spots WHERE lunch_spot like ?");
	stmt.run("%" + lunch_spot +"%");
	stmt.finalize();
	var channel = this._getChannelById(message.channel);
	this.postMessageToChannel(channel.name, "I removed " + lunch_spot + " from the list of places.", {as_user: true});
};

LunchBot.prototype._isRequestingHelp = function(message) {
	return message.text.toLowerCase().indexOf('help') > -1;
};

LunchBot.prototype._showHelp = function(originalMessage) {
	var self = this;
	var help = "I can respond to the following commands: \n 'add: <restaurant>' - add a restaurant to my database \n 'view-all' - show you all the restaurants in the database \n 'recommend' - I'll pick a place at random";
	var channel = self._getChannelById(originalMessage.channel);
	self.postMessageToChannel(channel.name, help, {as_user: true});
};

LunchBot.prototype._isViewAll = function(message) {
	return message.text.toLowerCase().indexOf('view-all') > -1;
}

LunchBot.prototype._viewAll = function(originalMessage) {
	var response = "";
	var self = this;
	this.db.all("SELECT rowid AS id, lunch_spot FROM lunch_spots ORDER BY lunch_spot ASC", function(err, records) {
		for(var i = 0; i < records.length; i++) {
			response += records[i].lunch_spot + '\n';
		}
		var channel = self._getChannelById(originalMessage.channel);
		self.postMessageToChannel(channel.name, response, {as_user: true});
	});
}

LunchBot.prototype._isRequestingRecommendation = function(message) {
	return message.text.toLowerCase().indexOf('recommendation') > -1;
}

LunchBot.prototype._replyWithRecommendation = function(originalMessage) {
	var self = this;
	// need to write function to query database here
	self.db.get('SELECT id, lunch_spot FROM lunch_spots ORDER BY RANDOM() LIMIT 1', function(err, record) {
		if(err) {
			return console.error('DATABASE ERROR:', err);
		}
		var channel = self._getChannelById(originalMessage.channel);
		self.postMessageToChannel(channel.name, 'Why not try ' + record.lunch_spot + "?", {as_user: true});
		self.db.run('UPDATE lunch_spots SET used = used + 1 WHERE id = ?', record.id);
	});
}

LunchBot.prototype._getChannelById = function(channelId) {
	return this.channels.filter(function(item) {
		return item.id === channelId;
	})[0];
};

module.exports = LunchBot;
