import { describe, it, expect, beforeEach, beforeAll } from "vitest";
import { env, applyD1Migrations } from "cloudflare:test";
import { db } from "../db";
import { audits } from "../db/schema";
import { drizzle } from "drizzle-orm/d1";
import { RiskLevel, ObservationStatus } from "@/lib/schema";

// Helper to reset DB
const resetDb = async () => {
    // @ts-ignore
    const d1 = drizzle(env.DB);
    await d1.delete(audits);
}

describe("Audit DB Functions", () => {
    beforeAll(async () => {
        // Apply migrations from TEST_MIGRATIONS binding
        // @ts-ignore
        await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
    });

    beforeEach(async () => {
        await resetDb();
    });

    describe("Audit Creation", () => {
        it("should add a new audit with dateOfBirth and gender", async () => {
            const payload = {
                patientToken: "test-token-123",
                arrivalDate: new Date().toISOString(),
                dateOfBirth: "1990-01-01",
                gender: "Male" as const,
                triagePerformed: true,
                riskLevel: RiskLevel.Low
            };

            // @ts-ignore
            const result = await db.addAudit(env, payload);

            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.patientToken).toBe("test-token-123");
            expect(result.dateOfBirth).toBe("1990-01-01");
            expect(result.gender).toBe("Male");
        });

        it("should add a complete audit with all ALERTS fields", async () => {
            const payload = {
                patientToken: "alerts-token",
                arrivalDate: new Date().toISOString(),
                triagePerformed: true,
                triageTime: new Date().toISOString(),
                riskLevel: RiskLevel.High,
                observationLevelMet: ObservationStatus.Yes,
                compassionateCare: "Yes" as const,
                safeguardingCheck: true,
            };

            // @ts-ignore
            const result = await db.addAudit(env, payload);

            expect(result).toBeDefined();
            expect(result.riskLevel).toBe(RiskLevel.High);
            expect(result.observationLevelMet).toBe(ObservationStatus.Yes);
            expect(result.compassionateCare).toBe("Yes");
            expect(result.safeguardingCheck).toBe(true);
        });

        it("should add a complete audit with all SAFETY fields", async () => {
            const payload = {
                patientToken: "safety-token",
                arrivalDate: new Date().toISOString(),
                clinicianSeen: true,
                riskAssessmentType: true,
                riskAssessmentTrigger: true,
                riskAssessmentFuture: true,
                riskAssessmentHistory: "Adequate" as const,
                teamCommunication: true,
                capacityAssessment: true,
                dischargePlanSafe: true,
            };

            // @ts-ignore
            const result = await db.addAudit(env, payload);

            expect(result).toBeDefined();
            expect(result.clinicianSeen).toBe(true);
            expect(result.riskAssessmentType).toBe(true);
            expect(result.riskAssessmentHistory).toBe("Adequate");
            expect(result.teamCommunication).toBe(true);
            expect(result.capacityAssessment).toBe(true);
        });
    });

    describe("Patient History", () => {
        it("should retrieve audit history for a patient", async () => {
            const payload1 = {
                patientToken: "history-token",
                arrivalDate: new Date().toISOString(),
                riskLevel: RiskLevel.Low
            };
            const payload2 = {
                patientToken: "history-token",
                arrivalDate: new Date(Date.now() - 10000).toISOString(),
                riskLevel: RiskLevel.High
            };

            // @ts-ignore
            await db.addAudit(env, payload1);
            // @ts-ignore
            await db.addAudit(env, payload2);

            // @ts-ignore
            const history = await db.getPatientHistory(env, "history-token");
            expect(history).toHaveLength(2);
            // Should be sorted by arrival date descending
            expect(history[0].riskLevel).toBe(RiskLevel.Low);
            expect(history[1].riskLevel).toBe(RiskLevel.High);
        });

        it("should return empty array for patient with no history", async () => {
            // @ts-ignore
            const history = await db.getPatientHistory(env, "non-existent-token");
            expect(history).toHaveLength(0);
        });

        it("should only return history for specific patient token", async () => {
            // @ts-ignore
            await db.addAudit(env, {
                patientToken: "patient-a",
                arrivalDate: new Date().toISOString(),
                riskLevel: RiskLevel.Low
            });
            // @ts-ignore
            await db.addAudit(env, {
                patientToken: "patient-b",
                arrivalDate: new Date().toISOString(),
                riskLevel: RiskLevel.High
            });

            // @ts-ignore
            const historyA = await db.getPatientHistory(env, "patient-a");
            expect(historyA).toHaveLength(1);
            expect(historyA[0].patientToken).toBe("patient-a");
        });
    });

    describe("All Audits Retrieval", () => {
        it("should retrieve all audits sorted by creation date", async () => {
            const now = Date.now();
            // @ts-ignore
            await db.addAudit(env, {
                patientToken: "token-1",
                arrivalDate: new Date(now - 3000).toISOString(),
                createdAt: new Date(now - 3000).toISOString(),
            });
            // @ts-ignore
            await db.addAudit(env, {
                patientToken: "token-2",
                arrivalDate: new Date(now - 2000).toISOString(),
                createdAt: new Date(now - 2000).toISOString(),
            });
            // @ts-ignore
            await db.addAudit(env, {
                patientToken: "token-3",
                arrivalDate: new Date(now - 1000).toISOString(),
                createdAt: new Date(now - 1000).toISOString(),
            });

            // @ts-ignore
            const allAudits = await db.getAllAudits(env);
            expect(allAudits).toHaveLength(3);
            // Should be sorted by createdAt descending
            expect(allAudits[0].patientToken).toBe("token-3");
            expect(allAudits[2].patientToken).toBe("token-1");
        });

        it("should return empty array when no audits exist", async () => {
            // @ts-ignore
            const allAudits = await db.getAllAudits(env);
            expect(allAudits).toHaveLength(0);
        });
    });

    describe("Audit Retrieval by ID", () => {
        it("should retrieve a specific audit by ID", async () => {
            // @ts-ignore
            const created = await db.addAudit(env, {
                patientToken: "specific-token",
                arrivalDate: new Date().toISOString(),
                riskLevel: RiskLevel.Medium,
            });

            // @ts-ignore
            const retrieved = await db.getAudit(env, created.id!);
            expect(retrieved).toBeDefined();
            expect(retrieved?.id).toBe(created.id);
            expect(retrieved?.patientToken).toBe("specific-token");
            expect(retrieved?.riskLevel).toBe(RiskLevel.Medium);
        });

        it("should return undefined for non-existent audit ID", async () => {
            // @ts-ignore
            const retrieved = await db.getAudit(env, "non-existent-id");
            expect(retrieved).toBeUndefined();
        });
    });

    describe("Audit Updates", () => {
        it("should update an existing audit", async () => {
            // @ts-ignore
            const created = await db.addAudit(env, {
                patientToken: "update-token",
                arrivalDate: new Date().toISOString(),
                riskLevel: RiskLevel.Low,
                triagePerformed: false,
            });

            // @ts-ignore
            const updated = await db.updateAudit(env, created.id!, {
                riskLevel: RiskLevel.High,
                triagePerformed: true,
            });

            expect(updated).toBeDefined();
            expect(updated?.riskLevel).toBe(RiskLevel.High);
            expect(updated?.triagePerformed).toBe(true);
            // Original fields should remain
            expect(updated?.patientToken).toBe("update-token");
        });
    });
});
