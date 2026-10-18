import { Head, Link } from "@inertiajs/react";
import { Printer, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Layout, money, date, type Sale } from "../lib";
export default function Receipt({ sale }: { sale: Sale }) {
    return (
        <Layout active="sales">
            <Head title={`ใบเสร็จ S-${sale.id}`} />
            <div className="receipt-actions">
                <Link href="/pos" className="secondary">
                    <ArrowLeft size={17} />
                    กลับไปขายหน้าร้าน
                </Link>
                <button className="primary" onClick={() => window.print()}>
                    <Printer size={17} />
                    พิมพ์ใบเสร็จ
                </button>
            </div>
            <article className="receipt panel">
                <div className="receipt-top">
                    <span className="receipt-check">
                        <CheckCircle2 size={30} />
                    </span>
                    <p className="eyebrow">PAYMENT RECORDED</p>
                    <h1>RepairDesk</h1>
                    <p>ใบเสร็จรับเงิน / ตัวอย่างร้าน</p>
                    <strong>S-{String(sale.id).padStart(6, "0")}</strong>
                    <small>
                        {date(sale.created_at)} · {sale.cashier.name}
                    </small>
                </div>
                {sale.repair && (
                    <p className="receipt-customer">
                        ลูกค้า: {sale.repair.customer_name} ·{" "}
                        {sale.repair.device}
                    </p>
                )}
                <div className="receipt-lines">
                    {sale.lines.map((line) => (
                        <div key={line.id}>
                            <span>
                                {line.description}
                                <small>
                                    {line.quantity} × {money(line.unit_satang)}
                                </small>
                            </span>
                            <strong>{money(line.total_satang)}</strong>
                        </div>
                    ))}
                </div>
                <div className="receipt-total">
                    <span>ยอดชำระ</span>
                    <strong>{money(sale.total_satang)}</strong>
                </div>
                <div className="receipt-bottom">
                    <p>
                        <span>วิธีชำระ</span>
                        <strong>
                            {sale.method === "cash"
                                ? "เงินสด"
                                : "โอน (พนักงานตรวจเอง)"}
                        </strong>
                    </p>
                    <p>
                        <span>เงินรับ</span>
                        <strong>{money(sale.tendered_satang)}</strong>
                    </p>
                    <p>
                        <span>เงินทอน</span>
                        <strong>{money(sale.change_satang)}</strong>
                    </p>
                </div>
                <p className="receipt-foot">
                    ขอบคุณที่ใช้บริการ
                    <br />
                    เอกสารตัวอย่าง ไม่ใช่ใบกำกับภาษี
                </p>
            </article>
        </Layout>
    );
}
