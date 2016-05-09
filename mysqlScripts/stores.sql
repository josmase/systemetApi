CREATE TABLE IF NOT EXISTS stores (
  Typ               TINYTEXT,
  Nr                INT       NOT NULL,
  Namn              TINYTEXT,
  Address1          TINYTEXT,
  Address2          TINYTEXT,
  Address3          TINYINT,
  Address4          TINYTEXT,
  Address5          TINYTEXT,
  ButiksTyp         TINYTEXT,
  Tjanster          TINYTEXT,
  SokOrd            TEXT,
  Oppettider        TEXT,
  Telefon           TINYTEXT,
  RT90x             INT,
  RT90y             INT,
  changed_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (Nr)
);