// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express = require('express');        // call express
var app = express();                 // define our app using express
var bodyParser = require('body-parser');
var mysql = require('mysql');

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

var port = process.env.PORT || 8080;        // set our port

var systemetapi = require('./systemetApi.js');

// Private (Custom) modules
var database = mysql.createConnection({
    host: systemetapi.database.host,
    port: systemetapi.database.port,
    database: systemetapi.database.name,
    user: systemetapi.database.user,
    password: systemetapi.database.password
});

systemetapi.objects.app = app;
systemetapi.objects.database = database;

database.connect(function (err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }
    console.log('connected as id ' + database.threadId);
});

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

// middleware to use for all requests
router.use(function (req, res, next) {
    // do logging
    console.log(req.query);
    next(); // make sure we go to the next routes and don't stop here
});

// test route to make sure everything is working (accessed at GET http://localhost:8080/api)
router.get('/', function (req, res) {
    res.json({message: 'hooray! welcome to our api!'});
});

router.get('/products', function (req, res) {
    var sql = "SELECT * FROM products WHERE nr > 0";
    var inserts = [];
    var query ="";
   for(var key in req.query){
       if(req.query.hasOwnProperty(key)){
          query = addToQueryIfExists(key,req.query);
           sql += query.sql;
           inserts.push(query.identifier);
           inserts.push(query.value);
       }
   }

    sql += " ORDER BY apk DESC LIMIT 10";
    databaseQuery(sql, inserts, res);
});

function addToQueryIfExists(key,query) {
    if (key.slice(-3) === "Max") {
        if (query[key] == 0) {
            query[key] = 10000;
        }
        return {
            sql: " AND ?? < ?",
            value: query[key],
            identifier: key.slice(0,-3)
        }
    }
    else if (key.slice(-3) === "Min") {
        if (query[key] === "") {
            query[key] = 0;
        }
        return {
            sql: " AND ?? > ?",
            value: query[key],
            identifier: key.slice(0,-3)
        }
    }
    else{
        if(query[key] !== ""){
            return{
                sql: " AND ?? LIKE ?",
                value: "%"+query[key]+"%",
                identifier: key
            }
        }
    }
}

function databaseQuery(sql, inserts, res) {
    sql = mysql.format(sql, inserts);
    console.log(sql);
    database.query(sql, function (error, results) {
        if (error) throw error;
        res.json(results);
    });
}


// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);