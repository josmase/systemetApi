DROP DATABASE IF EXISTS systemet;
CREATE DATABASE systemet;
USE systemet;
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


/*LOAD XML INFILE 'products.xml'
INTO TABLE products
ROWS IDENTIFIED BY '<artikel>';

UPDATE products
SET Alkoholhalt = SUBSTRING(Alkoholhalt, 1, CHAR_LENGTH(Alkoholhalt) - 1)
WHERE Alkoholhalt LIKE '%%';
ALTER TABLE products MODIFY Alkoholhalt DECIMAL(4,2);

ALTER TABLE products ADD apk DECIMAL(5,2);
UPDATE products SET apk = ((Alkoholhalt/100)*Volymiml)/Prisinklmoms;
*/