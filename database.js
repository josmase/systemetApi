var exp = {
	query : function(sql, insert) {
	    return databaseQuery(sql, insert);
	}
};
module.exports = exp;

var mysql = require('mysql');
var request = require('request');
var fs = require('fs');
var xml2js = require('xml2js');
var systemetapi = require('./systemetApi.js');

var database = mysql.createPool({
	host : systemetapi.database.host,
	port : systemetapi.database.port,
	database : systemetapi.database.name,
	user : systemetapi.database.user,
	password : systemetapi.database.password,
	connectionLimit : 100
});
/**
 * Send and return the result of a formatted query
 * @param {string} sql - The unformatted sql string
 * @param {object} inserts - The value to insert into the sql string
 * @returns {Promise}
 */
function databaseQuery(sql, inserts)
{
	return new Promise(function(resolve, reject) {
		"use strict";
		if (inserts) {
			sql = mysql.format(sql, inserts);
		}
		database.getConnection(function(err, connection) {

			if (err) {
				reject(err);
			}

			connection.query(sql, function(error, results) {
				connection.release();
				if (error) {
					reject(error);
				} else {
					resolve(results)
				}
			});

		});
	});
}

/**
 * Reads a sql file with the name of the table param and runs the file. Used for
 * creating the tables needed
 * @param {string} table - Name of the table to read
 * @returns {Promise}
 */
function createTables(table)
{
	return new Promise(function(resolve, reject) {
		fs.readFile(__dirname + table, function(err, data) {
			if (err)
				reject(err);
			databaseQuery(data.toString(), null)
			    .then(function(result) {
				    resolve(result);
			    })
			    .catch(function(err) {
				    reject("Unable to query database: " + err);
			    });
		});
	});
}
/**
 * Insert the data from xml file with the format given in sql and returns a
 * promise that resolves when all the data is inserted
 * @param {object} xml - The data in XML form
 * @param {string] sql - The SQL string that will be used for making the insert
 * @returns {Promise}
 */
function insertXml(xml, sql)
{
	return new Promise(function(resolve, reject) {
		result = parseXml(xml);

		if (result.artiklar) {
			result = result.artiklar.artikel;
		} else if (result.ButikerOmbud) {
			result = result.ButikerOmbud.ButikOmbud;
		} else {
			reject("Something went wrong parsing xml");
		}

		for (i = 0; i < result.length; i++) {
			var data = buildInsertQuery(result[i]);
			databaseQuery(sql, data).catch((err) => {
				reject(err);
			});
		}

		resolve(true);
	});
}
/**
 * Gets data from an URL and returns a promise
 *@param {string} url - The url
 *@return {promise}
*/
function getUrl(url)
{
	return new Promise(function(resolve, reject) {
		request.get(url, function(err, response, data) {
			if (!err && response.statusCode == 200) {
				resolve(data);
			}
			reject(err);
		});
	});
}

/**
 * Parses XML to JSON
 * @param {object} xml - the XML to parse to JSON
 * @return {object} input parsed as JSON
*/
function parseXml(xml)
{
	var options = {trim : true, explicitArray : false};
	var parser = new xml2js.Parser(options);
	result = false;
	parser.parseString(xml, function(err, data) {
		if (!err) {
			result = JSON.parse(JSON.stringify(data));
		} else {
			console.error('Failed parsing xml', err)
		}
	});
	return result;
}
/**
 * Creates two arrays with keys and values of the current product
 * @param {object} obj - THe object to work with
 * @returns {array} array containing the keys and values
 */
function buildInsertQuery(obj)
{
	var keys = [];
	var values = [];
	for (var key in obj) {
		keys.push(key);
		values.push(obj[key]);
	}
	return [ keys, values ];
}

/**
 * Reads and runs the update.sql file used for updating the type of columns and
 * the data in them
 * @returns {Promise}
 */
function update()
{
	return new Promise(function(resolve, reject) {
		var path = __dirname + '/mysqlScripts/update.sql';

		fs.readFile(path, function(err, data) {
			var sql = data.toString()
				      .replace(/(\r\n|\n|\r)/gm, " ")
				      .split(";");
			sql.pop();
			for (var i = 0, j = sql.length; i < j; i++) {
				databaseQuery(sql[i]).catch((err) =>
								reject(err));
			}
			resolve(result);
		});
	});
}

/**
 * Create the table specified in toInsert.name
 * @param {object} toInsert - Object containing the name of the table to setup
 */
function setupDatabase(toInsert)
{
	console.time("Creating " + toInsert.name);
	createTables(toInsert.table)
	    .then(function() {
		    console.timeEnd("Creating " + toInsert.name);
		    insertFromUrl(toInsert);
	    })
	    .catch(function(err) {
		    console.timeEnd("Creating " + toInsert.name);
		    console.error(err, toInsert.name);
	    });
}

/**
 * Starts a timer and runs insertData
 * @param {object} toInsert Contains the name of the table to insert data to
 */
function insertFromUrl(toInsert)
{
	console.time('Getting file from url ' + toInsert.url);
	getUrl(toInsert.url)
	    .then(data => {
		    console.timeEnd('Getting file from url ' + toInsert.url);
		    console.time("Inserting data for " + toInsert.name);
		    return insertXml(data, toInsert.sql)
	    })
	    .then(data => {
		    console.timeEnd("Inserting data for " + toInsert.name);
		    console.time('Updating columns for ' + toInsert.name);

		    return update()
	    })
	    .then(() => {
		    console.timeEnd('Updating columns for ' + toInsert.name);
		    console.info("All done setting up " + toInsert.name + "!");
	    })
	    .catch(err => {console.error(err, toInsert.name)});
}

/**
 * At first run it runs databaseSetup and insertToDatabase. Then runs itself at
 * 12:00 and 24:00 but only runs insertToDatabase
 * @param {boolean} databaseSetup - If false databaseSetup has not been run,
 * otherwise it has been run.
 */
function updateInterval(databaseSetup)
{
	var now = new Date();
	var msTill24 = new Date(now.getFullYear(), now.getMonth(),
				now.getDate(), 24, 0, 0, 0) -
		       now;
	var msTill12 = new Date(now.getFullYear(), now.getMonth(),
				now.getDate(), 12, 0, 0, 0) -
		       now;
	var products =
	    {
	      sql :
		  "INSERT INTO products ??  VALUES ?? ON DUPLICATE KEY UPDATE `changed_timestamp` = NOW()",
	      url : 'http://www.systembolaget.se/api/assortment/products/xml',
	      table : '/mysqlScripts/products.sql',
	      name : "Products"
	    };
	var stores =
	    {
	      sql :
		  "INSERT INTO stores (??)  VALUES ? ON DUPLICATE KEY UPDATE `changed_timestamp` = NOW()",
	      url : 'http://www.systembolaget.se/api/assortment/stores/xml',
	      table : '/mysqlScripts/stores.sql',
	      name : 'Stores'
	    };

	if (msTill12 < 0) {
		msTill12 += 86400000;
	}
	if (msTill24 < 0) {
		msTill24 += 86400000;
	}
	if (!databaseSetup) {
		setupDatabase(products);
		setupDatabase(stores);
		databaseSetup = true;
	}
	if (Math.min(msTill12, msTill24) < 5000) {
		insertFromUrl(products);
		insertFromUrl(stores);
	}
	setTimeout(() => updateInterval(databaseSetup),
		   Math.min(msTill12, msTill24));
}

updateInterval(false);
