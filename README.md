# systemetApi
systemetApi is an api for searching the catalogue of systembolaget with more precision and with more options than their own search. 
The api works by importing systembolagets public xml file, with all the products listed in it, to a MySql database.

## Setup

Run `docker-compouse up` in the root of the directory. The following environement variables are used for setting up the database connection (MySQL).

    DB_HOST=database
    DB_PORT=3306
    DB_NAME=bolaget
    DB_USER=bolaget
    DB_PASSWORD=bolaget

## Using the api

### /products

Used to get all the products matching a specific query.
Use the names of the columns as the key and use Min or Max to get a number within a range.

`localhost:8000/api/products?apkMin=1&apkMax=2&Varugrupp=Vin `

To get all the products with a apk between 1 and 2 in the vine category.

`localhost:8000/api/products?PrisinklmomsMin=1&PrisinklmomsMax=200&Namn=dworek `

To get all the prudcts with a price between 1 and 200 with a name like dworek.

### /product/:id

Simply put the Artikelid in the end instead of :id to get the articel with that specific id

`localhost:8000/api/product/1`

To get the product with a Artikelid of 1.

### Columns

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


