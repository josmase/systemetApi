var mysql      = require('mysql');
var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : 'systemet',
    database : 'systemet'
});

connection.connect();

connection.query('SELECT * FROM products limit 10', function(err, rows) {
    if (err) throw err;

    console.log('The solution is: ', rows[0]);
});

connection.end();