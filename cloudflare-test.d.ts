/// <reference types="@cloudflare/workers-types" />
/// <reference types="@cloudflare/vitest-pool-workers" />

// Cloudflare test module types
declare module "cloudflare:test" {
    interface D1Migration {
        id: string;
        queries: string[];
    }

    // Proper test environment that includes D1 database
    interface TestEnv {
        DB: D1Database;
        TEST_MIGRATIONS?: D1Migration[];
    }

    export const env: TestEnv;

    export function applyD1Migrations(
        database: D1Database,
        migrations: D1Migration[]
    ): Promise<void>;
}
