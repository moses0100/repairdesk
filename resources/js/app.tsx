import "../css/shop.css";
import { createInertiaApp } from "@inertiajs/react";
createInertiaApp({
    title: (title) => `${title || "หน้าร้าน"} · RepairDesk`,
    pages: { path: "./pages", extension: ".tsx" },
    strictMode: true,
    progress: { color: "#2563eb" },
});
