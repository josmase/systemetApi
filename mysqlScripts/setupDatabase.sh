#!/usr/bin/env bash
read -s -p "Password to use for mysql:" password
sudo mysql -u root -p$password < products.sql
curl https://www.systembolaget.se/api/assortment/products/xml > /tmp/bolaget.xml ; mysql -u root -p$password -e "LOAD XML LOCAL INFILE '/tmp/bolaget.xml' INTO TABLE products ROWS IDENTIFIED BY '<artikel>';" systemet
mysql -u root -p$password systemet < update.sql