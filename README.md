# systemetApi
systemetApi is an api for searching the catalog of systembolaget with more precision and with more options than their own search. 
The api works by importing systembolagets public xml file with all the products listed in it to a MySql database.

##Setup

Download and install [node.js](https://nodejs.org/en/ "Node.js homepage"), [MySql](https://www.mysql.com/ "MySql homepage")

`git clone https://github.com/josmase/systemetApi`

`cd systemetApi`

`npm install`

###linux
`sh mysqlScripts/setupDatabase.sh`

###windows
`mysql -u usernameHere -p < mysqlScripts/products.sql`
Download [systembolagets xml file](http://www.systembolaget.se/api/assortment/products/xml) and rename it to products

`mysql -u usernameHere -p < select @@datadir;`
Move the products.xml to the "systemet" folder in that folder.

`mysql -u usernameHere -p < mysqlScripts/importXml.sql` to import the data from the xml file

To start the api run `node server.js`

