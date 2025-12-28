import { drizzle } from "drizzle-orm/d1";
import { audits } from "./db/schema";
import { eq, desc } from "drizzle-orm";
import { v4 as uuidv4 } from 'uuid';
import { AuditRecord } from "@/lib/schema";

export const getDb = (env: Env) => {
    // @ts-ignore
    return drizzle(env.DB, { schema: { audits } });
};

export const db = {
    addAudit: async (env: Env, record: Partial<AuditRecord> & { patientToken: string, arrivalDate: string }) => {
        const d1 = getDb(env);
        const id = uuidv4();

        // Prepare record for insertion
        // We need to handle JSON fields explicitly if any
        const values: any = {
            ...record,
            id,
            createdAt: record.createdAt || new Date().toISOString(),
        };

        if (record.observerRoles) {
            values.observerRoles = JSON.stringify(record.observerRoles);
        }

        const result = await d1.insert(audits).values(values).returning().get();
        return result;
    },

    getAudit: async (env: Env, id: string) => {
        const d1 = getDb(env);
        const result = await d1.query.audits.findFirst({
            where: eq(audits.id, id)
        });

        if (result && result.observerRoles) {
            try {
                // @ts-ignore
                result.observerRoles = JSON.parse(result.observerRoles as string);
            } catch (e) {
                // ignore
            }
        }
        return result;
    },

    getPatientHistory: async (env: Env, token: string) => {
        const d1 = getDb(env);
        // Note: Sort by arrivalDate descending
        // arrivalDate is text, ISO format, so string sort works for date
        const results = await d1.query.audits.findMany({
            where: eq(audits.patientToken, token),
            orderBy: [desc(audits.arrivalDate)]
        });

        return results.map(r => {
            const copy: any = { ...r };
            if (copy.observerRoles) {
                try { copy.observerRoles = JSON.parse(copy.observerRoles as string); } catch (e) { }
            }
            return copy;
        });
    },

    getAllAudits: async (env: Env) => {
        const d1 = getDb(env);
        const results = await d1.query.audits.findMany({
            orderBy: [desc(audits.createdAt)]
        });

        return results.map(r => {
            const copy: any = { ...r };
            if (copy.observerRoles) {
                try { copy.observerRoles = JSON.parse(copy.observerRoles as string); } catch (e) { }
            }
            return copy;
        });
    },

    updateAudit: async (env: Env, id: string, record: Partial<AuditRecord>) => {
        const d1 = getDb(env);

        // Prepare record for update
        const values: any = {
            ...record
        };

        if (values.observerRoles) {
            values.observerRoles = JSON.stringify(values.observerRoles);
        }

        // Remove id from values if present to avoid updating primary key
        delete values.id;

        const result = await d1.update(audits)
            .set(values)
            .where(eq(audits.id, id))
            .returning()
            .get();
        return result;
    },

    // Helper to clear DB (mostly for tests or dev reset)
    reset: async (env: Env) => {
        const d1 = getDb(env);
        // Delete all
        await d1.delete(audits);
    }
};
