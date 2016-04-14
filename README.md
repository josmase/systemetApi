# systemetApi
systemetApi is an api for searching the catalog of systembolaget with more precision and with more options than their own search. 
The api works by importing systembolagets public xml file with all the products listed in it to a MySql database.

##Setup

Download and install [node.js](https://nodejs.org/en/ "Node.js homepage"), [MySql](https://www.mysql.com/ "MySql homepage")

`git clone https://github.com/josmase/systemetApi`

`cd systemetApi`

`npm install`

Create a user and the dabase with the root user and password you set when setting up mysql

`CREATE USER 'systemet'@'localhost' IDENTIFIED BY 'systemet';`

`GRANT ALL PRIVILEGES ON systemet. * TO 'systemet'@'localhost';`

`FLUSH PRIVILEGES;`

`CREATE DATABASE SYSTEMET;`

##Starting the server

To start the api run `node server.js` in the root project directory

##Using the api

To use the api use the url http://localhost:8080/api/products. Then send params using the column name as key. And if the column is a number use column name Max/Min.

`localhost:8080/api/products?apkMin=1&apkMax=2&Varugrupp=Vin `

To get all the products with a apk between 1 and 2 in the vine category.

`localhost:8080/api/products?PrisinklmomsMin=1&PrisinklmomsMax=200&Namn=dworek `

To get all the prudcts with a price between 1 and 200 with a name like dworek.

###Columns

Artikelid          INT NOT NULL,

  nr                 INT,
  
  Varnummer          INT,
  
  Namn               VARCHAR(70),
  
  Namn2              VARCHAR(50),
  
  Prisinklmoms       INT,
  
  Pant               INT,
  
  Volymiml           INT,
  
  PrisPerLiter       INT,
  
  Saljstart          DATE,
  
  Slutlev            DATE,
  
  Varugrupp          VARCHAR(50),
  
  Forpackning        VARCHAR(50),
  
  Forslutning        VARCHAR(50),
  
  Ursprung           VARCHAR(50),
  
  Ursprunglandnamn   VARCHAR(50),
  
  Producent          VARCHAR(200),
  
  Leverantor         VARCHAR(200),
  
  Argang             VARCHAR(10),
  
  Provadargang       VARCHAR(20),
  
  Alkoholhalt        VARCHAR(7),
  
  Sortiment          VARCHAR(10),
  
  Ekologisk          TINYINT,
  
  Etiskt             TINYINT,
  
  Koscher            TINYINT,
  
  RavarorBeskrivning VARCHAR(500),
  
  apk                DECIMAL(5, 2),


