
UPDATE products
SET Alkoholhalt = SUBSTRING(Alkoholhalt, 1, CHAR_LENGTH(Alkoholhalt) - 1)
WHERE Alkoholhalt LIKE '%%';

ALTER TABLE products MODIFY Alkoholhalt DECIMAL(4,2);

UPDATE products SET apk = ((Alkoholhalt/100)*Volymiml)/Prisinklmoms;

