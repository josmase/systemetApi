var exp = {
    query: function (sql, insert, res) {
        databaseQuery(sql, insert, res)
    },
    setup: function () {
        setup();
    },
    insert: function () {
        insert();
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
    password: systemetapi.database.password
});

function databaseQuery(sql, inserts, res) {
    sql = mysql.format(sql, inserts);
    console.log(sql);
    console.log("Query built");
    database.getConnection(function (err, connection) {
        if (err) {
            console.error('error connecting: ' + err.stack);
            return;
        }
        console.log('connected as id ' + connection.threadId);

        connection.query(sql, function (error, results) {
            if (res) {
                if (error) res.json({error: error, success: false});
                else res.json(results);
                connection.release();
                return
            }
            if (error) console.log({error: error, success: false});
            else {
                console.log(results);
            }
        });
    });
}

function setup() {
    fs.readFile(__dirname + '/mysqlScripts/products.sql', function (err, data) {
        if (err)console.log("Failed to read file");
        databaseQuery(data.toString(), null);
    });
}

function insert() {
    console.log("Getting data to insert");
    /* request.get('https://www.systembolaget.se/api/assortment/products/xml', function (error, response, data) {
     if (!error && response.statusCode == 200) {
     */
    fs.readFile(__dirname + '/doodle.xml', function (err, data) {
            if (err)console.log("Failed to read file");

            console.log("Data retrieved");

            var options = {
                object: true,
                reversible: false,
                coerce: true,
                sanitize: true,
                trim: true,
                arrayNotation: false
            };
            var result = parser.toJson(data, options);

            var colummns = ['nr', 'Artikelid', 'Varnummer', 'Namn', 'Namn2', 'Prisinklmoms', 'Pant', 'Volymiml',
                'PrisPerLiter', 'Saljstart', 'Slutlev', 'Varugrupp', 'Forpackning', 'Forslutning', 'Ursprung',
                'Ursprunglandnamn', 'Producent', 'Leverantor', 'Argang', 'Provadargang', 'Alkoholhalt', 'Sortiment',
                'Ekologisk', 'Etiskt', 'Koscher', 'RavarorBeskrivning'];

            var sql = "INSERT INTO products (";
            colummns.forEach(function (currentValue) {
                sql += currentValue + ","
            });
            sql = sql.slice(0, -1);
            sql += ") VALUES ?";
            var inserts = [];
            var articles = result.artiklar.artikel;

            console.log("Building query");

            for (var i = 0; i < articles.length/4; i++) {
                var row = [];
                var keys = Object.keys(articles[i]);
                var sak = 0;
                colummns.forEach(function (currentValue) {
                    if (currentValue == keys[sak]) {
                        if (typeof articles[i][keys[sak]] == 'object') articles[i][keys[sak]] = null;
                        row.push(articles[i][keys[sak]]);
                        sak++
                    }
                    else {
                        row.push(null)
                    }
                });
                inserts.push(row);
            }
            console.log(inserts);
            databaseQuery(sql, [inserts]);

        }
    );
}
