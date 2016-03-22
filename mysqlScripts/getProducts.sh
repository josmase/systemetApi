#!/usr/bin/env bash
sudo mysql -u root -p < products.sql
curl https://www.systembolaget.se/api/assortment/products/xml > /tmp/bolaget.xml ; mysql -u root -p -e "LOAD XML LOCAL INFILE '/tmp/bolaget.xml' INTO TABLE products ROWS IDENTIFIED BY '<artikel>';" systemet
mysql -u root -p systemet < update.sql