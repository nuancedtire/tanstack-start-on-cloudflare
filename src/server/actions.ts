import { createServerFn } from "@tanstack/react-start";
import { RiskLevel, ObservationStatus } from "@/lib/schema";
import { db } from "@/server/db";
import { differenceInMinutes } from "date-fns";
import { v4 as uuidv4 } from 'uuid';

// Helper to get Env
// Helper to get Env
// We use the cloudflare:workers module which is populated by the Cloudflare Vite plugin
// @ts-ignore
import { env } from "cloudflare:workers";

const getEnv = () => {
    // In some setups env might be directly imported, in others it's an object we access.
    // The docs say: import { env } from "cloudflare:workers";
    // And use it.
    return env as Env;
}

// --- Submit Audit ---
export const submitAuditFn = createServerFn({ method: "POST" })
    .inputValidator((d: any) => d)
    .handler(async ({ data: payload }) => {
        const env = getEnv();

        if (!payload || !payload.patientToken || !payload.arrivalDate) {
            throw new Error("Patient Token and Arrival Date are required");
        }

        console.log("Saving Combined Audit Record for:", payload.patientToken);
        const result = await db.addAudit(env, payload as any);
        return result;
    });

// --- Get Patient History ---
export const getPatientHistoryFn = createServerFn({ method: "POST" })
    .inputValidator((d: { token: string }) => d)
    .handler(async ({ data }) => {
        const { token } = data;
        const env = getEnv();
        const records = await db.getPatientHistory(env, token);
        return records.map((h: any) => ({
            id: h.id || uuidv4(), // Fallback if old data didn't have UUID
            arrivalDate: h.arrivalDate,
            clinicianSeen: !!h.clinicianSeen,
            triagePerformed: !!h.triagePerformed,
            createdAt: h.createdAt
        }));
    });

// --- Get Dashboard Stats ---
export const getDashboardStatsFn = createServerFn({ method: "GET" })
    .handler(async () => {
        const env = getEnv();
        const audits = await db.getAllAudits(env);
        const total = audits.length;

        // Standard 1: Triage < 15 mins
        const triageCompliantCount = audits.filter((a: any) => {
            if (!a.triageTime || !a.arrivalDate) return false;
            const diff = differenceInMinutes(new Date(a.triageTime), new Date(a.arrivalDate));
            return diff <= 15 && diff >= 0;
        }).length;

        // Standard 2: Med/High Risk Obs
        const riskPatients = audits.filter((a: any) => a.riskLevel === RiskLevel.Medium || a.riskLevel === RiskLevel.High);
        const obsCompliantCount = riskPatients.filter((a: any) => a.observationLevelMet === ObservationStatus.Yes).length;

        // Standard 3: Safety Assessment
        const safetyCompliantCount = audits.filter((a: any) => {
            if (!a.clinicianSeen) return false;
            return (
                a.riskAssessmentType &&
                a.riskAssessmentTrigger &&
                a.riskAssessmentFuture &&
                a.riskAssessmentHistory === "Adequate"
            );
        }).length;

        return {
            totalAudits: total,
            triageCompliance: total === 0 ? 0 : Math.round((triageCompliantCount / total) * 100),
            observationCompliance: riskPatients.length === 0 ? 100 : Math.round((obsCompliantCount / riskPatients.length) * 100),
            safetyCompliance: total === 0 ? 0 : Math.round((safetyCompliantCount / total) * 100),
            recent: audits.slice(0, 5).map((a: any) => ({
                id: a.patientToken,
                type: a.clinicianSeen && a.triagePerformed ? "FULL" : (a.clinicianSeen ? "SAFETY" : "ALERTS"),
                time: a.createdAt || new Date().toISOString()
            }))
        };
    });

// --- Get All Audits (Raw Data View) ---
export const getAllAuditsFn = createServerFn({ method: "GET" })
    .handler(async () => {
        const env = getEnv();
        return await db.getAllAudits(env);
    });

// --- Update Audit ---
export const updateAuditFn = createServerFn({ method: "POST" })
    .inputValidator((d: { id: string; data: any }) => d)
    .handler(async ({ data }) => {
        const { id, data: payload } = data;
        const env = getEnv();

        if (!id || !payload) {
            throw new Error("Missing ID or Data for update");
        }

        const result = await db.updateAudit(env, id, payload as any);
        return result;
    });

// --- Delete Audit ---
export const deleteAuditFn = createServerFn({ method: "POST" })
    .inputValidator((d: { id: string }) => d)
    .handler(async ({ data }) => {
        const { id } = data;
        const env = getEnv();

        if (!id) {
            throw new Error("Missing ID for deletion");
        }

        console.log("Deleting audit:", id);
        const result = await db.deleteAudit(env, id);

        if (!result) {
            throw new Error("Audit not found");
        }

        return { success: true, id };
    });

// --- Reset and Seed (Development Only) ---
export const resetAndSeedFn = createServerFn({ method: "POST" })
    .inputValidator((d: { records: any[] }) => d)
    .handler(async ({ data }) => {
        const { records } = data;
        const env = getEnv();

        console.log(`Starting reset and seed with ${records.length} records...`);

        // Reset DB
        // @ts-ignore - db.reset might not be typed in current environment but it exists in db.ts
        if (db.reset) {
            await db.reset(env);
        } else {
            // Fallback: Delete all one by one (inefficient but works)
            const all = await db.getAllAudits(env);
            for (const a of all) {
                await db.deleteAudit(env, a.id);
            }
        }

        // Insert new records
        // D1 limit is usually high enough, but sequential is safer for now
        let count = 0;
        for (const record of records) {
            await db.addAudit(env, record);
            count++;
        }

        return { success: true, count };
    });
