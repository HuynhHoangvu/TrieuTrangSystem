"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AdminTripNotifier from "@/components/AdminTripNotifier";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/vehicles", label: "Xe & loại xe" },
  { href: "/admin/drivers", label: "Tài xế" },
  { href: "/admin/trips", label: "Lượt chạy" },
  { href: "/admin/config", label: "Cấu hình" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const currentLabel = NAV.find((n) => n.href === pathname)?.label ?? "Quản trị";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      {/* Mobile top bar */}
      <header className="flex items-center justify-between border-b border-border bg-white p-4 print:hidden md:hidden">
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Mở menu"
          className="rounded-md border border-border p-2"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <h1 className="text-base font-semibold">{currentLabel}</h1>
        <div className="w-9" />
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-64 shrink-0 flex-col border-r border-border bg-white p-4 flex">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-lg font-semibold">Quản trị</h1>
              <button
                onClick={() => setMenuOpen(false)}
                aria-label="Đóng menu"
                className="rounded-md border border-border p-1.5"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1">
              {NAV.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`rounded-md px-3 py-2 text-sm ${
                      active ? "bg-hover font-medium" : "hover:bg-hover"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <button
              onClick={handleLogout}
              className="mt-4 rounded-md border border-border px-3 py-2 text-sm hover:bg-hover"
            >
              Đăng xuất
            </button>
          </div>
          <div className="flex-1 bg-black/30" onClick={() => setMenuOpen(false)} />
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-white p-4 print:hidden md:flex">
        <h1 className="mb-6 text-lg font-semibold">Quản trị</h1>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-md px-3 py-2 text-sm ${
                  active ? "bg-hover font-medium" : "hover:bg-hover"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={handleLogout}
          className="mt-4 rounded-md border border-border px-3 py-2 text-sm hover:bg-hover"
        >
          Đăng xuất
        </button>
      </aside>

      <div className="min-w-0 flex-1 overflow-y-auto p-4 print:overflow-visible print:p-0 md:p-6">
        {children}
      </div>

      <AdminTripNotifier />
    </div>
  );
}
