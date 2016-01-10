// data/databaseGenerator.js

'use strict'

// Comand line script to generate a SQLite database file to store restaurants
// usage: node databaseGenerator.js [destfile]
// destfile is optional and will default to "lunchbot.db"

var path = require('path');
var request = require('request');
var sqlite3 = require('sqlite3').verbose();

var outputFile = process.argv[2] || path.resolve(__dirname, 'lunchbot.db');
var db = new sqlite3.Database(outputFile);

var lunch_spots = ["Paola's", "Jule's", "Italian Market", "Landis", "Tacos", "Elegance", "Diner", "Christopher's"];

// prepares the database connection in serialized mode
db.serialize(function() {
	// creates the database structure
	db.run('CREATE TABLE IF NOT EXISTS info(name TEXT PRIMARY KEY, val TEXT DEFAULT NULL)');
	db.run('CREATE TABLE IF NOT EXISTS lunch_spots(id INTEGER PRIMARY KEY, lunch_spot TEXT, used INTEGER DEFAULT 0)');
	db.run('CREATE INDEX lunch_spot_used_idx ON lunch_spots(used)');
	
	var stmt = db.prepare("INSERT INTO lunch_spots(lunch_spot) VALUES(?)");
	
	for (var i = 0; i < lunch_spots.length; i++) {
		stmt.run(lunch_spots[i])
	}
	
	stmt.finalize();
	
	db.each("SELECT rowid AS id, lunch_spot FROM lunch_spots", function(err, row) {
		console.log(row.id + ":" + row.lunch_spot);
	});
});

db.close();
