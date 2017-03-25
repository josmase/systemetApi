var exp = {
	query : function(sql, insert) {
		return new Promise(function(resolve, reject) {
			databaseQuery(sql, insert)
			    .then((result) => resolve(result))
			    .catch((err) => (reject(err)));
		});
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
					if (error.code == "ER_LOCK_DEADLOCK") {
						retryQuery(sql, 0)
						    .then(function(result) {
							    resolve(result);
						    })
						    .catch(function(err) {
							    reject(
								"Unable to query databse: " +
								err)
						    });
					}
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
 * Get and insert the data from systembolaget
 * @param {object} toInsert - Contains columns for the data, the sql string and
 * url to the data
 * @returns {Promise}
 */
function insertData(toInsert)
{
	var columns = toInsert.columns, sql = toInsert.sql, url = toInsert.url;

	getUrl(url)
	    .then((xml) => {
		    result = parseXml(xml);

		    if (result.artiklar) {
			    result = result.artiklar.artikel;
		    } else if (result.ButikerOmbud) {
			    result = result.ButikerOmbud.ButikOmbud;
		    }

		    for (i = 0; i < result.length; i++) {
			    var data = buildInsertQuery(result[i]);
			    databaseQuery(sql, data).catch((err) => {
				    return err;
			    });
		    }
		    return true;

	    })
	    .catch((err) => {
		    return err;
	    });
}
function getUrl(url)
{
	return new Promise(function(resolve, reject) {
		request.get(url, function(error, response, xml) {
			if (error || response.statusCode != 200) {
				reject("Error getting xml: " + error)
			}
			resolve(xml);
		});
	});
}
function parseXml(xml)
{
	var options = {trim : true, explicitArray : false};
	var parser = new xml2js.Parser(options);
	result = null;
	parser.parseString(xml, function(err, data) {
		if (!err) {
			result = JSON.parse(JSON.stringify(data));
		} else {
			console.err('Failed parsing xml', err)
		}
	});
	return result;
}
/**
 * Compares the result to the columns to ensure that all columns get a value
 * @param {object} result - Array containing the data to insert
 * @param {object} columns - Array with all the columns expected
 * @returns {Promise}
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
		fs.readFile(
		    __dirname + '/mysqlScripts/update.sql',
		    function(err, data) {
			    var sql = data.toString()
					  .replace(/(\r\n|\n|\r)/gm, " ")
					  .split(";");
			    sql.pop();
			    for (var i = 0, j = sql.length; i < j; i++) {
				    databaseQuery(sql[i])
					.then((result) => resolve(result))
					.catch((err) => reject(err));
			    }
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
		    insertDataToDatabase(toInsert);
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
function insertDataToDatabase(toInsert)
{
	console.time("Getting and inserting data for " + toInsert.name);
	var result = insertData(toInsert);
	if (result) {
		console.timeEnd("Getting and inserting data for " +
				toInsert.name);
		console.time('Updating columns for ' + toInsert.name);
		update()
		    .then(function() {
			    console.timeEnd('Updating columns for ' +
					    toInsert.name);
			    console.info("All done setting up " +
					 toInsert.name + "!");
		    })
		    .catch(function(err) {
			    console.timeEnd('Updating columns for ' +
					    toInsert.name);
			    console.error(err, toInsert.name)
		    });
	} else {
		console.timeEnd("Getting and inserting data for " +
				toInsert.name);
		console.error(result, toInsert.name);
	}
}

/**
 * Retry a query while tries < 5
 * @param {string} sql - The sql to retry
 * @param {number} tries - Amount of times the query have been tried
 * @returns {Promise}
 */
function retryQuery(sql, tries)
{
	return new Promise(function(resolve, reject) {
		databaseQuery(sql)
		    .then(function(result) {
			    resolve(result);
		    })
		    .catch(function(err) {
			    if (tries < 5) {
				    tries++;
				    console.log('retry');
				    retryQuery(sql, tries)
			    }
			    reject(err);
		    });
	})
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
	      columns : [
		      'nr',	   'Artikelid',
		      'Varnummer',    'Namn',
		      'Namn2',	'Prisinklmoms',
		      'Pant',	 'Volymiml',
		      'PrisPerLiter', 'Saljstart',
		      'Utgått',       'Varugrupp',
		      'Typ',	  'Stil',
		      'Forpackning',  'Forslutning',
		      'Ursprung',     'Ursprunglandnamn',
		      'Producent',    'Leverantor',
		      'Argang',       'Provadargang',
		      'Alkoholhalt',  'Sortiment',
		      'Ekologisk',    'Etiskt',
		      'Koscher',      'RavarorBeskrivning'
	      ],
	      sql :
		  "INSERT INTO products ??  VALUES ?? ON DUPLICATE KEY UPDATE `changed_timestamp` = NOW()",
	      url : 'https://josmase.se/xml.xml',
	      table : '/mysqlScripts/products.sql',
	      name : "Products"
	    };
	var stores =
	    {
	      columns : [
		      'Typ', 'Nr', 'Namn', 'Address1', 'Address2', 'Address3',
		      'Address4', 'Address5', 'Telefon', 'ButiksTyp',
		      'Tjanster', 'SokOrd', 'Oppettider', 'RT90x', 'RT90y'
	      ],
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
		// setupDatabase(stores);
		databaseSetup = true;
	}
	if (Math.min(msTill12, msTill24) < 5000) {
		insertDataToDatabase(products);
		i // nsertDataToDatabase(stores);
	}
	setTimeout(() => updateInterval(databaseSetup),
		   Math.min(msTill12, msTill24));
}

updateInterval(false);
