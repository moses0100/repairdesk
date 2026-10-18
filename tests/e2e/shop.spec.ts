import { test, expect, type Page } from "@playwright/test";
async function login(page: Page, role = "manager") {
    await page.goto("/login");
    await page
        .getByLabel("อีเมล", { exact: true })
        .fill(`${role}@repairdesk.test`);
    await page
        .getByLabel("รหัสผ่าน", { exact: true })
        .fill("RepairDesk-demo-2026");
    await page
        .getByRole("button", { name: "เข้าสู่ระบบ", exact: true })
        .click();
    await expect(
        page.getByRole("navigation", { name: "เมนูหลัก" }),
    ).toBeVisible();
}
test("cash sale updates stock, prints a receipt and keeps mobile usable", async ({
    page,
}) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await login(page);
    await page
        .getByRole("button", { name: "เพิ่ม เคสใสกันกระแทก", exact: true })
        .click();
    await page.getByLabel("เงินที่รับ (บาท)", { exact: true }).fill("200");
    await page
        .getByRole("button", { name: "รับชำระและออกใบเสร็จ", exact: true })
        .click();
    await expect(page).toHaveURL(/\/sales\/\d+$/);
    await expect(page.locator(".receipt")).toContainText("฿159.00");
    await expect(page.locator(".receipt-bottom")).toContainText("฿41.00");
    await expect(
        page.getByRole("button", { name: "พิมพ์ใบเสร็จ" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "กลับไปขายหน้าร้าน" }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
        .poll(() =>
            page.evaluate(
                () => document.documentElement.scrollWidth <= innerWidth,
            ),
        )
        .toBe(true);
    await expect(page.getByLabel("ค้นหาสินค้า")).toBeVisible();
    await page.getByLabel("ค้นหาสินค้า").fill("885000000002");
    await expect(
        page.getByRole("button", { name: "เพิ่ม สายชาร์จ USB-C", exact: true }),
    ).toBeVisible();
    await page.getByLabel("ค้นหาสินค้า").fill("");
    await page.screenshot({ path: "docs/pos-mobile.png", fullPage: true });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({ path: "docs/pos-desktop.png", fullPage: true });
    expect(errors).toEqual([]);
});
test("inventory creates a product and records a stock adjustment", async ({
    page,
}) => {
    await login(page);
    await page
        .getByRole("link", { name: "สินค้าและสต็อก", exact: true })
        .click();
    const name = `สายทดสอบ ${Date.now()}`;
    const add = page
        .getByRole("heading", { name: "เพิ่มสินค้า", exact: true })
        .locator("..");
    await add.getByLabel("SKU", { exact: true }).fill(`T-${Date.now()}`);
    await add.getByLabel("ชื่อสินค้า", { exact: true }).fill(name);
    await add.getByLabel("ราคาขาย (บาท)").fill("25.50");
    await add.getByLabel("สต็อกเริ่มต้น").fill("2");
    await add.getByRole("button", { name: "เพิ่มสินค้า", exact: true }).click();
    await expect(page.getByRole("status")).toContainText("เพิ่มสินค้าแล้ว");
    const adjust = page
        .getByRole("heading", { name: "ปรับสต็อก", exact: true })
        .locator("..");
    await adjust
        .getByRole("combobox", { name: "สินค้า", exact: true })
        .selectOption({ label: `${name} · คงเหลือ 2` });
    await adjust.getByLabel("จำนวนที่ปรับ").fill("3");
    await adjust
        .getByLabel("เหตุผล", { exact: true })
        .fill("รับสินค้าเพิ่มสำหรับทดสอบ");
    await adjust.getByRole("button", { name: "บันทึกการปรับสต็อก" }).click();
    await expect(page.getByRole("status")).toContainText("ปรับสต็อก");
    await expect(
        page
            .getByRole("row")
            .filter({ hasText: name })
            .filter({ hasText: "฿25.50" }),
    ).toContainText("5 ชิ้น");
});
test("a repair moves from intake through payment to delivery", async ({
    page,
}) => {
    await login(page);
    await page.getByRole("link", { name: "งานซ่อม", exact: true }).click();
    await page
        .locator("summary")
        .filter({ hasText: "รับเครื่องซ่อมใหม่" })
        .click();
    const form = page.locator(".new-repair");
    const device = `เครื่องทดสอบ ${Date.now()}`;
    await form.getByLabel("ชื่อลูกค้า").fill("ลูกค้าทดสอบเบราว์เซอร์");
    await form.getByLabel("เบอร์โทร").fill("0800000000");
    await form.getByLabel("ยี่ห้อ / รุ่น").fill(device);
    await form.getByLabel("อาการ / ปัญหา").fill("หน้าจอเปิดไม่ติด");
    await form
        .getByLabel("มอบหมายช่าง")
        .selectOption({ label: "ช่างตัวอย่าง" });
    await form.getByRole("button", { name: "บันทึกรับเครื่อง" }).click();
    await expect(page.getByRole("status")).toContainText("รับเครื่องแล้ว");
    const card = page
        .locator(".repair-card")
        .filter({
            has: page.getByRole("heading", { name: device, exact: true }),
        });
    await card.locator("summary").click();
    await card
        .getByRole("combobox", { name: "สถานะ", exact: true })
        .selectOption("diagnosing");
    await card.getByLabel("ค่าซ่อมประเมิน (บาท)").fill("500");
    await card
        .getByRole("button", { name: "บันทึกความคืบหน้า", exact: true })
        .click();
    await expect(page.getByRole("status")).toContainText(
        "บันทึกความคืบหน้าแล้ว",
    );
    await card
        .getByRole("combobox", { name: "สถานะ", exact: true })
        .selectOption("ready");
    await card
        .getByRole("button", { name: "บันทึกความคืบหน้า", exact: true })
        .click();
    await expect(
        card.getByRole("link", { name: "รับชำระค่าซ่อม" }),
    ).toBeVisible();
    await card.getByRole("link", { name: "รับชำระค่าซ่อม" }).click();
    await page.getByLabel("เงินที่รับ (บาท)").fill("500");
    await page.getByRole("button", { name: "รับชำระและออกใบเสร็จ" }).click();
    await expect(page).toHaveURL(/\/sales\/\d+$/);
    await expect(page.locator(".receipt")).toContainText("฿500.00");
    await page.getByRole("link", { name: "งานซ่อม", exact: true }).click();
    const paid = page
        .locator(".repair-card")
        .filter({
            has: page.getByRole("heading", { name: device, exact: true }),
        });
    await paid.locator("summary").click();
    await paid
        .getByRole("combobox", { name: "สถานะ", exact: true })
        .selectOption("delivered");
    await paid.getByRole("button", { name: "บันทึกความคืบหน้า" }).click();
    await expect(paid.locator("summary")).toContainText("ส่งมอบแล้ว");
});
test("technician has repair-only navigation and cannot open the POS", async ({
    page,
}) => {
    await login(page, "technician");
    await expect(page).toHaveURL(/\/repairs$/);
    await expect(
        page.getByRole("link", { name: "ขายหน้าร้าน", exact: true }),
    ).toHaveCount(0);
    const response = await page.goto("/pos");
    expect(response?.status()).toBe(403);
});
