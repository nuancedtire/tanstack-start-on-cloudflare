import { format, differenceInMinutes } from "date-fns";
import { cn } from "@/lib/utils";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";

import { DepartureOutcome } from "@/lib/schema";

function getDepartureOutcomeStyle(outcome: DepartureOutcome | undefined | null) {
    if (!outcome) return { className: "text-muted-foreground", label: "Not recorded" };
    
    switch (outcome) {
        case DepartureOutcome.SafeDischarge:
            return { className: "text-emerald-600 dark:text-emerald-400", label: outcome };
        case DepartureOutcome.Absconded:
        case DepartureOutcome.LAMA:
        case DepartureOutcome.Deceased:
            return { className: "text-red-600 dark:text-red-400", label: outcome };
        case DepartureOutcome.Admitted:
        case DepartureOutcome.TransferredPsych:
            return { className: "text-blue-600 dark:text-blue-400", label: outcome };
        default:
            return { className: "text-muted-foreground", label: outcome };
    }
}

function TimeMetric({ label, start, end, target, value }: { label: string, start?: string, end?: string, target?: number, value?: string }) {
    let diff: number | null = null;
    let status = "neutral";

    if (start && end) {
        try {
            diff = differenceInMinutes(new Date(end), new Date(start));
            if (target) {
                status = diff <= target ? "good" : "warning";
            } else {
                status = "info"; // Just showing time, no target
            }
        } catch (e) {
            console.error("Date diff error", e);
        }
    }

    return (
        <div className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
            <span className="text-sm text-muted-foreground">{label}</span>
            <div className="text-right">
                {diff !== null ? (
                    <div className="flex items-center gap-2 justify-end">
                        <span className={cn(
                            "font-mono font-bold text-sm",
                            status === "good" ? "text-emerald-600 dark:text-emerald-400" :
                            status === "warning" ? "text-amber-600 dark:text-amber-400" :
                            "text-foreground"
                        )}>
                            {diff}m
                        </span>
                        {status === "good" && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                        {status === "warning" && <AlertCircle className="w-3 h-3 text-amber-500" />}
                    </div>
                ) : (
                    <span className="text-sm font-medium text-muted-foreground">-</span>
                )}
                {value && <div className="text-xs text-muted-foreground/70">{value}</div>}
            </div>
        </div>
    );
}

export function AuditSummary({ values, arrival }: { values: any, arrival: string }) {
    
    return (
        <div className="space-y-6">
            
            {/* KPI Report Card */}
            <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-muted/30 px-4 py-3 border-b border-border flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <h4 className="font-semibold text-sm">Time Performance</h4>
                    </div>
                    <div className="p-4">
                        <TimeMetric 
                            label="Time to Triage" 
                            start={arrival} 
                            end={values.triageTime} 
                            target={15} 
                            value={values.triageTime ? format(new Date(values.triageTime), "HH:mm") : undefined}
                        />
                        
                        {/* Show referral time if referred, regardless of if time is entered yet (so user knows it's pending) */}
                        {values.referredToPsych && (
                            <>
                                <TimeMetric 
                                    label="Time to Referral" 
                                    start={values.triageTime || arrival} 
                                    end={values.psychReferralTime} 
                                    value={values.psychReferralTime ? format(new Date(values.psychReferralTime), "HH:mm") : undefined}
                                />
                                <TimeMetric 
                                    label="Ref. to Psych Review" 
                                    start={values.psychReferralTime} 
                                    end={values.psychReviewTime} 
                                    target={60}
                                    value={values.psychReviewTime ? format(new Date(values.psychReviewTime), "HH:mm") : undefined}
                                />
                            </>
                        )}

                        {values.clinicianSeen && (
                            <TimeMetric 
                                label="Time to ED Clinician" 
                                start={values.triageTime || arrival} 
                                end={values.clinicianSeenTime} 
                                target={60}
                                value={values.clinicianSeenTime ? format(new Date(values.clinicianSeenTime), "HH:mm") : undefined}
                            />
                        )}
                    </div>
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
                    <div className="bg-muted/30 px-4 py-3 border-b border-border flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                        <h4 className="font-semibold text-sm">Key Indicators</h4>
                    </div>
                    <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Risk Level</span>
                            <span className={cn("px-2 py-1 rounded text-xs font-bold border", 
                                values.riskLevel === 'High' ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-900" : 
                                values.riskLevel === 'Medium' ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900" : 
                                "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900"
                            )}>{values.riskLevel || "Not Rated"}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Obs. Compliance</span>
                            <span className={cn("text-sm font-medium", values.observationLevelMet === "Yes" ? "text-emerald-600 dark:text-emerald-400" : "text-red-500")}>
                                {values.observationLevelMet || "-"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Safeguarding</span>
                            <span className={cn("text-sm font-medium", values.safeguardingCheck ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                                {values.safeguardingCheck ? "Completed" : "Pending"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Discharge Plan</span>
                            <span className={cn("text-sm font-medium", values.dischargePlanSafe ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground")}>
                                {values.dischargePlanSafe ? "Safe" : "Pending"}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Departure Outcome</span>
                            <span className={cn("text-sm font-medium", getDepartureOutcomeStyle(values.departureOutcome).className)}>
                                {getDepartureOutcomeStyle(values.departureOutcome).label}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
