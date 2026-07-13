import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.systemConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", tripDurationMinutes: 20, allowEarlyRescan: true },
  });

  await prisma.vehicleType.upsert({
    where: { name: "ATV/Mô tô" },
    update: { pricePerTrip: 800000, durationMode: "timed" },
    create: { name: "ATV/Mô tô", pricePerTrip: 800000, durationMode: "timed" },
  });

  await prisma.vehicleType.upsert({
    where: { name: "Ô tô/Land Cruiser" },
    update: { pricePerTrip: 800000, durationMode: "manual" },
    create: { name: "Ô tô/Land Cruiser", pricePerTrip: 800000, durationMode: "manual" },
  });

  await prisma.vehicleType.upsert({
    where: { name: "Mô tô nhỏ 250cc" },
    update: { pricePerTrip: 600000, durationMode: "timed" },
    create: { name: "Mô tô nhỏ 250cc", pricePerTrip: 600000, durationMode: "timed" },
  });

  const adminPin = await bcrypt.hash("0000", 10);
  await prisma.driver.upsert({
    where: { phone: "0900000000" },
    update: {},
    create: {
      name: "Quản trị viên",
      phone: "0900000000",
      pinHash: adminPin,
      role: "admin",
    },
  });

  const driverPin = await bcrypt.hash("1234", 10);
  const drivers = [
    { name: "Nguyễn Tuấn", phone: "0901111111" },
    { name: "Trần Hùng", phone: "0902222222" },
  ];

  for (const d of drivers) {
    await prisma.driver.upsert({
      where: { phone: d.phone },
      update: {},
      create: {
        name: d.name,
        phone: d.phone,
        pinHash: driverPin,
        role: "driver",
      },
    });
  }

  console.log("Seed hoàn tất.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
