var exp = {
    query: function (sql, insert) {
        return new Promise(function (resolve, reject) {
            databaseQuery(sql, insert)
                .then(function (result) {
                    resolve(result)
                })
                .catch(function (err) {
                    reject(err)
                });
        });

    },
    setup: function () {
        return new Promise(function (resolve, reject) {
            setup()
                .then(function (result) {
                    resolve(result)
                })
                .catch(function (err) {
                    reject(err)
                });
        });
    },
    insert: function () {
        return new Promise(function (resolve, reject) {
            insert()
                .then(function (result) {
                    resolve(result)
                })
                .catch(function (err) {
                    reject(err)
                });
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

        sql = mysql.format(sql, inserts);

        database.getConnection(function (err, connection) {
            if (err) {
                reject(err);
            }

            connection.query(sql, function (error, results) {
                connection.release();
                if (error) {
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
            if (err)console.log("Failed to read file");
            databaseQuery(data.toString(), null).then(function (result) {
                resolve(result);
            }).catch(function (err) {
                reject(err);
            });
        });
    });
}

function insert() {
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

                    console.log(articles.length);
                    var columns = ['nr', 'Artikelid', 'Varnummer', 'Namn', 'Namn2', 'Prisinklmoms', 'Pant', 'Volymiml',
                        'PrisPerLiter', 'Saljstart', 'Slutlev', 'Varugrupp', 'Forpackning', 'Forslutning', 'Ursprung',
                        'Ursprunglandnamn', 'Producent', 'Leverantor', 'Argang', 'Provadargang', 'Alkoholhalt', 'Sortiment',
                        'Ekologisk', 'Etiskt', 'Koscher', 'RavarorBeskrivning'];

                    var sql = "INSERT INTO products (??)  VALUES ? ON DUPLICATE KEY UPDATE ??=values(??)";
                    console.log("Building query");
                    var i, j, temparray, chunk = 100;
                    for (i = 0, j = articles.length; i < j; i += chunk) {
                        temparray = articles.slice(i, i + chunk);
                        buildInsertQuery(temparray, columns, sql, inserts)
                            .then(function (data) {
                                databaseQuery(sql, [columns, data, columns[1], columns[1]])
                                    .then((result) => resolve(result))
                                    .catch((err) => reject(err));
                            }).catch(function (err) {
                            reject(err)
                        });
                    }
                }
                else {
                    reject(error)
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
