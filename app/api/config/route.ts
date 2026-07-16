import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSystemConfig } from "@/lib/trips";

// Đọc cấu hình hệ thống dành cho mọi tài khoản đã đăng nhập (tài xế cũng
// cần biết extendMinutes để hiện đúng nút "+X phút"). Ghi cấu hình vẫn chỉ
// admin mới làm được, qua /api/admin/config.
export async function GET() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }
  const config = await getSystemConfig();
  return NextResponse.json({
    tripDurationMinutes: config.tripDurationMinutes,
    extendMinutes: config.extendMinutes,
    allowEarlyRescan: config.allowEarlyRescan,
    bankId: config.bankId,
    bankAccountNumber: config.bankAccountNumber,
    bankAccountName: config.bankAccountName,
  });
}
