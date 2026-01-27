/*
  Warnings:

  - You are about to drop the column `filterYearRange` on the `SystemConfig` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "code" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amount" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProductCatalog" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "listPrice" DECIMAL NOT NULL,
    "offerPrice" DECIMAL NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ProductCatalog" ("code", "createdAt", "description", "imageUrl", "listPrice", "updatedAt") SELECT "code", "createdAt", "description", "imageUrl", "listPrice", "updatedAt" FROM "ProductCatalog";
DROP TABLE "ProductCatalog";
ALTER TABLE "new_ProductCatalog" RENAME TO "ProductCatalog";
CREATE TABLE "new_SystemConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "ivaPercentage" DECIMAL NOT NULL DEFAULT 21.0,
    "extraTaxPercentage" DECIMAL NOT NULL DEFAULT 3.0,
    "expiryAlertMonths" INTEGER NOT NULL DEFAULT 3,
    "filterMinYear" INTEGER NOT NULL DEFAULT 2020,
    "filterMaxYear" INTEGER NOT NULL DEFAULT 2050,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_SystemConfig" ("expiryAlertMonths", "extraTaxPercentage", "id", "ivaPercentage", "updatedAt") SELECT "expiryAlertMonths", "extraTaxPercentage", "id", "ivaPercentage", "updatedAt" FROM "SystemConfig";
DROP TABLE "SystemConfig";
ALTER TABLE "new_SystemConfig" RENAME TO "SystemConfig";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
