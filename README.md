# TrieuTrangSystem — Quản lý xe địa hình bãi biển

Hệ thống quản lý xe địa hình (ATV, mô tô, ô tô/Land Cruiser) cho dịch vụ cho thuê xe bãi biển: quét QR nhận/trả xe, tự động chốt lượt và tính tiền, dashboard doanh thu, quản lý xe/tài xế/cấu hình.

## Nghiệp vụ chính

- **Xe tính giờ** (ATV, mô tô): quét QR lấy xe → hệ thống tự đếm ngược và chốt lượt sau X phút (cấu hình được), quét lại trước khi hết giờ sẽ mở thêm lượt mới.
- **Xe chạy thoải mái** (ô tô/Land Cruiser): quét QR lần 1 = nhận xe, quét lần 2 trên cùng xe đó = trả xe (chốt lượt), không giới hạn thời gian.
- Trang Admin: quản lý xe & loại xe (giá, chế độ thời gian), tạo hàng loạt xe + mã QR để in dán, quản lý tài xế, cấu hình hệ thống, quản lý/sửa/huỷ lượt chạy, dashboard doanh thu theo ngày/tuần/tháng/tài xế/xe.

## Công nghệ

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Prisma ORM + PostgreSQL
- iron-session (đăng nhập số điện thoại + mã PIN)
- html5-qrcode (quét QR camera), qrcode (tạo QR để in)
- node-cron (tự động chốt lượt quá hạn)

## Chạy local

1. Tạo file `.env` với `DATABASE_URL` (Postgres) và `SESSION_SECRET`.
2. Cài đặt & khởi tạo:
   ```bash
   npm install
   npx prisma migrate dev
   npx prisma db seed
   npm run dev
   ```
3. Mở `http://localhost:3000`.

## Deploy

Build production tự chạy `prisma generate && prisma migrate deploy && next build` — chỉ cần cấu hình `DATABASE_URL` và `SESSION_SECRET` trên nền tảng hosting (VD: Vercel + Neon/Supabase Postgres).
