const cluster = require('cluster');
if (cluster.isMaster) {

    // Count the machine's CPUs
    const cpuCount = require('os').cpus().length;

    // Create a worker for each CPU
    for (var i = 0; i < cpuCount; i += 1) {
        cluster.fork();
    }

    cluster.on('online', function(worker) {
        console.log('Worker ' + worker.process.pid + ' is online');
    });

    cluster.on('exit', function (worker) {
      console.log('Worker ' + worker.process.pid + ' died with code: ' + code + ', and signal: ' + signal);
      cluster.fork();
    });

// Code to run if we're in a worker process
} else {
    var express = require('express');
    var app = express();
    var bodyParser = require('body-parser');
    var cors = require('cors');
    var database = require('./database.js');
    var helmet = require('helmet');

    var geocoderProvider = 'google';
    var httpAdapter = 'https';
    var extra = {
        apiKey: 'AIzaSyAz9VB62M7bhTVi5qmToMnrqdbQjq5Xugk',
        formatter: 'json'
    };

    var geocoder = require('node-geocoder')(geocoderProvider, httpAdapter, extra);


    app.use(bodyParser.urlencoded({extended: true}));
    app.use(bodyParser.json());
    app.use(cors());
    app.use(helmet());

    var port = process.env.PORT || 3000;

    var router = express.Router();

    // middleware to use for all requests
    router.use(function (req, res, next) {
        next();
    });

    router.get('/', function (req, res) {
        res.json({message: "Use /products"});
    });

    /**
     * Returns all the products matching the filter
     */
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

    /**
     * returns a product with the matching id
     */
    router.get('/product/:id', function (req, res) {
        var sql = "SELECT * FROM products WHERE Artikelid = ?";
        var inserts = [req.params.id];
        database.query(sql, inserts)
            .then((result) => res.json(result))
            .catch((err) => res.json(err));
    });

    /**
     * Returns all stores in the same town as in the request. Works with latitude and longitude or the name of the city
     */
    router.get('/stores', function (req, res) {
        var position = {
            lat: Number(req.query.lat),
            lon: Number(req.query.lon)
        };
        if (position.lat) {
            geocoder.reverse(position)
                .then(function (response) {
                    var sql = "select * from stores where Address4 like ?";
                    var insert = [response[0].city];
                    database.query(sql, insert)
                        .then((result)=>res.json(result))
                        .catch((error)=>res.json(error))
                })
                .catch(function (err) {
                    res.json({
                        success: false,
                        message: 'Failed to get a position', err
                    });
                });

        }
        else {

            var sql = "SELECT * FROM stores WHERE Address4 like ?";
            var inserts = [req.query.stad];
            database.query(sql, inserts)
                .then((result) => res.json(result))
                .catch((err) => res.json(err));
        }
    });

    /**
     * If last three chars is min or max return matching sql string, otherwise return a string matching by like
     * @param key
     * @param query
     * @returns {*}
     */
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
}
