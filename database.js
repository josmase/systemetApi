var exp = {
    query: function (sql, insert) {
        return new Promise(function (resolve, reject) {
            databaseQuery(sql, insert)
                .then((result) => resolve(result))
                .catch((err)=>(reject(err)));
        });
    }
};
module.exports = exp;

var mysql = require('mysql');
var request = require('request');
var fs = require('fs');
var parser = require('xml2json');
var systemetapi = require('./systemetApi.js');

// Private (Custom) modules
var database = mysql.createPool({
    host: systemetapi.database.host,
    port: systemetapi.database.port,
    database: systemetapi.database.name,
    user: systemetapi.database.user,
    password: systemetapi.database.password,
    connectionLimit: 100
});

function databaseQuery(sql, inserts) {
    return new Promise(function (resolve, reject) {
        "use strict";
        if(inserts){
            sql = mysql.format(sql, inserts);
        }
        database.getConnection(function (err, connection) {
            if (err) {
                reject(err);
            }

            connection.query(sql, function (error, results) {
                connection.release();
                if (error) {
                    if (error.code == "ER_LOCK_DEADLOCK") {
                        retryQuery(sql, 0)
                            .then(function (result) {
                                resolve(result);
                            })
                            .catch(function (err) {
                                reject("Unable to query databse: " + err)
                            });
                    }
                    reject(error);
                }
                else {
                    resolve(results)
                }
            });

        });
    });
}

function setup() {
    return new Promise(function (resolve, reject) {
        fs.readFile(__dirname + '/mysqlScripts/products.sql', function (err, data) {
            if (err)reject(err);
            databaseQuery(data.toString(), null).then(function (result) {
                resolve(result);
            }).catch(function (err) {
                reject("Unable to query database: " + err);
            });
        });
    });
}

function insertData() {
    console.log("Getting data to insert");
    return new Promise(function (resolve, reject) {
        request.get('https://www.systembolaget.se/api/assortment/products/xml', function (error, response, data) {
                if (!error && response.statusCode == 200) {

                    var options = {
                        object: true,
                        reversible: false,
                        coerce: true,
                        sanitize: true,
                        trim: true,
                        arrayNotation: false
                    };
                    var result = parser.toJson(data, options);
                    var inserts = [];

                    var articles = result.artiklar.artikel;
                    var columns = ['nr', 'Artikelid', 'Varnummer', 'Namn', 'Namn2', 'Prisinklmoms', 'Pant', 'Volymiml',
                        'PrisPerLiter', 'Saljstart', 'Slutlev', 'Varugrupp', 'Forpackning', 'Forslutning', 'Ursprung',
                        'Ursprunglandnamn', 'Producent', 'Leverantor', 'Argang', 'Provadargang', 'Alkoholhalt', 'Sortiment',
                        'Ekologisk', 'Etiskt', 'Koscher', 'RavarorBeskrivning'];

                    var sql = "INSERT INTO products (??)  VALUES ? ON DUPLICATE KEY UPDATE `changed_timestamp` = NOW()";
                    console.log("Building query");
                    var i, j, temparray, chunk = 100;
                    for (i = 0, j = articles.length; i < j; i += chunk) {
                        temparray = articles.slice(i, i + chunk);
                        buildInsertQuery(temparray, columns, sql, inserts)
                            .then(function (data) {
                                databaseQuery(sql, [columns, data])
                                    .then((result) => resolve(result))
                                    .catch((err)=>(reject("Unable to query databse: " + err)));
                            }).catch((err) => reject("Unable to build query: " + err));
                    }
                }
                else {
                    reject("Error getting xml: " + error)
                }
            }
        );
    });
}

function buildInsertQuery(articles, columns) {
    return new Promise(function (resolve) {
        "use strict";

        var inserts = [];

        for (var i = 0; i < articles.length; i++) {

            var row = [];
            var keys = Object.keys(articles[i]);
            var value = 0;

            columns.forEach(function (currentValue) {
                if (currentValue == keys[value]) {
                    if (typeof articles[i][keys[value]] == 'object') articles[i][keys[value]] = null;
                    row.push(articles[i][keys[value]]);
                    value++
                } else {
                    row.push(null)
                }
            });
            inserts.push(row);
        }
        resolve(inserts);
    });
}

function update() {
    return new Promise(function (resolve, reject) {
        fs.readFile(__dirname + '/mysqlScripts/update.sql', function (err, data) {
            var sql = data.toString().replace(/(\r\n|\n|\r)/gm, " ").split(";");
            sql.pop();
            for (var i = 0, j = sql.length; i < j; i++) {
                databaseQuery(sql[i])
                    .then((result) => resolve(result))
                    .catch((err) => reject(err));
            }
        });
    });
}

function setupDatabase() {
    console.time("Creating database");
    setup()
        .then(function () {
            console.timeEnd("Creating database");
            insertDataToDatabase();
        })
        .catch(function (err) {
            console.timeEnd("Creating database");
            console.error(err);
        });
}

function insertDataToDatabase() {
    console.time("Getting and inserting data");
    insertData()
        .then(function () {
            console.timeEnd("Getting and inserting data");
            console.time('Updating columns');
            update()
                .then(function () {
                    console.timeEnd('Updating columns');
                    console.info("All done setting up!");
                })
                .catch(function (err) {
                    console.timeEnd('Updating columns');
                    console.error(err)
                });
        })
        .catch(function (err) {
            console.timeEnd("Getting and inserting data");
            console.error(err);
        });
}

function retryQuery(sql, tries) {
    return new Promise(function (resolve, reject) {
        databaseQuery(sql)
            .then(function (result) {
                resolve(result);
            }).catch(function (err) {
            if (tries < 5) {
                tries++;
                console.log('retry');
                retryQuery(sql, tries)
            }
            reject(err);
        });
    })
}

function updateInterval(databaseSetup) {
    var now = new Date();
    var msTill24 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 24, 0, 0, 0) - now;
    var msTill12 = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0) - now;
    if (msTill12 < 0) {
        msTill12 += 86400000;
    }
    if (msTill24 < 0) {
        msTill24 += 86400000;
    }
    if (!databaseSetup) {
        setupDatabase();
        databaseSetup = true;
    }
    if (Math.min(msTill12, msTill24) < 5000) {
        insertDataToDatabase();
    }
    setTimeout(() => updateInterval(databaseSetup), Math.min(msTill12, msTill24));
}

updateInterval(false);