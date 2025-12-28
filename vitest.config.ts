import { defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineWorkersConfig(async () => {
    const migrationsPath = "./migrations";
    const migrations = await readD1Migrations(migrationsPath);

    return {
        plugins: [tsconfigPaths()],
        test: {
            exclude: ['e2e/**', 'node_modules/**'],
            poolOptions: {
                workers: {
                    wrangler: { configPath: "./wrangler.jsonc" },
                    miniflare: {
                        d1Databases: ["DB"],
                        bindings: {
                            TEST_MIGRATIONS: migrations,
                        },
                    },
                },
            },
        },
    };
});
