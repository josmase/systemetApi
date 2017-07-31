 const exp = {
   query(sql, insert) {
     return databaseQuery(sql, insert);
   },
   setup() {
     updateInterval(false);
   },
 };
 module.exports = exp;

 const mysql = require('mysql');
 const request = require('request');
 const fs = require('fs');
 const systemetapi = require('./systemetApi.js');

 const database = mysql.createPool({
   host: systemetapi.database.host,
   port: systemetapi.database.port,
   database: systemetapi.database.name,
   user: systemetapi.database.user,
   password: systemetapi.database.password,
   connectionLimit: 100,
 });
/**
 * Send and return the result of a formatted query
 * @param {string} sql - The unformatted sql string
 * @param {object} inserts - The value to insert into the sql string
 * @returns {Promise}
 */
 function databaseQuery(sql, inserts) {
   return new Promise((resolve, reject) => {
     if (inserts) {
       sql = mysql.format(sql, inserts);
     }
     database.getConnection((err, connection) => {
       if (err) {
         reject(err);
       }

       connection.query(sql, (error, results) => {
         connection.release();
         if (error) {
           reject(error);
         } else {
           resolve(results);
         }
       });
     });
   });
 }

/**
 * Reads a sql file with the name of the table param and runs the file. Used for
 * creating the tables needed
 * @param {string} table - Name of the table to read
 * @returns {Promise}
 */
 function createTables(table) {
   return new Promise((resolve, reject) => {
     fs.readFile(__dirname + table, (err, data) => {
       if (err) { reject(err); }
       databaseQuery(data.toString(), null)
        .then((result) => {
          resolve(result);
        })
        .catch((err) => {
          reject(`Unable to query database: ${err}`);
        });
     });
   });
 }
/** Convert fs.writefile to a promise
 * @param {string} path - path including filename for the file to write
 * @param {string} data - the data to write to the file
 * @return {promise}
 */
 function writeFile(path, data) {
   return new Promise((resolve, reject) => {
     fs.writeFile(path, data, (err) => {
       if (err) {
         reject(err);
       }
       resolve();
     });
   });
 }

/**
 * Gets data from an URL and returns a promise
 *@param {string} url - The url
 *@return {promise}
 */
 function getUrl(url) {
   return new Promise((resolve, reject) => {
     request.get(url, (err, response, data) => {
       if (!err && response.statusCode == 200) {
         resolve(data);
       }
       reject(err);
     });
   });
 }

/**
 * Reads and runs the update.sql file used for updating the type of columns and
 * the data in them
 * @returns {Promise}
 */
 function update() {
   return new Promise((resolve, reject) => {
     const path = `${__dirname}/mysqlScripts/update.sql`;

     fs.readFile(path, (err, data) => {
       const sql = data.toString()
        .replace(/(\r\n|\n|\r)/gm, ' ')
        .split(';');
       sql.pop();
       for (let i = 0, j = sql.length; i < j; i++) {
         databaseQuery(sql[i]).catch(err =>
          reject(err));
       }
       resolve();
     });
   });
 }

/**
 * Create the table specified in toInsert.name
 * @param {object} toInsert - Object containing the name of the table to setup
 */
 function createTable(toInsert) {
   console.time(`Creating ${toInsert.name}`);
   createTables(toInsert.table)
    .then(() => {
      console.timeEnd(`Creating ${toInsert.name}`);
      insertFromUrl(toInsert);
    })
    .catch((err) => {
      console.timeEnd(`Creating ${toInsert.name}`);
      console.error(err, toInsert.name);
    });
 }

/**
 * Starts a timer and runs insertData
 * @param {object} toInsert Contains the name of the table to insert data to
 */
 function insertFromUrl(toInsert) {
   const path = `${__dirname}/${toInsert.name}.xml`;
   console.time(`Getting file from url ${toInsert.url}`);

   getUrl(toInsert.url)
    .then((data) => {
      console.timeEnd(`Getting file from url ${toInsert.url}`);
      console.time(`Inserting data for ${toInsert.name}`);

      return writeFile(path, data);
    })
    .then(() => {
      const inserts = [path, toInsert.name, toInsert.identifier];

      return databaseQuery(toInsert.sql, inserts);
    })
    .then((data) => {
      console.timeEnd(`Inserting data for ${toInsert.name}`);
      console.time(`Updating columns for ${toInsert.name}`);

      return update();
    })
    .then(() => {
      console.timeEnd(`Updating columns for ${toInsert.name}`);
      console.info(`All done setting up ${toInsert.name}!`);
    })
    .catch((err) => {
      console.error(err, toInsert.name);
    });
 }

/**
 * At first run it runs databaseSetup and insertToDatabase. Then runs itself at
 * 12:00 and 24:00 but only runs insertToDatabase
 * @param {boolean} databaseSetup - If false databaseSetup has not been run,
 * otherwise it has been run.
 */
 function updateInterval(databaseSetup) {
   const products =
     {
       sql: 'LOAD XML LOCAL INFILE ? INTO TABLE ?? ROWS IDENTIFIED BY ? set `changed_timestamp` = NOW()',
       url: 'http://www.systembolaget.se/api/assortment/products/xml',
       table: '/mysqlScripts/products.sql',
       name: 'products',
       identifier: '<artikel>',
     };
   const stores =
     {
       sql: 'LOAD XML LOCAL INFILE ? INTO TABLE ?? ROWS IDENTIFIED BY ? set `changed_timestamp` = NOW()',
       url: 'http://www.systembolaget.se/api/assortment/stores/xml',
       table: '/mysqlScripts/stores.sql',
       name: 'stores',
       identifier: '<ButikOmbud>',
     };

   const now = new Date();
   let msTo24 = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
      24, 0, 0, 0) -
    now;
   let msTo12 = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
      12, 0, 0, 0) -
    now;

   if (msTo12 < 0) {
     msTo12 += 86400000;
   }
   if (msTo24 < 0) {
     msTo24 += 86400000;
   }
   if (!databaseSetup) {
     createTable(products);
     createTable(stores);
     databaseSetup = true;
   }
   if (Math.min(msTo12, msTo24) < 5000) {
     insertFromUrl(products);
     insertFromUrl(stores);
   }
   setTimeout(() => updateInterval(databaseSetup),
    Math.min(msTo12, msTo24));
 }
