-- DropIndex
DROP INDEX "PassengerPrice_typeId_passengers_key";

-- AlterTable: add label as nullable first, backfill, then enforce NOT NULL
ALTER TABLE "PassengerPrice" ADD COLUMN     "label" TEXT;
ALTER TABLE "PassengerPrice" ALTER COLUMN "passengers" DROP NOT NULL;

UPDATE "PassengerPrice" SET "label" = "passengers"::text || ' người' WHERE "label" IS NULL;

ALTER TABLE "PassengerPrice" ALTER COLUMN "label" SET NOT NULL;

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "priceOptionId" TEXT;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_priceOptionId_fkey" FOREIGN KEY ("priceOptionId") REFERENCES "PassengerPrice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
