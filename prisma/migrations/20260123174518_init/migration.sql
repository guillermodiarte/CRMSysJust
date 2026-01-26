-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'ADMIN',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "ivaPercentage" DECIMAL NOT NULL DEFAULT 21.0,
    "extraTaxPercentage" DECIMAL NOT NULL DEFAULT 3.0,
    "expiryAlertMonths" INTEGER NOT NULL DEFAULT 3,
    "filterYearRange" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProductCatalog" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "listPrice" DECIMAL NOT NULL,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StockBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productCode" TEXT NOT NULL,
    "initialQuantity" INTEGER NOT NULL,
    "currentQuantity" INTEGER NOT NULL,
    "costGross" DECIMAL NOT NULL,
    "taxRate" DECIMAL NOT NULL,
    "extraTaxRate" DECIMAL NOT NULL,
    "shippingCostUnit" DECIMAL NOT NULL DEFAULT 0,
    "incentiveDiscountUnit" DECIMAL NOT NULL DEFAULT 0,
    "expirationDate" DATETIME NOT NULL,
    "entryDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockBatch_productCode_fkey" FOREIGN KEY ("productCode") REFERENCES "ProductCatalog" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT,
    "totalAmount" DECIMAL NOT NULL,
    "isGift" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SaleItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleId" TEXT NOT NULL,
    "productCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceSold" DECIMAL NOT NULL,
    "totalCostBasis" DECIMAL NOT NULL,
    CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleItem_productCode_fkey" FOREIGN KEY ("productCode") REFERENCES "ProductCatalog" ("code") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SaleItemBatchAllocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "saleItemId" TEXT NOT NULL,
    "stockBatchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCostAtTime" DECIMAL NOT NULL,
    CONSTRAINT "SaleItemBatchAllocation_saleItemId_fkey" FOREIGN KEY ("saleItemId") REFERENCES "SaleItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SaleItemBatchAllocation_stockBatchId_fkey" FOREIGN KEY ("stockBatchId") REFERENCES "StockBatch" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "StockBatch_productCode_expirationDate_idx" ON "StockBatch"("productCode", "expirationDate");
