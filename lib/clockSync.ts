// Đồng bộ giờ "hiện tại" theo server thay vì tin giờ máy khách (điện thoại có
// thể sai giờ). Mỗi lần fetch trả về, đọc header Date của response để tính
// độ lệch, áp dụng offset đó cho mọi tính toán đếm ngược trên trang.
let offsetMs = 0;

export function updateClockOffsetFromResponse(res: Response) {
  const header = res.headers.get("date");
  if (!header) return;
  const serverTime = new Date(header).getTime();
  if (!Number.isNaN(serverTime)) {
    offsetMs = serverTime - Date.now();
  }
}

export function correctedNow(): number {
  return Date.now() + offsetMs;
}
