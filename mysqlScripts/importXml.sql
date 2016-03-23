USE systemet;
LOAD XML INFILE 'products.xml'
INTO TABLE products
ROWS IDENTIFIED BY '<artikel>';