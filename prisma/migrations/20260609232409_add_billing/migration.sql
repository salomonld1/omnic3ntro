-- AlterTable
ALTER TABLE "User" ADD COLUMN "balance" REAL;
ALTER TABLE "User" ADD COLUMN "balanceExpiresAt" DATETIME;
ALTER TABLE "User" ADD COLUMN "billingType" TEXT;
ALTER TABLE "User" ADD COLUMN "creditLimit" REAL;

-- CreateTable
CREATE TABLE "BalanceTransaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" DATETIME,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BalanceTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
