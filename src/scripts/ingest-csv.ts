
import { RiskLevel, ObservationStatus, DepartureOutcome } from "@/lib/schema";
import { parse } from "date-fns";
import { hashMRN } from "@/utils/hash-mrn";
import { encryptWithPin } from "@/utils/encryption";

function inferDepartureOutcome(row: Record<string, string>): DepartureOutcome | undefined {
    const edReview = row['ed-clinician-review'];
    const psychReview = row['psychiatric-review'];
    const safeDischargePlan = row['safe-discharge-plan'];

    if (edReview === 'did-not-wait' || psychReview === 'did-not-wait') {
        return DepartureOutcome.Absconded;
    }
    if (safeDischargePlan === 'yes') {
        return DepartureOutcome.SafeDischarge;
    }
    if (psychReview === 'yes' && safeDischargePlan !== 'yes') {
        return DepartureOutcome.TransferredPsych;
    }
    return undefined;
}

export async function parseAndSeedFromCsv(csvUrl: string): Promise<any[]> {
    try {
        const response = await fetch(csvUrl);
        const csvText = await response.text();

        // Simple CSV parser
        const lines = csvText.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());

        const records = lines.slice(1).filter(line => line.trim() !== '').map(line => {
            // Handle commas inside quotes if any (simple split might break, but let's assume simple CSV for now or use regex)
            // For robustness, let's use a regex that handles quoted fields
            const values = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g)?.map(v => v.replace(/^"|"$/g, '').trim()) || line.split(',');

            const row: Record<string, string> = {};
            headers.forEach((h, i) => {
                row[h] = values[i] || '';
            });

            return row;
        });

        // Use Promise.all to handle async hashing
        const auditRecords = await Promise.all(records.map(async (row) => {
            // Helper to parse DD/MM/YYYY or D/M/YY
            const parseDate = (dateStr: string, timeStr: string) => {
                if (!dateStr) return undefined;
                try {
                    // Try DD/MM/YYYY
                    let date = parse(dateStr, 'dd/MM/yyyy', new Date());
                    if (isNaN(date.getTime())) {
                        // Try D/M/YY
                        date = parse(dateStr, 'd/M/yy', new Date());
                    }
                    if (isNaN(date.getTime())) return undefined;

                    if (timeStr) {
                        const [hours, minutes] = timeStr.split(':').map(Number);
                        date.setHours(hours || 0, minutes || 0);
                    }
                    return date.toISOString();
                } catch (e) {
                    console.warn(`Failed to parse date: ${dateStr} ${timeStr}`);
                    return undefined;
                }
            };

            const arrivalDate = parseDate(row['arrival-date'], row['arrival-time']);
            const triageTime = parseDate(row['general-triage-time-recorded'] === 'yes-datetime' ? row['general-triage-date'] : "", row['general-triage-time']);

            // New Timestamps for Detailed Analysis (Parsed but not strictly required if UI hides them)
            const clinicianSeenTime = parseDate(row['ed-review-time-recorded'] === 'yes-datetime' ? row['ed-review-date'] : "", row['ed-review-time']);
            const psychReferralTime = parseDate(row['psychiatric-referral-time-recorded'] === 'yes-datetime' ? row['psychiatric-referral-date'] : "", row['psychiatric-referral-time']);
            const psychReviewTime = parseDate(row['psychiatric-review-time-recorded'] === 'yes-datetime' ? row['psychiatric-review-date'] : "", row['psychiatric-review-time']);
            const departureTime = parseDate(row['departure-time-recorded'] === 'yes-datetime' ? row['departure-date'] : "", row['departure-time']);

            // Map Risk Level
            let riskLevel: RiskLevel | undefined = undefined;
            const riskLower = row['risk-level']?.toLowerCase();
            if (riskLower?.includes('high')) riskLevel = RiskLevel.High;
            else if (riskLower?.includes('medium')) riskLevel = RiskLevel.Medium;
            else if (riskLower?.includes('low')) riskLevel = RiskLevel.Low;

            // Map Observation
            let observationLevelMet: ObservationStatus | undefined = undefined;
            const obsLower = row['observation-evidence']?.toLowerCase();
            if (obsLower === 'good' || obsLower === 'yes') observationLevelMet = ObservationStatus.Yes; // "good" in CSV usually means Yes/Compliant
            else if (obsLower === 'partial') observationLevelMet = ObservationStatus.Partial;
            else if (obsLower === 'no' || obsLower === 'minimal') observationLevelMet = ObservationStatus.No;

            // Secure Hash for Token
            const token = row['reference'] ? await hashMRN(row['reference']) : 'UNKNOWN';
            // Also store encrypted token for "unlock" feature (using default PIN 5555)
            const encryptedToken = row['reference'] ? await encryptWithPin(row['reference'], "5555") : undefined;

            return {
                patientToken: token,
                patientTokenEncrypted: encryptedToken,
                arrivalDate: arrivalDate || new Date().toISOString(),
                triageTime: triageTime,
                triagePerformed: !!triageTime, // Assume performed if time recorded

                riskLevel,
                observationLevelMet,
                observationDocumented: !!observationLevelMet, // inferred

                // Risk Assessment Components
                clinicianSeen: row['ed-clinician-review'] === 'yes' || !!row['ed-review-time'],
                clinicianSeenTime,
                psychReferralTime,
                psychReviewTime,
                psychReferral: row['psychiatric-referral'] === 'yes',
                capacityAssessment: row['capacity-assessment'],
                dischargePlanSafe: row['safe-discharge-plan'] === 'yes', // Mapping for Y
                departureTime,
                riskAssessmentType: !!row['type-self-harm'],
                riskAssessmentTrigger: !!row['reason-trigger'],
                riskAssessmentFuture: !!row['future-suicidal'],
                riskAssessmentHistory: row['psychiatric-history'] === 'yes' ? 'Adequate' : undefined, // Mapping 'yes' to adequate for boolean logic in dashboard

                gender: row['gender'] === '1' ? 'Male' : (row['gender'] === '2' ? 'Female' : 'Not Known'), // Inferring 1=Male, 2=Female based on common coding, check data?

                // Safeguarding & Environment
                safeguardingCheck: row['safeguarding-considered'] === 'yes',
                ligatureCheck: row['ligature-check'] === 'yes',
                patientDescription: row['patient-description'] === 'yes',

                // Compassionate Care (map good->Yes, minimal->Partial, not-applicable->undefined)
                compassionateCare: row['compassionate-care'] === 'good' ? 'Yes'
                    : row['compassionate-care'] === 'minimal' ? 'Partial'
                    : row['compassionate-care'] === 'not-applicable' ? undefined
                    : row['compassionate-care'] ? 'No' : undefined,

                // Psych Liaison (fix: use correct column name)
                referredToPsych: row['psychiatric-referral'] === 'yes',

                // Drug/Alcohol
                drugAlcoholConsidered: row['drug-alcohol-considered'] === 'yes',

                physicalAssessment: row['physical-assessment'] === 'yes',

                departureOutcome: inferDepartureOutcome(row),


                createdAt: new Date().toISOString(), // Ingested now
                updatedAt: new Date().toISOString()
            };
        }));

        console.log(`Parsed ${auditRecords.length} records`);
        return auditRecords;

    } catch (error) {
        console.error("Failed to parse CSV", error);
        throw error;
    }
}
