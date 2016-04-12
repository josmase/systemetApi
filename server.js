var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');
var request = require('request');
var fs = require('fs');
var parser = require('xml2json');
var database = require('./database.js');

//request('http://www.systembolaget.se/api/assortment/products/xml').pipe(fs.createWriteStream('doodle.xml'))

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cors());

var port = process.env.PORT || 8000;


var router = express.Router();

// middleware to use for all requests
router.use(function (req, res, next) {
    next();
});

router.get('/', function (req, res) {

    fs.readFile(__dirname + '/doodle.xml', function (err, data) {
        var options = {
            object: true,
            reversible: false,
            coerce: true,
            sanitize: true,
            trim: true,
            arrayNotation: false
        };
        var result = parser.toJson(data, options);

        var sql = "INSERT INTO products (";
        var inserts = [];
        var articles = result.artiklar.artikel;
        var count = 0;
        var keys = "";

        for (var key in articles[0]) {

            inserts.push(key);
        }
        sql = sql.slice(0,-1);
        sql += ') VALUES ';

        for (var i = 0; i < 5; i++) {
            sql += '(';
            for (var identifier in articles[i]) {
                mysql+= '?,';
                if (typeof articles[i][identifier] == 'object') articles[i][identifier] = null;
                inserts.push(articles[i][identifier]);
            }
            console.log(sql +"before");
            sql = sql.slice(0,-1);
            console.log(sql);
            sql += '),'
        }


        res.json({count: count, apa: sql, article: articles[3]});
        console.log('Done');
    });


    //res.json({message: "Use /products"});
});

router.get('/products', function (req, res) {
    var sql = "SELECT * FROM products WHERE nr > 0";
    var inserts = [];
    var query = "";
    for (var key in req.query) {
        if (req.query.hasOwnProperty(key)) {
            query = addToQueryIfExists(key, req.query);
            sql += query.sql;
            inserts.push(query.identifier);
            inserts.push(query.value);
        }
    }

    sql += " ORDER BY apk DESC LIMIT 500";
    database.query(sql, inserts, res);
});
router.get('/products/:id', function (req, res) {
    var sql = "SELECT * FROM products WHERE Artikelid = ?";
    var inserts = [req.params.id];
    database.query(sql, inserts, res);
});

function addToQueryIfExists(key, query) {

    if (key.slice(-3) === "Max" && query[key] >= 0) {
        return {
            sql: " AND ?? < ?",
            value: query[key],
            identifier: key.slice(0, -3)
        }
    }
    else if (key.slice(-3) === "Min" && query[key] >= 0) {
        return {
            sql: " AND ?? > ?",
            value: query[key],
            identifier: key.slice(0, -3)
        }
    }
    else {
        return {
            sql: " AND ?? LIKE ?",
            value: "%" + query[key] + "%",
            identifier: key
        }
    }
}

app.use('/api', router);

app.listen(port);
console.log('Magic happens on port ' + port);