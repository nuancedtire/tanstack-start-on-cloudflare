import { createServerFn } from "@tanstack/react-start";
import { AuditRecordSchema, RiskLevel, ObservationStatus } from "@/lib/schema";
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
    .handler(async (ctx) => {
        const { data } = ctx;
        const env = getEnv();
        // Validation: We use partial() because we might be submitting a Combined form
        // which includes fields from both partial schemas.
        // Ideally we should have a Combined Schema, but partial works for flexibility.
        const parsed = AuditRecordSchema.partial().parse(data);

        if (!parsed.patientToken || !parsed.arrivalDate) {
            throw new Error("Patient Token and Arrival Date are required");
        }

        console.log("Saving Combined Audit Record for:", parsed.patientToken);
        console.log("Saving Combined Audit Record for:", parsed.patientToken);
        const result = await db.addAudit(env, parsed as any);
        return result;
    });

// --- Get Patient History ---
export const getPatientHistoryFn = createServerFn({ method: "POST" })
    .inputValidator((d: { token: string }) => d)
    .handler(async (ctx) => {
        const { token } = ctx.data || {};
        const env = getEnv();
        const history = await db.getPatientHistory(env, token);
        return history.map((h: any) => ({
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
    .handler(async (ctx) => {
        const { data } = ctx;

        if (!data?.id || !data?.data) {
            throw new Error("Missing ID or Data for update");
        }

        const { id, data: payload } = data;
        const env = getEnv();

        // Validate
        const parsed = AuditRecordSchema.partial().parse(payload);

        const result = await db.updateAudit(env, id, parsed as any);
        return result;
    });
