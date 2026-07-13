import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export interface SessionData {
  userId?: string;
  role?: "admin" | "driver" | "receptionist";
  name?: string;
}

// Phiên đăng nhập kéo dài 400 ngày (giới hạn tối đa trình duyệt cho phép) để
// tài xế/admin không bị tự động đăng xuất.
const SESSION_MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "qlx_session",
  ttl: SESSION_MAX_AGE_SECONDS,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
