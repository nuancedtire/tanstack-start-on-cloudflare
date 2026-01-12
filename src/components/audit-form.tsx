import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
    CalendarIcon,
    Save,
    Baby,
    Shield,
    Home,
    Stethoscope,
    Activity,
    Eye,
    BrainCircuit
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { RiskLevel, ObservationStatus, AuditRecord } from "@/lib/schema";
import { submitAuditFn, updateAuditFn } from "@/server/actions";
import { MotionDiv, HoverCard } from "@/components/ui/motion";
import { SmartTimeInput } from "@/components/ui/smart-time-input";
import { AuditSummary } from "@/components/audit-summary";

interface AuditFormProps {
    initialData?: Partial<AuditRecord>;
    token: string;
    encryptedToken?: string;
    arrival: string; // ISO String
    onSuccess?: (data: any) => void;
    mode?: "create" | "edit";
}

function AcronymCard({ letter, title, description, children, color = "blue", id }: { letter: string, title: string, description?: string, children: React.ReactNode, color?: string, id?: string }) {
    return (
        <div id={id} className="scroll-mt-24">
            <div className={cn("relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm p-6", `border-${color}-200 dark:border-${color}-900`)}>
                {/* Background Letter */}
                <div className={cn("absolute -right-4 -bottom-10 text-[10rem] font-black opacity-5 select-none pointer-events-none leading-none", `text-${color}-900 dark:text-${color}-100`)}>
                    {letter}
                </div>

                {/* Header */}
                <div className="relative z-10 mb-6 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <span className={cn("inline-flex items-center justify-center w-12 h-12 rounded-xl text-2xl font-black shadow-sm border", `bg-${color}-50 border-${color}-100 text-${color}-600 dark:bg-${color}-900/20 dark:border-${color}-800 dark:text-${color}-400`)}>
                            {letter}
                        </span>
                        <div>
                            <h3 className={cn("text-xl font-bold", `text-${color}-700 dark:text-${color}-300`)}>
                                {title}
                            </h3>
                            {description && <p className="text-sm text-muted-foreground">{description}</p>}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="relative z-10 space-y-4 md:w-[95%] mr-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}

function SectionHeader({ title, icon: Icon, color, description }: { title: string, icon: any, color: string, description: string }) {
    return (
        <div className={cn("sticky top-16 z-20 backdrop-blur-xl bg-background/80 p-4 border-b border-border mb-8 rounded-xl flex items-center gap-4 shadow-sm", `border-${color}-100 dark:border-${color}-900`)}>
            <div className={cn("p-2 rounded-lg shadow-sm", `bg-${color}-100 dark:bg-${color}-900/30`)}>
                <Icon className={cn("w-6 h-6", `text-${color}-600 dark:text-${color}-400`)} />
            </div>
            <div>
                <h2 className={cn("text-xl font-bold tracking-tight", `text-${color}-950 dark:text-${color}-100`)}>{title}</h2>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{description}</p>
            </div>
        </div>
    );
}

export function AuditForm({ initialData, token, encryptedToken, arrival, onSuccess, mode = "create" }: AuditFormProps) {
    const queryClient = useQueryClient();

    // Local state for DOB text input
    const [dobText, setDobText] = useState(initialData?.dateOfBirth ? format(new Date(initialData.dateOfBirth), "dd/MM/yyyy") : "");
    const [dobCalendarMonth, setDobCalendarMonth] = useState<Date>(initialData?.dateOfBirth ? new Date(initialData.dateOfBirth) : new Date());

    const maskDate = (value: string) => {
        const v = value.replace(/\D/g, '').slice(0, 8);
        if (v.length >= 5) {
            return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
        } else if (v.length >= 3) {
            return `${v.slice(0, 2)}/${v.slice(2)}`;
        }
        return v;
    };

    const submissionHandler = async (value: any) => {
        try {
            // Logic for History Status (SAFETY)
            let historyStatus = "Poor";
            const val = value as any;
            if (val.environmentSocial && val.environmentAlcohol) {
                historyStatus = "Adequate";
            } else if (val.environmentSocial || val.environmentAlcohol) {
                historyStatus = "Partial";
            }

            if (val.dateOfBirth instanceof Date) {
                val.dateOfBirth = val.dateOfBirth.toISOString();
            }

            // Remove UI-only fields
            const { environmentSocial, environmentAlcohol, ...cleanValues } = value;

            const payload = {
                ...cleanValues,
                patientToken: token,
                patientTokenEncrypted: encryptedToken,
                arrivalDate: arrival,
                triageTime: value.triageTime,
                clinicianSeenTime: value.clinicianSeenTime,
                psychReferralTime: value.psychReferralTime,
                psychReviewTime: value.psychReviewTime,

                createdAt: initialData?.createdAt || new Date().toISOString(),

                // Safety Calc
                riskAssessmentHistory: historyStatus,
                drugAlcoholConsidered: val.environmentAlcohol || false,

                // Ensure booleans
                clinicianSeen: !!val.clinicianSeen,
                triagePerformed: !!val.triagePerformed,
            };

            if (mode === "edit" && initialData?.id) {
                await updateAuditFn({ data: { id: initialData.id, data: payload } });
            } else {
                await submitAuditFn({ data: payload });
            }

            await queryClient.invalidateQueries({ queryKey: ["allAudits"] });
            if (onSuccess) onSuccess(payload);

        } catch (e) {
            console.error("Submission failed", e);
            alert("Failed to save audit. Please try again.");
        }
    };

    const form = useForm({
        defaultValues: {
            triagePerformed: initialData?.triagePerformed ?? true,
            triageTime: initialData?.triageTime,
            dateOfBirth: initialData?.dateOfBirth ? new Date(initialData.dateOfBirth) : undefined,
            gender: initialData?.gender,
            riskLevel: initialData?.riskLevel as RiskLevel | undefined,
            observationLevelMet: initialData?.observationLevelMet as ObservationStatus | undefined,
            compassionateCare: initialData?.compassionateCare as "Yes" | "Partial" | "No" | undefined,
            safeguardingCheck: initialData?.safeguardingCheck ?? false,
            patientDescription: initialData?.patientDescription ?? false,
            ligatureCheck: initialData?.ligatureCheck ?? false,
            riskAssessmentType: initialData?.riskAssessmentType ?? false,
            riskAssessmentTrigger: initialData?.riskAssessmentTrigger ?? false,
            riskAssessmentFuture: initialData?.riskAssessmentFuture ?? false,
            environmentAlcohol: initialData?.drugAlcoholConsidered ?? false,
            environmentSocial: (() => {
                if (!initialData?.riskAssessmentHistory) return false;
                const alc = initialData.drugAlcoholConsidered ?? false;
                if (initialData.riskAssessmentHistory === "Adequate") return true;
                if (initialData.riskAssessmentHistory === "Partial" && !alc) return true;
                return false;
            })(),
            teamCommunication: initialData?.teamCommunication ?? false,
            capacityAssessment: initialData?.capacityAssessment ?? false,
            dischargePlanSafe: initialData?.dischargePlanSafe ?? false,
            clinicianSeen: initialData?.clinicianSeen ?? false,
            referredToPsych: initialData?.referredToPsych ?? false,
            clinicianSeenTime: initialData?.clinicianSeenTime,
            psychReferralTime: initialData?.psychReferralTime,
            psychReviewTime: initialData?.psychReviewTime,
        },
        onSubmit: async ({ value }) => {
            await submissionHandler(value);
        },
    });

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="w-full max-w-4xl mx-auto pb-32">

            {/* Quick Nav (Desktop) */}
            <div className="hidden lg:flex fixed left-8 top-32 flex-col gap-2 z-0">
                <Button variant="ghost" size="sm" className="justify-start text-muted-foreground" onClick={() => scrollToSection('identity')}>Identity</Button>
                <Button variant="ghost" size="sm" className="justify-start text-emerald-600" onClick={() => scrollToSection('alerts')}>ALERTS</Button>
                <Button variant="ghost" size="sm" className="justify-start text-blue-600" onClick={() => scrollToSection('safety')}>SAFETY</Button>
            </div>

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    form.handleSubmit();
                }}
                className="space-y-12"
            >
                {/* 1. IDENTITY */}
                <section id="identity" className="scroll-mt-32">
                    <SectionHeader title="Patient Identity" icon={Baby} color="slate" description="Verify details match admission slip." />
                    <HoverCard className="group premium-card border-none ring-1 ring-border shadow-sm">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-500" />
                        <CardHeader>
                            <CardTitle>Demographics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <form.Field
                                    name="dateOfBirth"
                                    children={(field) => (
                                        <div className="space-y-3">
                                            <Label className="font-semibold">Date of Birth</Label>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <Input
                                                        type="text"
                                                        placeholder="DD/MM/YYYY"
                                                        className="bg-white dark:bg-black pr-10"
                                                        value={dobText}
                                                        onChange={(e) => {
                                                            const masked = maskDate(e.target.value);
                                                            setDobText(masked);
                                                            if (masked.length === 10) {
                                                                const parts = masked.split("/");
                                                                if (parts.length === 3) {
                                                                    const d = parseInt(parts[0]);
                                                                    const m = parseInt(parts[1]) - 1;
                                                                    const y = parseInt(parts[2]);
                                                                    const newDate = new Date(y, m, d);
                                                                    if (!isNaN(newDate.getTime())) {
                                                                        field.handleChange(newDate);
                                                                        setDobCalendarMonth(newDate);
                                                                    }
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </div>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" size="icon" className="shrink-0 bg-white dark:bg-black">
                                                            <CalendarIcon className="h-4 w-4" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-0" align="end">
                                                        <Calendar
                                                            mode="single"
                                                            selected={field.state.value}
                                                            month={dobCalendarMonth}
                                                            onMonthChange={setDobCalendarMonth}
                                                            onSelect={(date) => {
                                                                field.handleChange(date);
                                                                if (date) {
                                                                    setDobText(format(date, "dd/MM/yyyy"));
                                                                    setDobCalendarMonth(date);
                                                                }
                                                            }}
                                                            captionLayout="dropdown"
                                                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                        </div>
                                    )}
                                />
                                <form.Field
                                    name="gender"
                                    children={(field) => (
                                        <div className="space-y-3">
                                            <Label className="font-semibold">Gender</Label>
                                            <Select onValueChange={(val) => field.handleChange(val as any)} defaultValue={field.state.value}>
                                                <SelectTrigger className="bg-white dark:bg-black">
                                                    <SelectValue placeholder="Select gender" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Male">Male</SelectItem>
                                                    <SelectItem value="Female">Female</SelectItem>
                                                    <SelectItem value="Not Known">Not Known</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </HoverCard>
                </section>

                {/* 2. ALERTS */}
                <section id="alerts" className="scroll-mt-32 space-y-4">
                    <SectionHeader title="ALERTS Protocol" icon={Eye} color="emerald" description="Assess early, Liaison, Engage, Risk, Safeguard." />

                    <div className="grid gap-6">
                        <AcronymCard letter="A" title="Assess Early" color="emerald">
                            <form.Field name="triagePerformed" children={(field) => (
                                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl mb-4">
                                    <Label className="font-semibold">MH Triage Started?</Label>
                                    <Switch checked={field.state.value} onCheckedChange={field.handleChange} className="scale-125 mr-2" />
                                </div>
                            )} />
                            <form.Field name="triageTime" children={(field) => (
                                <SmartTimeInput
                                    label="Time of Triage"
                                    value={field.state.value || undefined}
                                    arrivalDate={arrival}
                                    onChange={field.handleChange}
                                />
                            )} />
                        </AcronymCard>

                        <AcronymCard letter="L" title="Listen & Liase" description="Referral & Review" color="emerald">
                            <div className="grid gap-6">
                                <div>
                                    <form.Field name="referredToPsych" children={(field) => (
                                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl mb-4">
                                            <Label className="font-semibold">Referred to Psych / Liaison?</Label>
                                            <Switch checked={field.state.value} onCheckedChange={field.handleChange} className="scale-125 mr-2" />
                                        </div>
                                    )} />
                                    <form.Subscribe selector={(s) => s.values.referredToPsych} children={(referred) => (
                                        referred ? (
                                            <MotionDiv initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-4">
                                                <form.Field name="psychReferralTime" children={(field) => (
                                                    <SmartTimeInput
                                                        label="Time of Referral"
                                                        value={field.state.value || undefined}
                                                        arrivalDate={arrival}
                                                        onChange={field.handleChange}
                                                    />
                                                )} />
                                            </MotionDiv>
                                        ) : null
                                    )} />
                                </div>

                                <form.Subscribe selector={(s) => s.values.referredToPsych} children={(referred) => (
                                    referred ? (
                                        <MotionDiv initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="pt-4 border-t border-dashed">
                                            <Label className="block mb-4 font-semibold text-emerald-700 dark:text-emerald-300">Psychiatric Review Outcome</Label>
                                            <form.Field name="psychReviewTime" children={(field) => (
                                                <SmartTimeInput
                                                    label="Time of Psych/Liaison Review"
                                                    value={field.state.value || undefined}
                                                    arrivalDate={arrival}
                                                    onChange={field.handleChange}
                                                />
                                            )} />
                                        </MotionDiv>
                                    ) : null
                                )} />
                            </div>
                        </AcronymCard>

                        <AcronymCard letter="E" title="Engage" color="emerald">
                            <form.Field name="compassionateCare" children={(field) => (
                                <div className="space-y-3">
                                    <Label>Evidence of Compassionate Care?</Label>
                                    <RadioGroup value={field.state.value || ""} onValueChange={(val) => field.handleChange(val as any)} className="grid grid-cols-3 gap-3">
                                        {[{ val: "Yes", label: "Yes" }, { val: "Partial", label: "Partial" }, { val: "No", label: "No" }].map(opt => (
                                            <Label key={opt.val} className={cn("border p-2 rounded-lg text-center cursor-pointer hover:bg-slate-50 transition-colors", field.state.value === opt.val && "bg-emerald-50 border-emerald-500 text-emerald-700")}>
                                                <RadioGroupItem value={opt.val} className="sr-only" />
                                                {opt.label}
                                            </Label>
                                        ))}
                                    </RadioGroup>
                                </div>
                            )} />
                        </AcronymCard>

                        <AcronymCard letter="R" title="Record (Risk)" color="emerald">
                            <form.Field name="riskLevel" children={(field) => (
                                <RadioGroup value={field.state.value || ""} onValueChange={(val) => field.handleChange(val as any)} className="grid sm:grid-cols-3 gap-4 mb-6">
                                    {[
                                        { val: "Low", color: "emerald", label: "Low Risk", desc: "No immediate ideation, co-operative, protective factors." },
                                        { val: "Medium", color: "amber", label: "Medium Risk", desc: "Thoughts present but no plan, previous self-harm, vulnerable." },
                                        { val: "High", color: "red", label: "High Risk", desc: "Active plans, intent, means available, unable to guarantee safety." }
                                    ].map((opt) => (
                                        <Label key={opt.val} className={cn("border rounded-xl p-4 cursor-pointer hover:shadow-md transition-all dark:border-border/50 dark:bg-slate-900/50 h-full flex flex-col justify-between gap-2", field.state.value === opt.val ? `bg-${opt.color}-50 border-${opt.color}-500 ring-1 ring-${opt.color}-500` : "hover:bg-slate-50")}>
                                            <RadioGroupItem value={opt.val} className="sr-only" />
                                            <div className={cn("font-bold text-lg", `text-${opt.color}-700`)}>{opt.label}</div>
                                            <p className={cn("text-xs leading-relaxed opacity-90", `text-${opt.color}-900/80 dark:text-${opt.color}-200`)}>{opt.desc}</p>
                                        </Label>
                                    ))}
                                </RadioGroup>
                            )} />

                            {/* New Documented Checks */}
                            <div className="grid md:grid-cols-2 gap-4 mb-6">
                                <form.Field name="patientDescription" children={(field) => (
                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-border/50">
                                        <Label className="font-semibold text-base text-emerald-900 dark:text-emerald-100">Description Documented?</Label>
                                        <Switch checked={field.state.value} onCheckedChange={field.handleChange} className="scale-125" />
                                    </div>
                                )} />
                                <form.Field name="ligatureCheck" children={(field) => (
                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-border/50">
                                        <Label className="font-semibold text-base text-emerald-900 dark:text-emerald-100">Ligature Check Done?</Label>
                                        <Switch checked={field.state.value} onCheckedChange={field.handleChange} className="scale-125" />
                                    </div>
                                )} />
                            </div>

                            {/* Observation Logic */}
                            <form.Subscribe selector={s => s.values.riskLevel} children={(level) => {
                                if (level === "Medium" || level === "High") {
                                    const isHigh = level === "High";
                                    return (
                                        <MotionDiv initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}>
                                            <form.Field name="observationLevelMet" children={(field) => (
                                                <div className={cn("p-4 mb-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-border/50", isHigh ? "bg-red-50 rounded-xl border-l-red-500 border-red-100 text-red-900" : "bg-amber-50 rounded-xl border-l-amber-500 border-amber-100 text-amber-900")}>
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <Eye className={cn("w-5 h-5 mt-0.5", isHigh ? "text-red-600" : "text-amber-600")} />
                                                                <div className="font-semibold">Action Required: {isHigh ? "1:1 Constant Observation" : "Intermittent Checks / Line of Sight"}</div>
                                                            </div>
                                                            <div className="mt-2 ml-1 text-sm opacity-90 font-medium">
                                                                {isHigh ? "Patient must be within arm's length at all times. Do not leave unattended." : "Patient must be visible at all times or checked every 15 minutes."}
                                                                <br />
                                                                Toggle switch to confirm observation.
                                                            </div>
                                                        </div>
                                                        <Switch
                                                            checked={field.state.value === "Yes"}
                                                            onCheckedChange={(checked) => field.handleChange((checked ? "Yes" : "No") as any)}
                                                            className="data-[state=checked]:bg-green-600"
                                                        />
                                                    </div>
                                                </div>
                                            )} />
                                            {/* <form.Field name="observationLevelMet" children={(field) => (
                                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-border/50">
                                                    <div className="flex items-center justify-between">
                                                        <div className="space-y-1">
                                                            <Label className="font-semibold text-base">
                                                                {isHigh ? "Evidence of 1:1 Observation?" : "Evidence of Intermittent Checks?"}
                                                            </Label>
                                                            <p className="text-sm text-muted-foreground">
                                                                Confirm documentation exists in notes.
                                                            </p>
                                                        </div>
                                                        <Switch
                                                            checked={field.state.value === "Yes"}
                                                            onCheckedChange={(checked) => field.handleChange((checked ? "Yes" : "No") as any)}
                                                            className="data-[state=checked]:bg-green-600"
                                                        />
                                                    </div>
                                                </div> */}
                                        </MotionDiv>
                                    )
                                }
                                return null;
                            }} />
                        </AcronymCard>

                        <AcronymCard letter="S" title="Safeguarding" color="emerald">
                            <form.Field name="safeguardingCheck" children={(field) => (
                                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-border/50">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <Shield className="w-5 h-5 text-emerald-600" />
                                                <Label className="font-semibold text-base">Safeguarding Screening Completed?</Label>
                                            </div>
                                            <p className="text-sm text-muted-foreground leading-relaxed">
                                                Look for documentation that concerns were <strong className="text-foreground">considered</strong> regarding:
                                                <span className="block mt-1 pl-2 border-l-2 border-emerald-200 dark:border-emerald-800 text-xs">
                                                    • Dependents / Children at home<br />
                                                    • Domestic Abuse / Violence<br />
                                                    • Vulnerable Adults / Exploitation
                                                </span>
                                            </p>
                                        </div>
                                        <Switch
                                            checked={field.state.value}
                                            onCheckedChange={field.handleChange}
                                            className="data-[state=checked]:bg-emerald-600 scale-125 mr-2 mt-2"
                                        />
                                    </div>
                                </div>
                            )} />
                        </AcronymCard>
                    </div>
                </section>

                {/* 3. SAFETY */}
                <section id="safety" className="scroll-mt-32 space-y-4">
                    <SectionHeader title="SAFETY Protocol" icon={BrainCircuit} color="blue" description="Clinical Assessment: Suicide, Assessment, Future, Environment, Team, Your Actions." />

                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-blue-100 dark:border-blue-900/50 mb-6">
                        <form.Field name="clinicianSeen" children={(field) => (
                            <div className="flex items-center justify-between mb-2">
                                <div className="space-y-1">
                                    <Label className="font-bold text-lg text-blue-900 dark:text-blue-100">Seen by ED Clinician?</Label>
                                    <p className="text-sm text-muted-foreground">Required to complete the SAFETY risk assessment.</p>
                                </div>
                                <Switch checked={field.state.value} onCheckedChange={field.handleChange} className="scale-150 mr-2" />
                            </div>
                        )} />
                        
                        <form.Subscribe selector={s => s.values.clinicianSeen} children={(seen) => (
                            seen ? (
                                <MotionDiv initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800/50">
                                    <form.Field name="clinicianSeenTime" children={(field) => (
                                        <SmartTimeInput
                                            label="Time of Review"
                                            value={field.state.value || undefined}
                                            arrivalDate={arrival}
                                            onChange={field.handleChange}
                                        />
                                    )} />
                                </MotionDiv>
                            ) : null
                        )} />
                    </div>

                    <form.Subscribe selector={s => s.values.clinicianSeen} children={(seen) => (
                        seen ? (
                            <MotionDiv initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6">
                                <AcronymCard letter="S" title="Suicide Risk" color="blue">
                                    <div className="grid gap-3">
                                        <form.Field name="riskAssessmentType" children={(field) => (
                                            <Label className={cn("flex items-center gap-4 p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all", field.state.value ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800" : "bg-white dark:bg-slate-950 dark:border-slate-800")}>
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold">S</div>
                                                <span className="flex-1 font-medium text-blue-900 dark:text-blue-100">Type of Self-Harm / Suicide Risk Identified?</span>
                                                <Checkbox checked={field.state.value} onCheckedChange={c => field.handleChange(c === true)} className="scale-125 border-2 w-5 h-5 mr-2" />
                                            </Label>
                                        )} />
                                    </div>
                                </AcronymCard>

                                <AcronymCard letter="A" title="Antecedent / Trigger" color="blue">
                                    <form.Field name="riskAssessmentTrigger" children={(field) => (
                                        <Label className={cn("flex items-center gap-4 p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all", field.state.value ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800" : "bg-white dark:bg-slate-950 dark:border-slate-800")}>
                                            <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            <span className="flex-1 font-medium text-blue-900 dark:text-blue-100">Antecedent / Trigger Identified?</span>
                                            <Checkbox checked={field.state.value} onCheckedChange={c => field.handleChange(c === true)} className="scale-125 border-2 w-5 h-5 mr-2" />
                                        </Label>
                                    )} />
                                </AcronymCard>

                                <AcronymCard letter="F" title="Future Intent" color="blue">
                                    <form.Field name="riskAssessmentFuture" children={(field) => (
                                        <Label className={cn("flex items-center gap-4 p-4 rounded-xl border cursor-pointer hover:shadow-md transition-all", field.state.value ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800" : "bg-white dark:bg-slate-950 dark:border-slate-800")}>
                                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold">F</div>
                                            <span className="flex-1 font-medium text-blue-900 dark:text-blue-100">Future Intent Assessed?</span>
                                            <Checkbox checked={field.state.value} onCheckedChange={c => field.handleChange(c === true)} className="scale-125 border-2 w-5 h-5 mr-2" />
                                        </Label>
                                    )} />
                                </AcronymCard>

                                <AcronymCard letter="E" title="Environment & History" color="blue">
                                    <div className="grid gap-4">
                                        <form.Field name="environmentSocial" children={(field) => (
                                            <Label className={cn("flex items-start gap-4 p-4 rounded-xl border cursor-pointer hover:shadow-md h-full transition-colors", field.state.value ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800" : "bg-white dark:bg-slate-950 dark:border-slate-800")}>
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                                                    <Home className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1">
                                                    <span className="font-bold block text-base text-blue-900 dark:text-blue-100">Psychosocial History</span>
                                                    <span className="text-sm text-muted-foreground">Is Home Situation, Employment, and Social Support documented?</span>
                                                </div>
                                                <Checkbox checked={field.state.value} onCheckedChange={c => field.handleChange(c === true)} className="mt-1 scale-125 border-2 w-5 h-5 mr-2" />
                                            </Label>
                                        )} />
                                        <form.Field name="environmentAlcohol" children={(field) => (
                                            <Label className={cn("flex items-start gap-4 p-4 rounded-xl border cursor-pointer hover:shadow-md h-full transition-colors", field.state.value ? "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800" : "bg-white dark:bg-slate-950 dark:border-slate-800")}>
                                                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                                                    <Stethoscope className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1">
                                                    <span className="font-bold block text-base text-blue-900 dark:text-blue-100">Drug & Alcohol History</span>
                                                    <span className="text-sm text-muted-foreground">Is use (or absence of use) explicitly documented?</span>
                                                </div>
                                                <Checkbox checked={field.state.value} onCheckedChange={c => field.handleChange(c === true)} className="mt-1 scale-125 border-2 w-5 h-5 mr-2" />
                                            </Label>
                                        )} />
                                    </div>
                                </AcronymCard>

                                <AcronymCard letter="Y" title="Your Actions" color="blue">
                                    <form.Field name="dischargePlanSafe" children={(field) => (
                                        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-border/50">
                                            <div className="flex items-start justify-between gap-4">
                                                <div className="space-y-2">
                                                    <Label className="font-semibold text-base">Discharge Plan Safe?</Label>
                                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                                        Documentation must confirm a safe discharge plan was made, including:
                                                        <span className="block mt-1 pl-2 border-l-2 border-blue-200 dark:border-blue-800 text-xs">
                                                            • Safety netting advice (written/verbal)<br />
                                                            • Crisis numbers provided<br />
                                                            • GP/Follow-up arranged<br />
                                                            • Family/Carers involved if appropriate
                                                        </span>
                                                    </p>
                                                </div>
                                                <Switch checked={field.state.value} onCheckedChange={field.handleChange} className="scale-125 mr-2 mt-2" />
                                            </div>
                                        </div>
                                    )} />
                                </AcronymCard>
                            </MotionDiv>
                        ) : (
                            <div className="text-center p-12 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/20 text-muted-foreground">
                                <BrainCircuit className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>Enable "Seen by ED Clinician" to complete the SAFETY protocol.</p>
                            </div>
                        )
                    )} />
                </section>

                <div className="py-8 border-t border-border">
                    <h3 className="text-2xl font-bold text-center mb-8">Summary Preview</h3>
                    <form.Subscribe selector={s => s.values} children={(values) => (
                        <AuditSummary values={values} arrival={arrival} />
                    )} />
                </div>

                {/* Submit Footer */}
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t border-border z-50 flex justify-center items-center shadow-2xl">
                    <div className="w-full max-w-4xl flex justify-between items-center gap-4 px-4">
                        <span className="text-xs text-muted-foreground hidden sm:block">
                            Review all sections above before submitting.
                        </span>
                        <Button type="submit" size="lg" className="bg-green-600 hover:bg-green-700 min-w-[200px] shadow-lg shadow-green-500/20 font-bold text-lg h-12 rounded-full">
                            <Save className="w-5 h-5 mr-2" /> Complete Audit
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
