CREATE TABLE IF NOT EXISTS products (
  Artikelid          INT       NOT NULL,
  nr                 INT,
  Varnummer          INT,
  Namn               VARCHAR(70),
  Namn2              VARCHAR(50),
  Prisinklmoms       INT,
  Pant               INT,
  Volymiml           INT,
  PrisPerLiter       INT,
  Saljstart          DATE,
  Utgått             CHAR(1),
  Varugrupp          VARCHAR(50),
  Typ                VARCHAR(50),
  Stil               VARCHAR(50),
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
  changed_timestamp  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (Artikelid)

);

