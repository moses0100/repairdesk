import { Head, useForm } from "@inertiajs/react";
import { PanelsTopLeft, ArrowRight, ShieldCheck } from "lucide-react";
export default function Login({ demo = false }: { demo?: boolean }) {
    const form = useForm({ email: "", password: "" });
    return (
        <div className="login">
            <Head title="เข้าสู่ระบบ" />
            <div className="login-story">
                <div className="brand">
                    <span>
                        <PanelsTopLeft />
                    </span>
                    RepairDesk
                </div>
                <p className="eyebrow">ONE SHOP. ONE WORKSPACE.</p>
                <h1>
                    งานซ่อมไม่ตกหล่น
                    <br />
                    งานขายไม่สะดุด.
                </h1>
                <p>
                    รับเครื่อง ติดตามงาน และขายอุปกรณ์
                    <br />
                    ในพื้นที่เดียวที่เชื่อมสต็อกกับบิลขาย
                </p>
                <div className="login-notes">
                    <ShieldCheck />
                    <span>
                        บันทึกทุกการขาย
                        <br />
                        <small>ตรวจยอดและประวัติย้อนหลังได้</small>
                    </span>
                </div>
            </div>
            <section className="login-panel">
                <div>
                    <p className="eyebrow">WELCOME BACK</p>
                    <h2>เปิดพื้นที่ทำงานของคุณ</h2>
                    <p className="muted">เข้าสู่ระบบด้วยบัญชีพนักงานร้าน</p>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post("/login");
                        }}
                    >
                        <label>
                            อีเมล
                            <input
                                type="email"
                                autoComplete="username"
                                required
                                value={form.data.email}
                                onChange={(e) =>
                                    form.setData("email", e.target.value)
                                }
                            />
                        </label>
                        <label>
                            รหัสผ่าน
                            <input
                                type="password"
                                autoComplete="current-password"
                                required
                                value={form.data.password}
                                onChange={(e) =>
                                    form.setData("password", e.target.value)
                                }
                            />
                        </label>
                        {form.errors.email && (
                            <p className="error" role="alert">
                                {form.errors.email}
                            </p>
                        )}
                        <button
                            className="primary wide"
                            disabled={form.processing}
                        >
                            {form.processing
                                ? "กำลังเข้าสู่ระบบ…"
                                : "เข้าสู่ระบบ"}
                            <ArrowRight size={18} />
                        </button>
                    </form>
                    {demo && (
                        <div className="demo-login">
                            <strong>ทดลองใช้งานด้วยข้อมูลสมมติ</strong>
                            <p>เลือกบทบาทเพื่อกรอกบัญชีเดโม</p>
                            <div className="row">
                                {[
                                    ["manager", "ผู้จัดการ"],
                                    ["cashier", "พนักงานขาย"],
                                    ["technician", "ช่างซ่อม"],
                                ].map(([key, label]) => (
                                    <button
                                        key={key}
                                        onClick={() =>
                                            form.setData({
                                                email: `${key}@repairdesk.test`,
                                                password:
                                                    "RepairDesk-demo-2026",
                                            })
                                        }
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                            <small>
                                ใช้เฉพาะในเครื่อง · ไม่มีการชำระเงินจริง
                            </small>
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
