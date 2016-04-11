
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var mysql = require('mysql');
var cors = require('cors');

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cors());

var port = process.env.PORT || 8000;

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

var router = express.Router();

// middleware to use for all requests
router.use(function (req, res, next) {
    next();
});

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

    sql += " ORDER BY apk DESC LIMIT 500";
    databaseQuery(sql, inserts, res);
});
router.get('/products/:id', function (req, res) {
    var sql = "SELECT * FROM products WHERE Artikelid = ?";
    var inserts = [req.params.id];
    databaseQuery(sql, inserts, res);
});

function addToQueryIfExists(key,query) {

    if (key.slice(-3) === "Max" && query[key] >= 0) {
       return{
            sql: " AND ?? < ?",
            value: query[key],
            identifier: key.slice(0,-3)
        }
    }
    else if (key.slice(-3) === "Min" && query[key] >= 0) {
        return {
            sql: " AND ?? > ?",
            value: query[key],
            identifier: key.slice(0,-3)
        }
    }
    else{
        return{
            sql: " AND ?? LIKE ?",
            value: "%"+query[key]+"%",
            identifier: key
        }
    }
}

function databaseQuery(sql, inserts, res) {
    sql = mysql.format(sql, inserts);

    database.connect(function (err) {
        if (err) {
            console.error('error connecting: ' + err.stack);
            return;
        }
        console.log('connected as id ' + database.threadId);
    });

    database.query(sql, function (error, results) {
        if (error) res.json({error:error.code,success:false,query:inserts});
        else res.json(results);
    });

    database.end();
}

app.use('/api', router);

app.listen(port);
console.log('Magic happens on port ' + port);