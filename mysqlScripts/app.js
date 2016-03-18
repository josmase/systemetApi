var mysql      = require('mysql');
var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : 'systemet',
    database : 'systemet'
});

connection.connect(function(err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }

    console.log('connected as id ' + connection.threadId);
});

var options = ['*','Artikelid','1'];

connection.query('SELECT ?? FROM `products` WHERE ?? = ?', options, function(err, rows) {
    if (err) throw err;

    console.log( rows[0]);
});

connection.end();