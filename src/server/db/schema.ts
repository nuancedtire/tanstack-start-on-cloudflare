import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const audits = sqliteTable("audits", {
    id: text("id").primaryKey(),
    patientToken: text("patient_token").notNull(),
    patientTokenEncrypted: text("patient_token_encrypted"),
    arrivalDate: text("arrival_date").notNull(),
    dateOfBirth: text("date_of_birth"),
    gender: text("gender"),
    patientDescription: integer("patient_description", { mode: "boolean" }).default(false),

    // Q1.3 - Triage
    triagePerformed: integer("triage_performed", { mode: "boolean" }).default(false),
    triageTime: text("triage_time"),

    // Q2.1 - Risk Assessment
    riskLevel: text("risk_level"), // Low, Medium, High

    // Q2.1.1 - Observation
    observationLevelMet: text("observation_level_met"), // Yes, Partial, No

    // Q2.1.1.2 - Observer Roles (Stored as JSON string)
    observerRoles: text("observer_roles"),

    // Q2.7 - Compassionate Care
    compassionateCare: text("compassionate_care"), // Yes, Partial, No

    // Q2.4 - Safeguarding
    safeguardingCheck: integer("safeguarding_check", { mode: "boolean" }).default(false),
    ligatureCheck: integer("ligature_check", { mode: "boolean" }).default(false),

    // Implied / Policy
    searchPolicyFollowed: integer("search_policy_followed", { mode: "boolean" }).default(false),

    // SAFETY - Standard 3
    clinicianSeen: integer("clinician_seen", { mode: "boolean" }).default(false),
    clinicianSeenTime: text("clinician_seen_time"),

    // Q2.2 - Risk Assessment Elements
    riskAssessmentType: integer("risk_assessment_type", { mode: "boolean" }).default(false),
    riskAssessmentTrigger: integer("risk_assessment_trigger", { mode: "boolean" }).default(false),
    riskAssessmentFuture: integer("risk_assessment_future", { mode: "boolean" }).default(false),
    riskAssessmentHistory: text("risk_assessment_history"), // Adequate, Partial, Poor

    // Q2.3 - Physical Assessment
    physicalAssessment: integer("physical_assessment", { mode: "boolean" }).default(false),

    // Q2.5 - Drugs/Alcohol
    drugAlcoholConsidered: integer("drug_alcohol_considered", { mode: "boolean" }).default(false),

    // Q2.6 - Discharge
    dischargePlanSafe: integer("discharge_plan_safe", { mode: "boolean" }).default(false),

    // Safety Additional
    teamCommunication: integer("team_communication", { mode: "boolean" }).default(false),
    capacityAssessment: integer("capacity_assessment", { mode: "boolean" }).default(false),

    // Outcomes
    referredToPsych: integer("referred_to_psych", { mode: "boolean" }).default(false),
    psychReferralTime: text("psych_referral_time"),
    psychReviewTime: text("psych_review_time"),
    parallelAssessment: integer("parallel_assessment", { mode: "boolean" }).default(false),
    departureTime: text("departure_time"),
    departureOutcome: text("departure_outcome"), // Safe Discharge, Absconded, LAMA, Admitted, TransferredPsych, Deceased, Other

    // Meta
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
