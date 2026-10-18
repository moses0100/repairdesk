import { Head, Link, router, usePage } from "@inertiajs/react";
import { useState } from "react";
import {
    Search,
    Plus,
    Minus,
    Package,
    ShoppingBag,
    Trash2,
    CreditCard,
    Banknote,
    Wrench,
    ArrowUpRight,
    ReceiptText,
} from "lucide-react";
import {
    Layout,
    money,
    date,
    satang,
    labels,
    postForm,
    type Product,
    type Repair,
    type Sale,
    type Shared,
} from "../lib";
type Pager<T> = {
    data: T[];
    prev_page_url: string | null;
    next_page_url: string | null;
    total: number;
};
type Props = {
    page: string;
    products?: Product[];
    readyRepairs?: {
        id: number;
        device: string;
        price_satang: number | null;
    }[];
    repairs?: Pager<Repair>;
    technicians?: { id: number; name: string }[];
    sales?: Pager<Sale>;
    today?: number;
    movements?: {
        id: number;
        product_id: number;
        delta: number;
        reason: string;
        actor: { name: string };
        created_at: string;
    }[];
};
const transitions: Record<string, string[]> = {
    received: ["diagnosing", "cancelled"],
    diagnosing: ["waiting_parts", "ready", "cancelled"],
    waiting_parts: ["diagnosing", "ready", "cancelled"],
    ready: ["diagnosing", "delivered", "cancelled"],
    delivered: [],
    cancelled: [],
};
export default function Workspace(props: Props) {
    const { page } = props;
    const title =
        {
            pos: "ขายหน้าร้าน",
            repairs: "จัดการงานซ่อม",
            inventory: "สินค้าและสต็อก",
            sales: "ประวัติการขาย",
        }[page] || "หน้าร้าน";
    return (
        <Layout active={page}>
            <Head title={title} />
            <div className="page-heading">
                <div>
                    <p className="eyebrow">
                        {page === "pos"
                            ? "POINT OF SALE"
                            : page === "repairs"
                              ? "REPAIR WORKFLOW"
                              : page === "inventory"
                                ? "INVENTORY"
                                : "SALES HISTORY"}
                    </p>
                    <h1>{title}</h1>
                    <p className="muted">
                        {page === "pos"
                            ? "เลือกสินค้า ตรวจยอด แล้วรับชำระในบิลเดียว"
                            : page === "repairs"
                              ? "ติดตามเครื่องตั้งแต่รับซ่อมจนส่งมอบ"
                              : page === "inventory"
                                ? "จัดการสินค้าและบันทึกทุกความเคลื่อนไหว"
                                : "ใบเสร็จและยอดรับชำระที่ตรวจย้อนหลังได้"}
                    </p>
                </div>
                <span className="workspace-date">
                    {new Date().toLocaleDateString("th-TH", {
                        dateStyle: "long",
                    })}
                </span>
            </div>
            {page === "pos" ? (
                <Pos
                    products={props.products || []}
                    repairs={props.readyRepairs || []}
                />
            ) : page === "inventory" ? (
                <Inventory {...props} />
            ) : page === "repairs" ? (
                <Repairs {...props} />
            ) : (
                <Sales {...props} />
            )}
        </Layout>
    );
}
function Pos({
    products,
    repairs,
}: {
    products: Product[];
    repairs: NonNullable<Props["readyRepairs"]>;
}) {
    const [query, setQuery] = useState("");
    const [cart, setCart] = useState<Record<number, number>>({});
    const [method, setMethod] = useState("cash");
    const [tender, setTender] = useState("");
    const [busy, setBusy] = useState(false);
    const [key, setKey] = useState(() => crypto.randomUUID());
    const [repair, setRepair] = useState<number | null>(
        () =>
            Number(new URLSearchParams(window.location.search).get("repair")) ||
            null,
    );
    const selected = products.filter((p) => cart[p.id]);
    const repairJob = repairs.find((r) => r.id === repair);
    const total =
        selected.reduce((sum, p) => sum + p.price_satang * cart[p.id], 0) +
        (repairJob?.price_satang || 0);
    const paid = satang(tender);
    const filtered = products.filter((p) =>
        `${p.name} ${p.sku} ${p.barcode || ""}`
            .toLowerCase()
            .includes(query.trim().toLowerCase()),
    );
    function add(p: Product, delta: number) {
        setCart((current) => ({
            ...current,
            [p.id]: Math.max(
                0,
                Math.min(p.stock, 999, (current[p.id] || 0) + delta),
            ),
        }));
    }
    function reset() {
        setCart({});
        setTender("");
        setRepair(null);
        setKey(crypto.randomUUID());
    }
    return (
        <div className="pos-grid">
            <section>
                <div className="catalog-toolbar">
                    <label className="search">
                        <Search size={19} />
                        <input
                            aria-label="ค้นหาสินค้า"
                            placeholder="ชื่อสินค้า, SKU หรือบาร์โค้ด…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </label>
                    <span>{filtered.length} สินค้า</span>
                </div>
                <div className="product-grid">
                    {filtered.map((p, i) => (
                        <button
                            className="product-card"
                            key={p.id}
                            disabled={!p.stock || busy}
                            onClick={() => add(p, 1)}
                            aria-label={`เพิ่ม ${p.name}`}
                        >
                            <div className={`product-image tint-${i % 3}`}>
                                <Package size={40} strokeWidth={1.3} />
                                <span>{p.sku}</span>
                            </div>
                            <div className="product-info">
                                <small>
                                    {p.stock
                                        ? "คงเหลือ " + p.stock + " ชิ้น"
                                        : "สินค้าหมด"}
                                </small>
                                <h3>{p.name}</h3>
                                <div>
                                    <strong>{money(p.price_satang)}</strong>
                                    <span className="add-dot">
                                        <Plus size={18} />
                                    </span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
                {!filtered.length && (
                    <div className="empty">
                        <Package />
                        <h3>ไม่พบสินค้า</h3>
                        <p>ลองค้นชื่อหรือรหัสอื่น</p>
                    </div>
                )}
            </section>
            <section className="cart panel">
                <div className="panel-heading">
                    <div>
                        <ShoppingBag size={19} />
                        <h2>รายการขาย</h2>
                    </div>
                    <button
                        className="text-button"
                        disabled={busy}
                        onClick={reset}
                    >
                        เริ่มบิลใหม่
                    </button>
                </div>
                <div className="cart-lines">
                    {!selected.length && !repairJob && (
                        <div className="empty">
                            <ShoppingBag size={38} />
                            <h3>ยังไม่มีสินค้าในบิล</h3>
                            <p>เลือกสินค้าทางซ้ายเพื่อเริ่มขาย</p>
                        </div>
                    )}
                    {selected.map((p) => (
                        <div className="cart-line" key={p.id}>
                            <div>
                                <strong>{p.name}</strong>
                                <small>{money(p.price_satang)} / ชิ้น</small>
                                <div className="quantity">
                                    <button
                                        aria-label={`ลด ${p.name}`}
                                        disabled={busy}
                                        onClick={() => add(p, -1)}
                                    >
                                        <Minus size={14} />
                                    </button>
                                    <span>{cart[p.id]}</span>
                                    <button
                                        aria-label={`เพิ่มจำนวน ${p.name}`}
                                        disabled={
                                            busy ||
                                            cart[p.id] >= p.stock ||
                                            cart[p.id] >= 999
                                        }
                                        onClick={() => add(p, 1)}
                                    >
                                        <Plus size={14} />
                                    </button>
                                </div>
                            </div>
                            <div>
                                <strong>
                                    {money(p.price_satang * cart[p.id])}
                                </strong>
                                <button
                                    className="icon-button"
                                    aria-label={`ลบ ${p.name}`}
                                    disabled={busy}
                                    onClick={() =>
                                        setCart((c) => ({ ...c, [p.id]: 0 }))
                                    }
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </div>
                    ))}
                    {repairJob && (
                        <div className="cart-line">
                            <div>
                                <strong>
                                    ค่าซ่อม R-
                                    {String(repairJob.id).padStart(6, "0")}
                                </strong>
                                <small>{repairJob.device}</small>
                            </div>
                            <strong>
                                {money(repairJob.price_satang || 0)}
                            </strong>
                        </div>
                    )}
                </div>
                <label className="repair-select">
                    รวมค่าซ่อมที่พร้อมรับเงิน
                    <select
                        value={repair || ""}
                        disabled={busy}
                        onChange={(e) =>
                            setRepair(Number(e.target.value) || null)
                        }
                    >
                        <option value="">ไม่รวมค่าซ่อม</option>
                        {repairs.map((r) => (
                            <option key={r.id} value={r.id}>
                                R-{r.id} · {r.device}
                                {r.price_satang
                                    ? " · " + money(r.price_satang)
                                    : " · ยังไม่ระบุราคา"}
                            </option>
                        ))}
                    </select>
                </label>
                <div className="checkout-area">
                    <div className="total-row">
                        <span>ยอดชำระ</span>
                        <strong>{money(total)}</strong>
                    </div>
                    <div className="payment-methods">
                        {[
                            ["cash", "เงินสด"],
                            ["transfer", "โอน (บันทึกเอง)"],
                        ].map(([value, label]) => (
                            <button
                                key={value}
                                aria-pressed={method === value}
                                onClick={() => {
                                    setMethod(value);
                                    setTender("");
                                }}
                                disabled={busy}
                            >
                                {value === "cash" ? (
                                    <Banknote size={17} />
                                ) : (
                                    <CreditCard size={17} />
                                )}{" "}
                                {label}
                            </button>
                        ))}
                    </div>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            setBusy(true);
                            router.post(
                                "/checkout",
                                {
                                    idempotency_key: key,
                                    items: selected.map((p) => ({
                                        product_id: p.id,
                                        quantity: cart[p.id],
                                    })),
                                    repair_id: repairJob?.id || null,
                                    method,
                                    tendered_satang: paid,
                                },
                                { onFinish: () => setBusy(false) },
                            );
                        }}
                    >
                        <label>
                            {method === "cash"
                                ? "เงินที่รับ (บาท)"
                                : "ยอดโอนที่ตรวจแล้ว (บาท)"}
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                required
                                value={tender}
                                disabled={busy}
                                onChange={(e) => setTender(e.target.value)}
                                placeholder="0.00"
                                inputMode="decimal"
                            />
                        </label>
                        <p className="change-row">
                            <span>
                                {method === "cash"
                                    ? "เงินทอน"
                                    : "ยอดที่ต้องตรง"}
                            </span>
                            <strong>
                                {money(
                                    method === "cash"
                                        ? Math.max(0, paid - total)
                                        : total,
                                )}
                            </strong>
                        </p>
                        <button
                            className="primary wide"
                            disabled={
                                busy ||
                                !total ||
                                paid < total ||
                                (method === "transfer" && paid !== total)
                            }
                        >
                            <ReceiptText size={18} />
                            {busy ? "กำลังบันทึก…" : "รับชำระและออกใบเสร็จ"}
                        </button>
                    </form>
                    <small className="muted">
                        ยอดโอนเป็นการบันทึกโดยพนักงาน
                        ไม่มีการตรวจธนาคารอัตโนมัติ
                    </small>
                </div>
            </section>
        </div>
    );
}
function Inventory({ products = [], movements = [] }: Props) {
    return (
        <>
            <div className="stats">
                <div>
                    <small>รายการสินค้า</small>
                    <strong>{products.length}</strong>
                </div>
                <div>
                    <small>จำนวนคงเหลือรวม</small>
                    <strong>
                        {products.reduce((sum, p) => sum + p.stock, 0)}{" "}
                        <em>ชิ้น</em>
                    </strong>
                </div>
                <div>
                    <small>สินค้าใกล้หมด (≤ 5)</small>
                    <strong>
                        {products.filter((p) => p.stock <= 5).length}
                    </strong>
                </div>
            </div>
            <div className="two-col">
                <section className="panel pad">
                    <h2>เพิ่มสินค้า</h2>
                    <form
                        onSubmit={(e) =>
                            postForm(e, "/products", (data) => {
                                data.price_satang = satang(String(data.price));
                                delete data.price;
                                data.stock = Number(data.stock);
                            })
                        }
                    >
                        <div className="form-grid">
                            <label>
                                SKU
                                <input name="sku" required maxLength={50} />
                            </label>
                            <label>
                                บาร์โค้ด (ถ้ามี)
                                <input name="barcode" maxLength={50} />
                            </label>
                            <label className="full">
                                ชื่อสินค้า
                                <input
                                    name="name"
                                    required
                                    minLength={2}
                                    maxLength={150}
                                />
                            </label>
                            <label>
                                ราคาขาย (บาท)
                                <input
                                    name="price"
                                    type="number"
                                    min="0.01"
                                    step="0.01"
                                    required
                                />
                            </label>
                            <label>
                                สต็อกเริ่มต้น
                                <input
                                    name="stock"
                                    type="number"
                                    min="0"
                                    max="100000"
                                    step="1"
                                    required
                                    defaultValue={0}
                                />
                            </label>
                        </div>
                        <button className="primary">
                            <Plus size={16} />
                            เพิ่มสินค้า
                        </button>
                    </form>
                </section>
                <section className="panel pad">
                    <h2>ปรับสต็อก</h2>
                    <p className="muted">
                        รับของเข้าใช้จำนวนบวก / ปรับลดใช้จำนวนลบ
                    </p>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            const data = Object.fromEntries(
                                new FormData(e.currentTarget),
                            );
                            router.post(
                                `/products/${data.product_id}/adjust`,
                                {
                                    delta: Number(data.delta),
                                    reason: String(data.reason),
                                },
                                { preserveScroll: true },
                            );
                        }}
                    >
                        <label>
                            สินค้า
                            <select name="product_id" required>
                                <option value="">เลือกสินค้า</option>
                                {products.map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} · คงเหลือ {p.stock}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            จำนวนที่ปรับ
                            <input
                                name="delta"
                                type="number"
                                required
                                step="1"
                                min="-100000"
                                max="100000"
                            />
                        </label>
                        <label>
                            เหตุผล
                            <input
                                name="reason"
                                required
                                minLength={3}
                                maxLength={200}
                            />
                        </label>
                        <button className="primary">บันทึกการปรับสต็อก</button>
                    </form>
                </section>
            </div>
            <section className="panel table-panel">
                <h2>สินค้าทั้งหมด</h2>
                <div className="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>SKU</th>
                                <th>สินค้า</th>
                                <th>บาร์โค้ด</th>
                                <th>ราคาขาย</th>
                                <th>คงเหลือ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((p) => (
                                <tr key={p.id}>
                                    <td>{p.sku}</td>
                                    <td>{p.name}</td>
                                    <td>{p.barcode || "—"}</td>
                                    <td>{money(p.price_satang)}</td>
                                    <td>
                                        <span
                                            className={
                                                p.stock <= 5
                                                    ? "badge warning"
                                                    : "badge"
                                            }
                                        >
                                            {p.stock} ชิ้น
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
            <section className="panel table-panel">
                <h2>ความเคลื่อนไหวล่าสุด</h2>
                <div className="table-scroll">
                    <table>
                        <thead>
                            <tr>
                                <th>เวลา</th>
                                <th>สินค้า</th>
                                <th>เปลี่ยนแปลง</th>
                                <th>เหตุผล</th>
                                <th>ผู้บันทึก</th>
                            </tr>
                        </thead>
                        <tbody>
                            {movements.map((m) => (
                                <tr key={m.id}>
                                    <td>{date(m.created_at)}</td>
                                    <td>
                                        {
                                            products.find(
                                                (p) => p.id === m.product_id,
                                            )?.name
                                        }
                                    </td>
                                    <td>
                                        {m.delta > 0 ? "+" : ""}
                                        {m.delta}
                                    </td>
                                    <td>{m.reason}</td>
                                    <td>{m.actor.name}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </>
    );
}
function Repairs({ repairs, technicians = [] }: Props) {
    const { auth } = usePage<Shared>().props;
    const tech = auth.user.role === "technician";
    return (
        <>
            {!tech && (
                <details className="panel pad new-repair">
                    <summary>
                        <Plus size={18} />
                        รับเครื่องซ่อมใหม่
                    </summary>
                    <form
                        onSubmit={(e) =>
                            postForm(e, "/repairs", (data) => {
                                data.assignee_id = data.assignee_id
                                    ? Number(data.assignee_id)
                                    : null;
                            })
                        }
                    >
                        <div className="form-grid">
                            <label>
                                ชื่อลูกค้า
                                <input
                                    name="customer_name"
                                    required
                                    maxLength={120}
                                />
                            </label>
                            <label>
                                เบอร์โทร
                                <input
                                    name="phone"
                                    type="tel"
                                    required
                                    minLength={8}
                                    maxLength={30}
                                />
                            </label>
                            <label>
                                ยี่ห้อ / รุ่น
                                <input name="device" required maxLength={120} />
                            </label>
                            <label>
                                Serial / IMEI (ถ้ามี)
                                <input name="serial" maxLength={80} />
                            </label>
                            <label className="full">
                                อาการ / ปัญหา
                                <textarea
                                    name="issue"
                                    required
                                    minLength={5}
                                    maxLength={2000}
                                />
                            </label>
                            <label>
                                มอบหมายช่าง
                                <select name="assignee_id">
                                    <option value="">ยังไม่มอบหมาย</option>
                                    {technicians.map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                        <button className="primary">
                            <Wrench size={17} />
                            บันทึกรับเครื่อง
                        </button>
                    </form>
                </details>
            )}
            <div className="repair-heading">
                <h2>{tech ? "งานที่ได้รับมอบหมาย" : "รายการซ่อมทั้งหมด"}</h2>
                <span className="muted">{repairs?.total || 0} งาน</span>
            </div>
            <div className="repair-list">
                {repairs?.data.map((job) => (
                    <details className="panel repair-card" key={job.id}>
                        <summary>
                            <div className="repair-icon">
                                <Wrench size={21} />
                            </div>
                            <div className="repair-title">
                                <small>
                                    R-{String(job.id).padStart(6, "0")}
                                </small>
                                <h3>{job.device}</h3>
                                <p>
                                    {job.customer_name} · {job.phone}
                                </p>
                            </div>
                            <span
                                className={`badge ${job.status === "ready" ? "green" : ""}`}
                            >
                                {labels[job.status]}
                            </span>
                        </summary>
                        <div className="repair-body">
                            <div>
                                <p>
                                    <strong>อาการ: </strong>
                                    {job.issue}
                                </p>
                                <p>
                                    <strong>Serial: </strong>
                                    {job.serial || "—"}
                                </p>
                                <p>
                                    <strong>ช่าง: </strong>
                                    {job.assignee?.name || "ยังไม่มอบหมาย"}
                                </p>
                                <p>
                                    <strong>ค่าซ่อม: </strong>
                                    {job.price_satang
                                        ? money(job.price_satang)
                                        : "รอประเมิน"}
                                </p>
                                {job.sale && (
                                    <p className="badge green">
                                        ชำระแล้ว · บิล #{job.sale.id}
                                    </p>
                                )}
                                <h3 className="subheading">ประวัติงาน</h3>
                                <ol className="timeline">
                                    {job.events.map((e) => (
                                        <li key={e.id}>
                                            <strong>{labels[e.status]}</strong>
                                            <span>{e.note}</span>
                                            <small>
                                                {e.actor.name} ·{" "}
                                                {date(e.created_at)}
                                            </small>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                            <div>
                                {!["delivered", "cancelled"].includes(
                                    job.status,
                                ) && (
                                    <form
                                        key={`${job.id}-${job.version}`}
                                        onSubmit={(e) =>
                                            postForm(
                                                e,
                                                `/repairs/${job.id}`,
                                                (data) => {
                                                    data.version = Number(
                                                        data.version,
                                                    );
                                                    if ("price" in data) {
                                                        if (data.price)
                                                            data.price_satang =
                                                                satang(
                                                                    String(
                                                                        data.price,
                                                                    ),
                                                                );
                                                        delete data.price;
                                                    }
                                                },
                                            )
                                        }
                                    >
                                        <h3>อัปเดตงานซ่อม</h3>
                                        <input
                                            type="hidden"
                                            name="version"
                                            value={job.version}
                                        />
                                        <label>
                                            สถานะ
                                            <select
                                                name="status"
                                                defaultValue={job.status}
                                            >
                                                {[
                                                    job.status,
                                                    ...transitions[job.status],
                                                ]
                                                    .filter(
                                                        (s) =>
                                                            !(
                                                                tech &&
                                                                [
                                                                    "delivered",
                                                                    "cancelled",
                                                                ].includes(s)
                                                            ) &&
                                                            !(
                                                                job.sale &&
                                                                s !==
                                                                    job.status &&
                                                                s !==
                                                                    "delivered"
                                                            ),
                                                    )
                                                    .map((s) => (
                                                        <option
                                                            key={s}
                                                            value={s}
                                                        >
                                                            {labels[s]}
                                                        </option>
                                                    ))}
                                            </select>
                                        </label>
                                        {!tech && !job.sale && (
                                            <label>
                                                ค่าซ่อมประเมิน (บาท)
                                                <input
                                                    name="price"
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    defaultValue={
                                                        job.price_satang
                                                            ? String(
                                                                  job.price_satang /
                                                                      100,
                                                              )
                                                            : ""
                                                    }
                                                />
                                            </label>
                                        )}
                                        <label>
                                            บันทึกความคืบหน้า
                                            <textarea
                                                name="note"
                                                maxLength={1000}
                                            />
                                        </label>
                                        <button className="primary">
                                            บันทึกความคืบหน้า
                                        </button>
                                    </form>
                                )}
                                {!tech &&
                                    job.status === "ready" &&
                                    !job.sale && (
                                        <Link
                                            className="primary action-link"
                                            href={`/pos?repair=${job.id}`}
                                        >
                                            รับชำระค่าซ่อม{" "}
                                            <ArrowUpRight size={16} />
                                        </Link>
                                    )}
                            </div>
                        </div>
                    </details>
                ))}
            </div>
            {!repairs?.data.length && (
                <div className="empty panel">
                    <Wrench size={36} />
                    <h3>ยังไม่มีงานซ่อม</h3>
                    <p>
                        {tech
                            ? "รอผู้จัดการมอบหมายงาน"
                            : "เริ่มจากรับเครื่องซ่อมใหม่"}
                    </p>
                </div>
            )}
            {repairs && <Pagination data={repairs} />}
        </>
    );
}
function Pagination({
    data,
}: {
    data: { prev_page_url: string | null; next_page_url: string | null };
}) {
    return (
        <div className="pagination">
            {data.prev_page_url && (
                <Link href={data.prev_page_url}>← ก่อนหน้า</Link>
            )}
            {data.next_page_url && (
                <Link href={data.next_page_url}>ถัดไป →</Link>
            )}
        </div>
    );
}
function Sales({ sales, today = 0 }: Props) {
    return (
        <>
            <div className="stats">
                <div>
                    <small>ยอดรับชำระวันนี้ (เวลาไทย)</small>
                    <strong>{money(today)}</strong>
                </div>
                <div>
                    <small>บิลสะสมทั้งหมด</small>
                    <strong>
                        {sales?.total || 0} <em>บิล</em>
                    </strong>
                </div>
                <div>
                    <small>เงินโอน</small>
                    <p>พนักงานตรวจและบันทึกยอดเอง</p>
                </div>
            </div>
            <section className="panel table-panel">
                <h2>ใบเสร็จล่าสุด</h2>
                {sales?.data.length ? (
                    <div className="table-scroll">
                        <table>
                            <thead>
                                <tr>
                                    <th>เลขบิล</th>
                                    <th>เวลา</th>
                                    <th>พนักงาน</th>
                                    <th>วิธีชำระ</th>
                                    <th>ยอดรวม</th>
                                    <th>ใบเสร็จ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sales.data.map((s) => (
                                    <tr key={s.id}>
                                        <td>
                                            S-{String(s.id).padStart(6, "0")}
                                        </td>
                                        <td>{date(s.created_at)}</td>
                                        <td>{s.cashier.name}</td>
                                        <td>
                                            {s.method === "cash"
                                                ? "เงินสด"
                                                : "โอน (บันทึกเอง)"}
                                        </td>
                                        <td>{money(s.total_satang)}</td>
                                        <td>
                                            <Link
                                                className="text-button"
                                                href={`/sales/${s.id}`}
                                            >
                                                ดูใบเสร็จ{" "}
                                                <ArrowUpRight size={14} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty">
                        <ReceiptText size={36} />
                        <h3>ยังไม่มีรายการขาย</h3>
                        <p>เมื่อรับชำระสำเร็จ บิลจะแสดงที่นี่</p>
                    </div>
                )}
            </section>
            {sales && <Pagination data={sales} />}
        </>
    );
}
