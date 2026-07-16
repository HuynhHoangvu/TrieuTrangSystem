-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "passengers" INTEGER;

-- AlterTable
ALTER TABLE "VehicleType" ADD COLUMN     "pricingMode" TEXT NOT NULL DEFAULT 'flat';

-- CreateTable
CREATE TABLE "PassengerPrice" (
    "id" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "passengers" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PassengerPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PassengerPrice_typeId_passengers_key" ON "PassengerPrice"("typeId", "passengers");

-- AddForeignKey
ALTER TABLE "PassengerPrice" ADD CONSTRAINT "PassengerPrice_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "VehicleType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
