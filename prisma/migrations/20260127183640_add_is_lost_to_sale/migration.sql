-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Sale" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clientName" TEXT NOT NULL,
    "clientPhone" TEXT,
    "totalAmount" DECIMAL NOT NULL,
    "isGift" BOOLEAN NOT NULL DEFAULT false,
    "isLost" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Sale" ("clientName", "clientPhone", "createdAt", "date", "id", "isGift", "notes", "totalAmount", "updatedAt") SELECT "clientName", "clientPhone", "createdAt", "date", "id", "isGift", "notes", "totalAmount", "updatedAt" FROM "Sale";
DROP TABLE "Sale";
ALTER TABLE "new_Sale" RENAME TO "Sale";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
