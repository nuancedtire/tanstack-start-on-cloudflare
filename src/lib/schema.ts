import { z } from "zod";

// --- Enums ---

export enum RiskLevel {
    Low = "Low",
    Medium = "Medium",
    High = "High",
}

export enum ObservationStatus {
    Yes = "Yes",
    Partial = "Partial",
    No = "No",
}

export enum ObserverRole {
    Nurse = "Nurse",
    HCA = "HCA",
    MentalHealthNurse = "Mental Health Nurse",
    Doctor = "Doctor",
    Other = "Other",
}

export const YesPartialNoEnum = z.enum(["Yes", "Partial", "No"]);
export type EvaluationStatus = z.infer<typeof YesPartialNoEnum>;

// --- Schemas ---

export const AuditRecordSchema = z.object({
    // Identity & Generic (Pseudo-anonymized)
    id: z.string().optional(),
    patientToken: z.string().min(1, "Patient Token is required"), // Hashed MRN
    arrivalDate: z.string().datetime(), // ISO String
    dateOfBirth: z.string().optional(), // ISO Date String
    gender: z.enum(["Male", "Female", "Other", "Prefer not to say"]).optional(),

    // Q1.3 - Triage
    triagePerformed: z.boolean().default(false),
    triageTime: z.string().datetime().nullable().optional(), // ISO String, nullable if not performed

    // Q2.1 - Risk Assessment (ALERTS)
    riskLevel: z.nativeEnum(RiskLevel).nullable().optional(),

    // Q2.1.1 - Observation (ALERTS)
    // Only required if Risk is Medium or High
    observationLevelMet: z.nativeEnum(ObservationStatus).nullable().optional(),

    // Q2.1.1.2 - Who performed observations
    observerRoles: z.array(z.nativeEnum(ObserverRole)).optional(),

    // Q2.7 - Compassionate Care (Objective)
    compassionateCare: YesPartialNoEnum.nullable().optional(),

    // Q2.4 - Safeguarding
    safeguardingCheck: z.boolean().default(false),

    // Implied / Policy
    searchPolicyFollowed: z.boolean().default(false),

    // SAFETY (Clinician) - Standard 3
    // Q1.5
    clinicianSeen: z.boolean().default(false),

    // Q2.2 - Risk Assessment Elements
    riskAssessmentType: z.boolean().default(false),      // A. Type of self-harm
    riskAssessmentTrigger: z.boolean().default(false),   // B. Trigger
    riskAssessmentFuture: z.boolean().default(false),    // C. Future Intent
    riskAssessmentHistory: z.enum(["Adequate", "Partial", "Poor"]).nullable().optional(), // D. Psych/Social History

    // Q2.3 - Physical Assessment
    physicalAssessment: z.boolean().default(false),

    // Q2.5 - Drugs/Alcohol
    drugAlcoholConsidered: z.boolean().default(false),

    // Q2.6 - Discharge
    dischargePlanSafe: z.boolean().default(false),

    // Safety Additional
    teamCommunication: z.boolean().default(false),
    capacityAssessment: z.boolean().default(false),

    // Outcomes & Liaison
    // Q1.6
    referredToPsych: z.boolean().default(false),

    // Q1.7.2
    psychReviewTime: z.string().datetime().nullable().optional(),

    // Q3.2 - Parallel Assessment
    parallelAssessment: z.boolean().default(false),

    // Q1.8 - Departure
    departureTime: z.string().datetime().nullable().optional(),

    // Meta
    createdAt: z.string().datetime(),
});

export type AuditRecord = z.infer<typeof AuditRecordSchema>;

export const AlertsAuditSchema = AuditRecordSchema.pick({
    patientToken: true,
    arrivalDate: true,
    createdAt: true,
    triagePerformed: true,
    triageTime: true,
    riskLevel: true,
    observationLevelMet: true,
    observerRoles: true,
    compassionateCare: true,
    safeguardingCheck: true,
    searchPolicyFollowed: true,
});

export const SafetyAuditSchema = AuditRecordSchema.pick({
    patientToken: true,
    arrivalDate: true,
    createdAt: true,
    clinicianSeen: true,
    riskAssessmentType: true,
    riskAssessmentTrigger: true,
    riskAssessmentFuture: true,
    riskAssessmentHistory: true,
    physicalAssessment: true,
    drugAlcoholConsidered: true,
    dischargePlanSafe: true,
    referredToPsych: true,
    psychReviewTime: true,
    parallelAssessment: true,
    departureTime: true,
    // Safety page technically deals with safeguarding too in "Environment", but we mapped it to 'safeguardingCheck' in the UI.
    // Let's include it here too so Safety form can update it if needed, or rely on Alerts form.
    // The UI currently defaults safeguardingCheck: false in both.
    safeguardingCheck: true,
    teamCommunication: true, // Wait, this isn't in main schema?
    capacityAssessment: true, // This isn't in main schema?
    // checking main schema...
    // Ah, I missed 'teamCommunication' and 'capacityAssessment' in the Original AuditRecordSchema definition in the previous turn?
    // Let's check the viewed file content of schema.ts...
    // Lines 30-92...
    // I see: triagePerformed, riskLevel, observationLevelMet, observerRoles, compassionateCare, safeguardingCheck, searchPolicyFollowed, clinicianSeen, riskAssessmentType...History, physicalAssessment, drugAlcoholConsidered, dischargePlanSafe, referredToPsych...
    // I DO NOT SEE 'teamCommunication' or 'capacityAssessment' in AuditRecordSchema!
    // But they ARE in the Safety Form UI (lines 69, 71 of safety.tsx in previous view).
    // This means the Safety Form is collecting data that is NOT in the Schema/DB!
    // I must ADD them to AuditRecordSchema first.
});

// Re-export AuditRecordSchema with added fields
export const ExtendedAuditRecordSchema = AuditRecordSchema.extend({
    teamCommunication: z.boolean().default(false),
    capacityAssessment: z.boolean().default(false),
    environmentSocial: z.boolean().default(false), // Helper for UI, maybe not DB? DB uses riskAssessmentHistory.
    environmentAlcohol: z.boolean().default(false), // Helper for UI
});

// Actually, I should update the ORIGINAL AuditRecordSchema to include these missing fields first.
// I will split this into two steps.
// Step 1: Add missing fields to `AuditRecordSchema`.
// Step 2: Add the partial schemas.

