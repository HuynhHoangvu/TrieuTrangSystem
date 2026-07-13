"use client";

import { useEffect, useState } from "react";

interface Driver {
  id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
}

export default function AdminDriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [role, setRole] = useState("driver");
  const [error, setError] = useState<string | null>(null);
  const [resetPinFor, setResetPinFor] = useState<string | null>(null);
  const [resetPinValue, setResetPinValue] = useState("");

  async function load() {
    const res = await fetch("/api/admin/drivers");
    setDrivers(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function addDriver(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/drivers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, pin, role }),
    });
    if (!res.ok) {
      setError((await res.json()).error);
      return;
    }
    setName("");
    setPhone("");
    setPin("");
    setRole("driver");
    load();
  }

  async function toggleStatus(driver: Driver) {
    const status = driver.status === "active" ? "inactive" : "active";
    await fetch(`/api/admin/drivers/${driver.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    load();
  }

  async function deleteDriver(id: string) {
    if (!confirm("Xoá tài xế này?")) return;
    const res = await fetch(`/api/admin/drivers/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError((await res.json()).error);
      return;
    }
    load();
  }

  async function submitResetPin(id: string) {
    if (resetPinValue.length < 4) return;
    await fetch(`/api/admin/drivers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: resetPinValue }),
    });
    setResetPinFor(null);
    setResetPinValue("");
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Tài xế</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="rounded-lg border border-border bg-white p-4">
        <div className="mb-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-foreground/60">
              <th className="pb-2">Tên</th>
              <th className="pb-2">SĐT</th>
              <th className="pb-2">Vai trò</th>
              <th className="pb-2">Trạng thái</th>
              <th className="pb-2" />
            </tr>
          </thead>
          <tbody>
            {drivers.map((d) => (
              <tr key={d.id} className="border-t border-border align-top">
                <td className="py-2">{d.name}</td>
                <td className="py-2">{d.phone}</td>
                <td className="py-2">{d.role}</td>
                <td className="py-2">
                  <span className={d.status === "active" ? "text-success" : "text-disabled"}>
                    {d.status === "active" ? "Hoạt động" : "Vô hiệu hoá"}
                  </span>
                </td>
                <td className="py-2">
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex gap-3">
                      <button
                        onClick={() => toggleStatus(d)}
                        className="text-sm text-info hover:underline"
                      >
                        {d.status === "active" ? "Vô hiệu hoá" : "Kích hoạt"}
                      </button>
                      <button
                        onClick={() => setResetPinFor(resetPinFor === d.id ? null : d.id)}
                        className="text-sm text-info hover:underline"
                      >
                        Đặt lại PIN
                      </button>
                      <button
                        onClick={() => deleteDriver(d.id)}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Xoá
                      </button>
                    </div>
                    {resetPinFor === d.id && (
                      <div className="flex gap-2">
                        <input
                          value={resetPinValue}
                          onChange={(e) => setResetPinValue(e.target.value)}
                          placeholder="PIN mới"
                          className="w-24 rounded-md border border-border px-2 py-1 text-sm"
                        />
                        <button
                          onClick={() => submitResetPin(d.id)}
                          className="rounded-md bg-foreground px-2 py-1 text-xs text-white"
                        >
                          Lưu
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        <form onSubmit={addDriver} className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Họ tên"
            className="flex-1 rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info"
            required
          />
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Số điện thoại"
            className="w-40 rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info"
            required
          />
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Mã PIN"
            className="w-28 rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info"
            required
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-info"
          >
            <option value="driver">Tài xế</option>
            <option value="receptionist">Lễ tân</option>
            <option value="admin">Quản trị</option>
          </select>
          <button className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-white hover:opacity-90">
            Thêm tài xế
          </button>
        </form>
      </section>
    </div>
  );
}
