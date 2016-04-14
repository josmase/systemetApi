var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors');
var database = require('./database.js');

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
    res.json({message: "Use /products"});
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
    database.query(sql, inserts)
        .then((result) => res.json(result))
        .catch((err) => res.json(err));
});
router.get('/products/:id', function (req, res) {
    var sql = "SELECT * FROM products WHERE Artikelid = ?";
    var inserts = [req.params.id];
    database.query(sql, inserts)
        .then((result) => res.json(result))
        .catch((err) => res.json(err));
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

setup();
function setup(){
    console.time("Creating database");
    database.setup()
        .then(function () {
            console.timeEnd("Creating database");
            insert();
        })
        .catch(function (err) {
            console.timeEnd("Creating database");
            console.error(err);
        });
}
function insert(){
    console.time("Getting and inserting data");
    database.insert()
        .then(function () {
            console.timeEnd("Getting and inserting data");
            console.time('Updating columns');
            database.update()
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