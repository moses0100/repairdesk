import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
    testDir: "tests/e2e",
    fullyParallel: false,
    workers: 1,
    retries: 0,
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:8005",
        trace: "retain-on-failure",
    },
    projects: [
        {
            name: "chromium",
            use: {
                ...devices["Desktop Chrome"],
                channel: process.env.CI ? undefined : "chrome",
            },
        },
    ],
});
