-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StockBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productCode" TEXT NOT NULL,
    "initialQuantity" INTEGER NOT NULL,
    "currentQuantity" INTEGER NOT NULL,
    "costGross" DECIMAL NOT NULL,
    "taxRate" DECIMAL NOT NULL,
    "extraTaxRate" DECIMAL NOT NULL,
    "shippingCostUnit" DECIMAL NOT NULL DEFAULT 0,
    "incentiveDiscountUnit" DECIMAL NOT NULL DEFAULT 0,
    "offerPrice" DECIMAL NOT NULL DEFAULT 0,
    "expirationDate" DATETIME NOT NULL,
    "entryDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockBatch_productCode_fkey" FOREIGN KEY ("productCode") REFERENCES "ProductCatalog" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_StockBatch" ("costGross", "currentQuantity", "entryDate", "expirationDate", "extraTaxRate", "id", "incentiveDiscountUnit", "initialQuantity", "productCode", "shippingCostUnit", "taxRate") SELECT "costGross", "currentQuantity", "entryDate", "expirationDate", "extraTaxRate", "id", "incentiveDiscountUnit", "initialQuantity", "productCode", "shippingCostUnit", "taxRate" FROM "StockBatch";
DROP TABLE "StockBatch";
ALTER TABLE "new_StockBatch" RENAME TO "StockBatch";
CREATE INDEX "StockBatch_productCode_expirationDate_idx" ON "StockBatch"("productCode", "expirationDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
