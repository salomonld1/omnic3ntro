-- AlterTable User: add pricing, adminPermissions, allowReports; remove pricePerMessage
ALTER TABLE "User" ADD COLUMN "pricing" TEXT;
ALTER TABLE "User" ADD COLUMN "adminPermissions" TEXT;
ALTER TABLE "User" ADD COLUMN "allowReports" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable Message: add category
ALTER TABLE "Message" ADD COLUMN "category" TEXT;
