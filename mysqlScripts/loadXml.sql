USE systemet;
LOAD XML LOCAL INFILE 'products.xml'
INTO TABLE products
ROWS IDENTIFIED BY '<artikel>';