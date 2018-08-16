"use strict";
const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;
const database = require('./database.js');

  const express = require('express');
  const app = express();
  const bodyParser = require('body-parser');
  const cors = require('cors');
  const helmet = require('helmet');

  const geocoderProvider = 'google';
  const httpAdapter = 'https';
  const extra = {
    apiKey: 'AIzaSyAz9VB62M7bhTVi5qmToMnrqdbQjq5Xugk',
    formatter: 'json',
  };

  const geocoder = require('node-geocoder')(geocoderProvider, httpAdapter, extra);

  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.use(cors());
  app.use(helmet());

  const port = process.env.PORT || 3000;

// middleware to use for all requests
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });

  app.get('/', (req, res) => {
    res.json({ message: 'Use /products' });
  });

  /**
   * Returns all the products matching the filter
   */
  app.get('/products', (req, res) => {
    let sql = 'SELECT * FROM products WHERE nr > 0';
    const inserts = [];
    let query = '';
    for (const key in req.query) {
      if (req.query.hasOwnProperty(key)) {
        query = addToQueryIfExists(key, req.query);
        sql += query.sql;
        inserts.push(query.identifier);
        inserts.push(query.value);
      }
    }

    inserts.push(Number.isInteger(req.query.limit) ? req.query.limit : 100);

    sql += ' ORDER BY apk DESC LIMIT ?';
    database.query(sql, inserts)
      .then(result => res.json(result))
      .catch(err => res.json(err));
  });

  /**
   * returns a product with the matching id
   */
  app.get('/product/:id', (req, res) => {
    const sql = 'SELECT * FROM products WHERE Artikelid = ?';
    const inserts = [req.params.id];
    database.query(sql, inserts)
      .then(result => res.json(result))
      .catch(err => res.json(err));
  });

  /**
   * Returns all stores in the same town as in the request. Works with latitude and longitude or the name of the city
   */
  app.get('/stores', (req, res) => {
    const position = {
      lat: Number(req.query.lat),
      lon: Number(req.query.lon),
    };
    if (position.lat) {
      geocoder.reverse(position)
        .then((response) => {
          const sql = 'select * from stores where Address4 like ?';
          const insert = [response[0].city];
          database.query(sql, insert)
            .then(result => res.json(result))
            .catch(error => res.json(error));
        })
        .catch((err) => {
          res.json({
            success: false,
            message: 'Failed to get a position',
            err,
          });
        });
    } else {
      const sql = 'SELECT * FROM stores WHERE Address4 like ?';
      const inserts = [req.query.stad];
      database.query(sql, inserts)
        .then(result => res.json(result))
        .catch(err => res.json(err));
    }
  });

  /**
   * If last three chars is min or max return matching sql string, otherwise return a string matching by like
   * @param key
   * @param query
   * @returns {*}
   */
  function addToQueryIfExists(key, query) {
    if (key.slice(-3) === 'Max' && query[key] >= 0) {
      return {
        sql: ' AND ?? < ?',
        value: query[key],
        identifier: key.slice(0, -3),
      };
    } else if (key.slice(-3) === 'Min' && query[key] >= 0) {
      return {
        sql: ' AND ?? > ?',
        value: query[key],
        identifier: key.slice(0, -3),
      };
    }
    return {
      sql: ' AND ?? LIKE ?',
      value: `%${query[key]}%`,
      identifier: key,
    };
  }

  app.listen(port);
