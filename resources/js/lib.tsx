import { Link, router, usePage } from "@inertiajs/react";
import {
    ShoppingBag,
    Wrench,
    Package,
    ReceiptText,
    LogOut,
    PanelsTopLeft,
} from "lucide-react";
import type { ReactNode, FormEvent } from "react";
export type Product = {
    id: number;
    sku: string;
    barcode: string | null;
    name: string;
    price_satang: number;
    stock: number;
    active: boolean;
};
export type Repair = {
    id: number;
    customer_name: string;
    phone: string;
    device: string;
    issue: string;
    serial: string | null;
    status: string;
    price_satang: number | null;
    version: number;
    assignee: { name: string } | null;
    sale: { id: number } | null;
    events: {
        id: number;
        status: string;
        note: string | null;
        actor: { name: string };
        created_at: string;
    }[];
};
export type Sale = {
    id: number;
    total_satang: number;
    tendered_satang: number;
    change_satang: number;
    method: string;
    created_at: string;
    cashier: { name: string };
    repair: { customer_name: string; device: string } | null;
    lines: {
        id: number;
        description: string;
        quantity: number;
        unit_satang: number;
        total_satang: number;
    }[];
};
export type Shared = {
    auth: { user: { id: number; name: string; role: string } };
    flash: { success?: string };
    errors: Record<string, string>;
    demo: boolean;
    [key: string]: unknown;
};
export const money = (value: number) =>
    new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
    }).format(value / 100);
export const date = (value: string) =>
    new Date(value).toLocaleString("th-TH", {
        timeZone: "Asia/Bangkok",
        dateStyle: "short",
        timeStyle: "short",
    });
export function satang(value: string) {
    if (!/^\d+(?:\.\d{1,2})?$/.test(value)) return 0;
    const [whole, fraction = ""] = value.split(".");
    return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
export const labels: Record<string, string> = {
    received: "รับเครื่อง",
    diagnosing: "กำลังตรวจ/ซ่อม",
    waiting_parts: "รออะไหล่",
    ready: "พร้อมรับเงิน/ส่งมอบ",
    delivered: "ส่งมอบแล้ว",
    cancelled: "ยกเลิก",
};
export function postForm(
    event: FormEvent<HTMLFormElement>,
    url: string,
    transform?: (data: Record<string, string | number | null>) => void,
) {
    event.preventDefault();
    const data: Record<string, string | number | null> = Object.fromEntries(
        new FormData(event.currentTarget),
    ) as Record<string, string>;
    transform?.(data);
    router.post(url, data, { preserveScroll: true });
}
export function Layout({
    active,
    children,
}: {
    active: string;
    children: ReactNode;
}) {
    const { auth, flash, errors, demo } = usePage<Shared>().props;
    const role = auth.user.role;
    const nav = [
        {
            href: "/pos",
            label: "ขายหน้าร้าน",
            icon: ShoppingBag,
            key: "pos",
            show: role !== "technician",
        },
        {
            href: "/repairs",
            label: "งานซ่อม",
            icon: Wrench,
            key: "repairs",
            show: true,
        },
        {
            href: "/inventory",
            label: "สินค้าและสต็อก",
            icon: Package,
            key: "inventory",
            show: role === "manager",
        },
        {
            href: "/sales",
            label: "ประวัติการขาย",
            icon: ReceiptText,
            key: "sales",
            show: role !== "technician",
        },
    ];
    return (
        <div className="app">
            <a className="skip" href="#content">
                ข้ามไปเนื้อหา
            </a>
            <aside>
                <Link href="/" className="brand">
                    <span>
                        <PanelsTopLeft />
                    </span>
                    <div>
                        RepairDesk<small>REPAIR & RETAIL WORKSPACE</small>
                    </div>
                </Link>
                <div className="shop-label">
                    WORKSPACE <span>ร้านตัวอย่าง</span>
                </div>
                <nav aria-label="เมนูหลัก">
                    {nav
                        .filter((n) => n.show)
                        .map((n) => (
                            <Link
                                key={n.key}
                                href={n.href}
                                className={active === n.key ? "selected" : ""}
                                aria-current={
                                    active === n.key ? "page" : undefined
                                }
                            >
                                <n.icon size={19} />
                                {n.label}
                            </Link>
                        ))}
                </nav>
                <div className="sidebar-bottom">
                    <strong>{auth.user.name}</strong>
                    <small>
                        {role === "manager"
                            ? "ผู้จัดการ"
                            : role === "cashier"
                              ? "พนักงานขาย"
                              : "ช่างซ่อม"}
                    </small>
                    <button onClick={() => router.post("/logout")}>
                        <LogOut size={16} />
                        ออกจากระบบ
                    </button>
                </div>
            </aside>
            <div className="main">
                <header>
                    <span>
                        RepairDesk{" "}
                        <span className="muted">/ พื้นที่จัดการร้าน</span>
                    </span>
                    <span className="open-badge">ร้านเดียว · THB</span>
                </header>
                <main id="content">
                    {demo && (
                        <div className="demo-banner">
                            โหมดทดลอง · ข้อมูลสมมติ ·
                            ไม่เชื่อมธนาคารหรือรับเงินจริง
                        </div>
                    )}
                    {flash.success && (
                        <div role="status" className="success">
                            {flash.success}
                        </div>
                    )}
                    {Object.keys(errors).length > 0 && (
                        <div role="alert" className="error">
                            {Object.values(errors).map((e, i) => (
                                <p key={i}>{e}</p>
                            ))}
                        </div>
                    )}
                    {children}
                </main>
                <footer>RepairDesk · Built to learn, designed to work.</footer>
            </div>
        </div>
    );
}
