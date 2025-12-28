import { useNavigate, useSearch, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useForm } from "@tanstack/react-form";
import { format, addDays, isBefore } from "date-fns";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    AlertTriangle,
    CheckCircle2,
    ArrowLeft,
    CalendarClock,
    Stethoscope,
    BrainCircuit,
    Clock,
    ShieldAlert,
    Eye,
    Heart,
    ShieldCheck,
    FileText
} from "lucide-react";

import { RiskLevel, ObservationStatus } from "@/lib/schema";
import { submitAuditFn } from "@/server/actions";
import { MotionDiv, AnimatedContainer, AnimatedItem, HoverCard } from "@/components/ui/motion";

const auditSearchSchema = z.object({
    token: z.string(),
    arrival: z.string(),
});

export const Route = createFileRoute("/audit/form")({
    validateSearch: auditSearchSchema,
    component: CombinedAuditForm,
});

function CombinedAuditForm() {
    const { token, arrival } = useSearch({ from: "/audit/form" });
    const navigate = useNavigate();
    const arrivalDate = new Date(arrival);

    const submissionHandler = async (value: any) => {
        try {
            // Logic for Triage Time Calculation
            let formattedTriageTime: string | null | undefined = undefined;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if ((value as any).triageTime && arrival) {
                const [hours, minutes] = (value as any).triageTime.split(':').map(Number);
                let triageDate = new Date(arrival);
                triageDate.setHours(hours, minutes, 0, 0);
                if (isBefore(triageDate, arrivalDate)) {
                    // Logic: If triage time is earlier than arrival (e.g. 01:00 vs 23:00), assume next day
                    triageDate = addDays(triageDate, 1);
                }
                formattedTriageTime = triageDate.toISOString();
            }

            // Logic for History Status (SAFETY)
            let historyStatus = "Poor";
            const val = value as any;
            if (val.environmentSocial && val.environmentAlcohol) {
                historyStatus = "Adequate";
            } else if (val.environmentSocial || val.environmentAlcohol) {
                historyStatus = "Partial";
            }

            const payload = {
                ...value,
                patientToken: token,
                arrivalDate: arrival,
                triageTime: formattedTriageTime,
                createdAt: new Date().toISOString(),
                // Safety Calc
                riskAssessmentHistory: historyStatus,
                drugAlcoholConsidered: val.environmentAlcohol || false,
                // Ensure booleans
                clinicianSeen: true,
                triagePerformed: !!val.triagePerformed,
            };

            await submitAuditFn({ data: payload });
            navigate({ to: "/dashboard" });
        } catch (e) {
            console.error("Submission failed", e);
            alert("Failed to save audit. Please try again.");
        }
    };

    const form = useForm({
        defaultValues: {
            // ALERTS
            triagePerformed: true,
            triageTime: format(new Date(), "HH:mm"),
            riskLevel: undefined as RiskLevel | undefined,
            observationLevelMet: undefined as ObservationStatus | undefined,
            compassionateCare: undefined as "Yes" | "Partial" | "No" | undefined,
            safeguardingCheck: false,

            // SAFETY
            riskAssessmentType: false,
            riskAssessmentTrigger: false,
            riskAssessmentFuture: false,
            environmentSocial: false,
            environmentAlcohol: false,
            teamCommunication: false,
            capacityAssessment: false,
            dischargePlanSafe: false,
        },
        onSubmit: async ({ value }) => {
            await submissionHandler(value);
        },
    });

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-neutral-950 pb-20">
            {/* Header */}
            <header className="bg-brand-600/90 backdrop-blur-md text-white border-b border-white/10 sticky top-0 z-20 shadow-xl shadow-brand-900/10">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white p-2 h-auto" onClick={() => window.history.back()}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-lg font-bold flex items-center gap-2">
                                <Stethoscope className="w-5 h-5 text-brand-200" />
                                Combined Clinical Audit
                            </h1>
                            <div className="flex items-center gap-2 text-xs text-brand-100/80">
                                <span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wider">
                                    {token.substring(0, 8)}
                                </span>
                                <span>• ALERTS & SAFETY</span>
                            </div>
                        </div>
                    </div>
                    <div className="text-right hidden sm:block">
                        <div className="flex items-center gap-2 justify-end text-brand-200 text-xs font-medium uppercase tracking-wider">
                            <CalendarClock className="w-3 h-3" /> Arrival Time
                        </div>
                        <div className="text-lg font-bold font-mono tracking-tight">{format(arrivalDate, "HH:mm")} <span className="text-sm opacity-70 font-sans font-normal">on {format(arrivalDate, "dd MMM")}</span></div>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 sm:p-6 mt-4">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        form.handleSubmit();
                    }}
                >
                    <AnimatedContainer className="space-y-8">

                        {/* SECTION 1: TRIAGE (ALERTS) */}
                        <AnimatedItem>
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shadow-sm"><AlertTriangle className="w-6 h-6" /></div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-foreground">Part 1: Triage Assessment (ALERTS)</h2>
                                        <p className="text-muted-foreground text-sm">Nurse / Initial Assessment Protocol</p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open('/alerts.png', '_blank')}
                                    className="hidden sm:flex"
                                >
                                    <FileText className="w-4 h-4 mr-2" /> Guidance
                                </Button>
                            </div>

                            {/* A - Assess Early */}
                            <HoverCard className="group premium-card border-none ring-1 ring-border shadow-sm mb-6">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-xl flex items-center gap-3">
                                            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg text-emerald-600">
                                                <Clock className="w-5 h-5" />
                                            </div>
                                            A - Assess Early
                                        </CardTitle>
                                        <div className="text-6xl font-black text-slate-100 dark:text-slate-800 -my-6 select-none opacity-50 group-hover:opacity-100 transition-opacity">A</div>
                                    </div>
                                </CardHeader>
                                <CardContent className="grid sm:grid-cols-2 gap-6">
                                    <form.Field
                                        name="triagePerformed"
                                        children={(field) => (
                                            <div className="flex flex-col justify-center space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-border/50">
                                                <div className="flex items-center justify-between">
                                                    <Label htmlFor={field.name} className="font-semibold cursor-pointer">
                                                        MH Triage Started?
                                                    </Label>
                                                    <Switch
                                                        id={field.name}
                                                        checked={field.state.value}
                                                        onCheckedChange={field.handleChange}
                                                    />
                                                </div>
                                                <p className="text-xs text-muted-foreground">Was the mental health specific triage initiated?</p>
                                            </div>
                                        )}
                                    />
                                    <form.Field
                                        name="triageTime"
                                        children={(field) => (
                                            <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-border/50">
                                                <Label className="font-semibold">Time of Triage</Label>
                                                <div className="flex items-center gap-3">
                                                    <Input
                                                        type="time"
                                                        value={field.state.value}
                                                        onChange={(e) => field.handleChange(e.target.value)}
                                                        className="text-xl font-mono h-12 bg-white dark:bg-black"
                                                    />
                                                </div>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    Target: <span className="font-mono font-medium text-emerald-600">{format(new Date(arrivalDate.getTime() + 15 * 60000), "HH:mm")}</span> (15m from arrival)
                                                </p>
                                            </div>
                                        )}
                                    />
                                </CardContent>
                            </HoverCard>

                            {/* R - Risk & Observation */}
                            <HoverCard className="group premium-card border-none ring-1 ring-border shadow-sm mb-6">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-xl flex items-center gap-3">
                                            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600">
                                                <ShieldAlert className="w-5 h-5" />
                                            </div>
                                            R - Risk Assessment
                                        </CardTitle>
                                        <div className="text-6xl font-black text-slate-100 dark:text-slate-800 -my-6 select-none opacity-50 group-hover:opacity-100 transition-opacity">R</div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <form.Field
                                        name="riskLevel"
                                        children={(field) => (
                                            <RadioGroup
                                                value={field.state.value || ""}
                                                onValueChange={(val) => field.handleChange(val as RiskLevel)}
                                                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                                            >
                                                {[
                                                    { val: "Low", color: "emerald", label: "Low Risk", desc: "No immediate ideation, cooperative." },
                                                    { val: "Medium", color: "amber", label: "Medium Risk", desc: "Thoughts present, no plan, vulnerable." },
                                                    { val: "High", color: "red", label: "High Risk", desc: "Active plans, intent, means available." }
                                                ].map((opt) => (
                                                    <Label
                                                        key={opt.val}
                                                        htmlFor={`risk-${opt.val}`}
                                                        className={cn(
                                                            "relative overflow-hidden border rounded-xl p-4 cursor-pointer transition-all flex flex-col gap-2 hover:shadow-md",
                                                            field.state.value === opt.val
                                                                ? `bg-${opt.color}-50 border-${opt.color}-500 ring-1 ring-${opt.color}-500 dark:bg-${opt.color}-950`
                                                                : "hover:bg-slate-50 dark:hover:bg-slate-900"
                                                        )}
                                                    >
                                                        <RadioGroupItem value={opt.val} id={`risk-${opt.val}`} className="sr-only" />
                                                        <div className={cn("font-bold text-lg", `text-${opt.color}-700 dark:text-${opt.color}-400`)}>{opt.label}</div>
                                                        <div className="text-xs text-muted-foreground leading-relaxed">{opt.desc}</div>
                                                        {field.state.value === opt.val && (
                                                            <div className={cn("absolute top-0 right-0 p-1.5 rounded-bl-lg text-white", `bg-${opt.color}-500`)}>
                                                                <CheckCircle2 className="w-4 h-4" />
                                                            </div>
                                                        )}
                                                    </Label>
                                                ))}
                                            </RadioGroup>
                                        )}
                                    />

                                    <form.Subscribe
                                        selector={(state) => [state.values.riskLevel]}
                                        children={([riskLevel]) => {
                                            if (riskLevel === "Medium" || riskLevel === "High") {
                                                const isHigh = riskLevel === "High";
                                                return (
                                                    <MotionDiv
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        className="space-y-4 pt-2"
                                                    >
                                                        <Alert variant="destructive" className={cn(
                                                            "border shadow-sm",
                                                            isHigh ? "bg-red-50 border-red-200 text-red-900" : "bg-amber-50 border-amber-200 text-amber-900"
                                                        )}>
                                                            <Eye className="h-5 w-5" />
                                                            <div className="ml-2">
                                                                <AlertTitle className="font-bold flex items-center gap-2">
                                                                    Observation Required
                                                                    {isHigh && <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full uppercase">Critical</span>}
                                                                </AlertTitle>
                                                                <AlertDescription className="text-sm opacity-90 mt-1">
                                                                    {isHigh ? "Immediate 1:1 constant observation." : "Lines of sight or intermittent checks."}
                                                                </AlertDescription>
                                                            </div>
                                                        </Alert>

                                                        <div className="space-y-3 p-5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-border/50">
                                                            <Label className="text-base font-semibold">Was this observation documented?</Label>
                                                            <form.Field
                                                                name="observationLevelMet"
                                                                children={(field) => (
                                                                    <div className="flex gap-2">
                                                                        {["Yes", "Partial", "No"].map(opt => (
                                                                            <Button
                                                                                key={opt}
                                                                                type="button"
                                                                                variant={field.state.value === opt ? "default" : "outline"}
                                                                                size="sm"
                                                                                onClick={() => field.handleChange(opt as any)}
                                                                                className={field.state.value === opt ? "bg-amber-600 hover:bg-amber-700" : ""}
                                                                            >
                                                                                {opt}
                                                                            </Button>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            />
                                                        </div>
                                                    </MotionDiv>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                </CardContent>
                            </HoverCard>

                            {/* E & S - Engage & Safeguard */}
                            <HoverCard className="group premium-card border-none ring-1 ring-border shadow-sm">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-xl flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                                                <Heart className="w-5 h-5" />
                                            </div>
                                            E & S - Engage & Safeguard
                                        </CardTitle>
                                        <div className="text-6xl font-black text-slate-100 dark:text-slate-800 -my-6 select-none opacity-50 group-hover:opacity-100 transition-opacity">ES</div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-3">
                                        <Label className="text-base font-semibold">Evidence of Compassionate Care?</Label>
                                        <p className="text-sm text-muted-foreground pb-2">Includes offering food/drink, pain relief, and clear explanations.</p>
                                        <form.Field
                                            name="compassionateCare"
                                            children={(field) => (
                                                <RadioGroup
                                                    value={field.state.value || ""}
                                                    onValueChange={(val) => field.handleChange(val as any)}
                                                    className="grid grid-cols-3 gap-3"
                                                >
                                                    {[
                                                        { val: "Yes", label: "Yes" },
                                                        { val: "Partial", label: "Partial" },
                                                        { val: "No", label: "No" }
                                                    ].map((opt) => (
                                                        <Label key={opt.val} className={cn(
                                                            "border p-2 rounded-lg text-center cursor-pointer hover:bg-slate-50 transition-colors text-sm font-medium",
                                                            field.state.value === opt.val && "bg-blue-50 border-blue-500 text-blue-700"
                                                        )}>
                                                            <RadioGroupItem value={opt.val} id={`comp-${opt.val}`} className="sr-only" />
                                                            {opt.label}
                                                        </Label>
                                                    ))}
                                                </RadioGroup>
                                            )}
                                        />
                                    </div>

                                    <Separator />

                                    <form.Field
                                        name="safeguardingCheck"
                                        children={(field) => (
                                            <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                                                <ShieldCheck className="w-5 h-5 text-indigo-600 mt-0.5" />
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <Label htmlFor={field.name} className="font-bold cursor-pointer">
                                                            Safeguarding Screening
                                                        </Label>
                                                        <Switch id={field.name} checked={field.state.value} onCheckedChange={field.handleChange} />
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        Checks for dependents, abuse history, homelessness, or exploitation.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    />
                                </CardContent>
                            </HoverCard>
                        </AnimatedItem>


                        {/* SECTION 2: SAFETY (CLINICAL) */}
                        <AnimatedItem>
                            <div className="flex items-center justify-between mb-6 pt-8 border-t-2 border-dashed border-border/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-blue-100 text-blue-700 rounded-xl shadow-sm"><BrainCircuit className="w-6 h-6" /></div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-foreground">Part 2: Clinical Assessment (SAFETY)</h2>
                                        <p className="text-muted-foreground text-sm">Doctor / Clinician Review Protocol</p>
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.open('/safety.png', '_blank')}
                                    className="hidden sm:flex"
                                >
                                    <FileText className="w-4 h-4 mr-2" /> Guidance
                                </Button>
                            </div>

                            <HoverCard className="group premium-card border-none ring-1 ring-border shadow-sm mb-6">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-xl flex items-center gap-3">
                                            S.A.F - Risk Assessment
                                        </CardTitle>
                                        <div className="text-6xl font-black text-slate-100 dark:text-slate-800 -my-6 select-none opacity-50 group-hover:opacity-100 transition-opacity">SAF</div>
                                    </div>
                                    <CardDescription>Was a risk assessment documented covering these core areas?</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid gap-3">
                                        {[
                                            { id: "saf-type", field: "riskAssessmentType", label: "Self-Harm Type", desc: "Method/Type documented", icon: "S" },
                                            { id: "saf-trigger", field: "riskAssessmentTrigger", label: "Antecedent / Trigger", desc: "Reasons identified", icon: "A" },
                                            { id: "saf-future", field: "riskAssessmentFuture", label: "Future Intent", desc: "Plans or ongoing intent", icon: "F" }
                                        ].map((item) => (
                                            <form.Field
                                                key={item.id}
                                                name={item.field as any}
                                                children={(field) => (
                                                    <Label
                                                        htmlFor={item.id}
                                                        className={cn(
                                                            "flex items-center gap-4 p-4 rounded-xl border border-border/50 cursor-pointer transition-all hover:shadow-md",
                                                            field.state.value ? "bg-blue-50/50 border-blue-200 dark:bg-blue-900/20" : "bg-white dark:bg-card hover:bg-slate-50"
                                                        )}
                                                    >
                                                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700 font-bold dark:bg-blue-900 dark:text-blue-300">
                                                            {item.icon}
                                                        </div>
                                                        <div className="flex-1 space-y-1">
                                                            <div className="font-bold text-base leading-none">{item.label}</div>
                                                            <div className="text-xs text-muted-foreground">{item.desc}</div>
                                                        </div>
                                                        <Checkbox
                                                            id={item.id}
                                                            checked={field.state.value}
                                                            onCheckedChange={(c) => field.handleChange(c === true)}
                                                            className="h-6 w-6 border-2 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                                                        />
                                                    </Label>
                                                )}
                                            />
                                        ))}
                                    </div>
                                </CardContent>
                            </HoverCard>

                            <HoverCard className="group premium-card border-none ring-1 ring-border shadow-sm mb-6">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500" />
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-xl flex items-center gap-3">
                                            E - Environment / History
                                        </CardTitle>
                                        <div className="text-6xl font-black text-slate-100 dark:text-slate-800 -my-6 select-none opacity-50 group-hover:opacity-100 transition-opacity">E</div>
                                    </div>
                                </CardHeader>
                                <CardContent className="grid sm:grid-cols-2 gap-4">
                                    <form.Field
                                        name="environmentSocial"
                                        children={(field) => (
                                            <Label
                                                htmlFor="env-soc"
                                                className={cn(
                                                    "flex items-start gap-3 p-4 rounded-xl border border-border/50 cursor-pointer transition-all hover:shadow-md h-full",
                                                    field.state.value ? "bg-amber-50/50 border-amber-200 dark:bg-amber-900/20" : "bg-white dark:bg-card hover:bg-slate-50"
                                                )}
                                            >
                                                <Checkbox id="env-soc" checked={field.state.value} onCheckedChange={(c) => field.handleChange(c === true)} className="mt-1 h-5 w-5 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500" />
                                                <div className="space-y-1">
                                                    <span className="font-bold text-base block">Psych & Social History</span>
                                                    <span className="text-xs text-muted-foreground block leading-snug">
                                                        Home situation, employment, safeguarding checks.
                                                    </span>
                                                </div>
                                            </Label>
                                        )}
                                    />
                                    <form.Field
                                        name="environmentAlcohol"
                                        children={(field) => (
                                            <Label
                                                htmlFor="env-alc"
                                                className={cn(
                                                    "flex items-start gap-3 p-4 rounded-xl border border-border/50 cursor-pointer transition-all hover:shadow-md h-full",
                                                    field.state.value ? "bg-amber-50/50 border-amber-200 dark:bg-amber-900/20" : "bg-white dark:bg-card hover:bg-slate-50"
                                                )}
                                            >
                                                <Checkbox id="env-alc" checked={field.state.value} onCheckedChange={(c) => field.handleChange(c === true)} className="mt-1 h-5 w-5 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500" />
                                                <div className="space-y-1">
                                                    <span className="font-bold text-base block">Drug / Alcohol Use</span>
                                                    <span className="text-xs text-muted-foreground block leading-snug">
                                                        Documented use or absence of use.
                                                    </span>
                                                </div>
                                            </Label>
                                        )}
                                    />
                                </CardContent>
                            </HoverCard>

                            <HoverCard className="group premium-card border-none ring-1 ring-border shadow-sm mb-6">
                                <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                                <CardHeader className="pb-4">
                                    <div className="flex items-center justify-between">
                                        <CardTitle className="text-xl flex items-center gap-3">
                                            T & Y - Team & Your Actions
                                        </CardTitle>
                                        <div className="text-6xl font-black text-slate-100 dark:text-slate-800 -my-6 select-none opacity-50 group-hover:opacity-100 transition-opacity">TY</div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <form.Field
                                        name="teamCommunication"
                                        children={(field) => (
                                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                                                <Label className="flex-1 cursor-pointer" htmlFor="team-comm">
                                                    <span className="block font-semibold">Team Communication</span>
                                                    <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                                                        Liaison referrals, handover details, observation plans.
                                                    </span>
                                                </Label>
                                                <Switch id="team-comm" checked={field.state.value} onCheckedChange={field.handleChange} />
                                            </div>
                                        )}
                                    />

                                    <Separator className="opacity-50" />

                                    <form.Field
                                        name="capacityAssessment"
                                        children={(field) => (
                                            <div className="flex items-center justify-between p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/20">
                                                <Label className="flex-1 text-indigo-900 dark:text-indigo-300 font-bold cursor-pointer" htmlFor="capacity-assess">
                                                    Capacity Assessment (MCA)
                                                    <span className="block text-xs font-normal opacity-80 mt-0.5">
                                                        Understand, Retain, Weigh, Communicate.
                                                    </span>
                                                </Label>
                                                <Switch id="capacity-assess" checked={field.state.value} onCheckedChange={field.handleChange} />
                                            </div>
                                        )}
                                    />

                                    <Separator className="opacity-50" />

                                    <form.Field
                                        name="dischargePlanSafe"
                                        children={(field) => (
                                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                                                <Label className="flex-1 font-semibold cursor-pointer" htmlFor="discharge-plan">
                                                    Safety Netting & Discharge Plan
                                                </Label>
                                                <Switch id="discharge-plan" checked={field.state.value} onCheckedChange={field.handleChange} />
                                            </div>
                                        )}
                                    />
                                </CardContent>
                            </HoverCard>
                        </AnimatedItem>

                        <AnimatedItem className="pt-4 pb-12">
                            <Button
                                type="submit"
                                size="lg"
                                className="w-full h-16 text-lg bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 shadow-lg shadow-brand-500/20 rounded-xl transition-all hover:scale-[1.01]"
                                disabled={false}
                            >
                                <CheckCircle2 className="mr-2 h-6 w-6" />
                                Submit Complete Audit
                            </Button>
                        </AnimatedItem>
                    </AnimatedContainer>
                </form>
            </main>
        </div>
    );
}
