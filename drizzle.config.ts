
import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./src/server/db/schema.ts",
    out: "./migrations",
    dialect: "sqlite",
    driver: "d1-http", // For local dev/migrations if needed, but we just generating now
});
