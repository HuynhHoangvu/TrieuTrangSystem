import { NextResponse } from "next/server";
import { closeExpiredTrips } from "@/lib/trips";

export async function POST() {
  await closeExpiredTrips();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  await closeExpiredTrips();
  return NextResponse.json({ ok: true });
}
