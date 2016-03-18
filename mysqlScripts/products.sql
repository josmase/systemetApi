DROP TABLE IF EXISTS products;
CREATE TABLE products (
  Artikelid INT NOT NULL PRIMARY KEY,
  nr  INT,
  Varnummer INT,
  Namn VARCHAR(50),
  Namn2 VARCHAR(50),
  Prisinklmoms INT,
  Volymiml INT,
  PrisPerLiter INT,
  Saljstart DATE,
  Slutlev DATE,
  Varugrupp VARCHAR(50),
  Forpackning VARCHAR(50),
  Forslutning VARCHAR(50),
  Ursprung VARCHAR(50),
  Ursprunglandnamn VARCHAR(50),
  Producent VARCHAR(200),
  Leverantor VARCHAR(200),
  Argang VARCHAR(10),
  Provadargang VARCHAR(20),
  Alkoholhalt VARCHAR(7),
  Sortiment VARCHAR(10),
  Ekologisk TINYINT,
  Etiskt TINYINT,
  Koscher TINYINT,
  RavarorBeskrivning VARCHAR(300)
);


LOAD XML INFILE 'products.xml'
INTO TABLE products
ROWS IDENTIFIED BY '<artikel>';

SELECT Artikelid FROM products limit 10;