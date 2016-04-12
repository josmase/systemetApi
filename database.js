var exp = {
    query: function(sql, insert, res) {
        databaseQuery(sql,insert,res)
    }
}

module.exports = exp;

var mysql = require('mysql');
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

    database.getConnection(function(err, connection) {
        if (err) {
            console.error('error connecting: ' + err.stack);
            return;
        }
        console.log('connected as id ' + connection.threadId);

        connection.query(sql, function (error, results) {
            if (error) res.json({error:error.code,success:false,query:inserts});
            else res.json(results);
            connection.release();
        });
    });
}

