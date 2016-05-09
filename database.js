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
        if (inserts) {
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

function createTables(table) {
    return new Promise(function (resolve, reject) {
        fs.readFile(__dirname + table, function (err, data) {
            if (err)reject(err);
            databaseQuery(data.toString(), null).then(function (result) {
                resolve(result);
            }).catch(function (err) {
                reject("Unable to query database: " + err);
            });
        });
    });
}

function insertData(toInsert) {
    var columns = toInsert.columns, sql = toInsert.sql, url = toInsert.url;
    return new Promise(function (resolve, reject) {
        request.get(url, function (error, response, data) {
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

                    if (result.artiklar) {
                        result = result.artiklar.artikel;
                    }
                    else if (result.ButikerOmbud) {
                        result = result.ButikerOmbud.ButikOmbud;
                    }
                    else {
                        reject(result, "")
                    }

                    var i, j, temparray, chunk = 100;
                    for (i = 0, j = result.length; i < j; i += chunk) {
                        temparray = result.slice(i, i + chunk);
                        buildInsertQuery(temparray, columns)
                            .then(function (data) {
                                databaseQuery(sql, [columns, data])
                                    .then(result => resolve(result))
                                    .catch(err => reject("Unable to query database: " + err));
                            }).catch(err => reject("Unable to build query: " + err));
                    }
                }
                else {
                    reject("Error getting xml: " + error)
                }
            }
        );
    });
}

function buildInsertQuery(result, columns) {
    return new Promise(function (resolve) {
        "use strict";

        var inserts = [];

        for (var i = 0; i < result.length; i++) {

            var row = [];
            var keys = Object.keys(result[i]);
            var value = 0;
            if (keys[0] == 'xsi:type') {
                keys.shift();
            }
            columns.forEach(function (currentColumn) {
                if (currentColumn == keys[value]) {
                    if (typeof result[i][keys[value]] == 'object') {
                        result[i][keys[value]] = null;
                    }
                    row.push(result[i][keys[value]]);
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

function setupDatabase(toInsert) {
    console.time("Creating " + toInsert.name);
    createTables(toInsert.table)
        .then(function () {
            console.timeEnd("Creating " + toInsert.name);
            insertDataToDatabase(toInsert);
        })
        .catch(function (err) {
            console.timeEnd("Creating " + toInsert.name);
            console.error(err, toInsert.name);
        });
}

function insertDataToDatabase(toInsert) {
    console.time("Getting and inserting data for " + toInsert.name);
    insertData(toInsert)
        .then(function () {
            console.timeEnd("Getting and inserting data for " + toInsert.name);
            console.time('Updating columns for ' + toInsert.name);
            update()
                .then(function () {
                    console.timeEnd('Updating columns for ' + toInsert.name);
                    console.info("All done setting up " + toInsert.name + "!");
                })
                .catch(function (err) {
                    console.timeEnd('Updating columns for ' + toInsert.name);
                    console.error(err, toInsert.name)
                });
        })
        .catch(function (err) {
            console.timeEnd("Getting and inserting data for " + toInsert.name);
            console.error(err, toInsert.name);
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
    var products = {
        columns: ['nr', 'Artikelid', 'Varnummer', 'Namn', 'Namn2', 'Prisinklmoms', 'Pant', 'Volymiml',
            'PrisPerLiter', 'Saljstart', 'Slutlev', 'Varugrupp', 'Forpackning', 'Forslutning', 'Ursprung',
            'Ursprunglandnamn', 'Producent', 'Leverantor', 'Argang', 'Provadargang', 'Alkoholhalt', 'Sortiment',
            'Ekologisk', 'Etiskt', 'Koscher', 'RavarorBeskrivning'],
        sql: "INSERT INTO products (??)  VALUES ? ON DUPLICATE KEY UPDATE `changed_timestamp` = NOW()",
        url: 'https://www.systembolaget.se/api/assortment/products/xml',
        table: '/mysqlScripts/products.sql',
        name: "Products"
    };
    var stores = {
        columns: ['Typ', 'Nr', 'Namn', 'Address1', 'Address2', 'Address3', 'Address4', 'Address5',
            'Telefon', 'ButiksTyp', 'Tjanster', 'SokOrd', 'Oppettider', 'RT90x', 'RT90y'],
        sql: "INSERT INTO stores (??)  VALUES ? ON DUPLICATE KEY UPDATE `changed_timestamp` = NOW()",
        url: 'http://www.systembolaget.se/api/assortment/stores/xml',
        table: '/mysqlScripts/stores.sql',
        name: 'Stores'
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

        insertDataToDatabase(products);
        insertDataToDatabase(stores);
    }
    setTimeout(() => updateInterval(databaseSetup), Math.min(msTill12, msTill24));
}

//updateInterval(false);