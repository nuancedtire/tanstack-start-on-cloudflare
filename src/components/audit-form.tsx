import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { format, addDays, isBefore } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
    BrainCircuit,
    Clock,
    ShieldAlert,
    Eye,
    Heart,
    ShieldCheck,
    CalendarIcon
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
import { MotionDiv, AnimatedContainer, AnimatedItem, HoverCard } from "@/components/ui/motion";

interface AuditFormProps {
    initialData?: Partial<AuditRecord>;
    token: string;
    encryptedToken?: string;
    arrival: string; // ISO String
    onSuccess?: (data: any) => void;
    mode?: "create" | "edit";
}

export function AuditForm({ initialData, token, encryptedToken, arrival, onSuccess, mode = "create" }: AuditFormProps) {
    const queryClient = useQueryClient();
    const arrivalDate = new Date(arrival);

    // Local state for DOB text input to allow fluid typing
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
            // Helper to process HH:mm times relative to Arrival
            const processTime = (timeStr: string | undefined | null, originalIso: string | undefined | null) => {
                if (!timeStr) return undefined;
                // If we have an existing ISO string and nothing changed, keep it
                if (originalIso && timeStr === format(new Date(originalIso), "HH:mm")) {
                    return originalIso;
                }
                if (!arrival) return undefined;

                // Convert HH:mm to ISO relative to arrival
                const [hours, minutes] = timeStr.split(':').map(Number);
                let date = new Date(arrival);
                date.setHours(hours, minutes, 0, 0);
                
                // Logic: If time is earlier than arrival (e.g. 01:00 vs 23:00), assume next day
                // because all these events happen AFTER arrival.
                if (isBefore(date, arrivalDate)) {
                    date = addDays(date, 1);
                }
                return date.toISOString();
            };

            const formattedTriageTime = processTime(value.triageTime, initialData?.triageTime);
            const formattedClinicianTime = processTime(value.clinicianSeenTime, initialData?.clinicianSeenTime);
            const formattedPsychRefTime = processTime(value.psychReferralTime, initialData?.psychReferralTime);
            const formattedPsychRevTime = processTime(value.psychReviewTime, initialData?.psychReviewTime);
            const formattedDepartureTime = processTime(value.departureTime, initialData?.departureTime);

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
                triageTime: formattedTriageTime,
                
                // New Timings
                clinicianSeenTime: formattedClinicianTime,
                psychReferralTime: formattedPsychRefTime,
                psychReviewTime: formattedPsychRevTime,
                departureTime: formattedDepartureTime,

                // Only set createdAt on create, or keep original
                createdAt: initialData?.createdAt || new Date().toISOString(),
                // Safety Calc
                riskAssessmentHistory: historyStatus,
                drugAlcoholConsidered: val.environmentAlcohol || false,
                // Ensure booleans
                clinicianSeen: !!val.clinicianSeen, // Explicit boolean
                triagePerformed: !!val.triagePerformed,
            };

            if (mode === "edit" && initialData?.id) {
                await updateAuditFn({ data: { id: initialData.id, data: payload } });
            } else {
                await submitAuditFn({ data: payload });
            }

            // Invalidate queries to refresh data
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
            triageTime: initialData?.triageTime ? format(new Date(initialData.triageTime), "HH:mm") : format(new Date(), "HH:mm"),
            dateOfBirth: initialData?.dateOfBirth ? new Date(initialData.dateOfBirth) : undefined,
            gender: initialData?.gender,
            riskLevel: initialData?.riskLevel as RiskLevel | undefined,
            observationLevelMet: initialData?.observationLevelMet as ObservationStatus | undefined,
            compassionateCare: initialData?.compassionateCare as "Yes" | "Partial" | "No" | undefined,
            safeguardingCheck: initialData?.safeguardingCheck ?? false,

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
            
            // New Timings
            clinicianSeen: initialData?.clinicianSeen ?? false,
            referredToPsych: initialData?.referredToPsych ?? false,
            clinicianSeenTime: initialData?.clinicianSeenTime ? format(new Date(initialData.clinicianSeenTime), "HH:mm") : undefined,
            psychReferralTime: initialData?.psychReferralTime ? format(new Date(initialData.psychReferralTime), "HH:mm") : undefined,
            psychReviewTime: initialData?.psychReviewTime ? format(new Date(initialData.psychReviewTime), "HH:mm") : undefined,
            departureTime: initialData?.departureTime ? format(new Date(initialData.departureTime), "HH:mm") : undefined,
        },

        onSubmit: async ({ value }) => {
            await submissionHandler(value);
        },
    });

    return (
        <div className="w-full">
            {/* Header omitted here to be flexible, can be passed as children or rendered by parent if needed, 
                but keeping the card structure */}

            <form
                onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    form.handleSubmit();
                }}
            >
                <AnimatedContainer className="space-y-8">


                    {/* SECTION 0: PATIENT IDENTITY */}
                    <AnimatedItem>
                        <HoverCard className="group premium-card border-none ring-1 ring-border shadow-sm mb-6">
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-slate-500" />
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xl flex items-center gap-3">
                                    Patient Identity
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid sm:grid-cols-2 gap-6">
                                <form.Field
                                    name="dateOfBirth"
                                    children={(field) => (
                                        <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-border/50">
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
                                                            // If it looks like a full date, try to parse it
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
                                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-muted-foreground/50 text-xs">
                                                        DD/MM/YYYY
                                                    </div>
                                                </div>
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="shrink-0 bg-white dark:bg-black"
                                                            onClick={() => {
                                                                if (field.state.value) setDobCalendarMonth(field.state.value);
                                                            }}
                                                        >
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
                                                            disabled={(date) =>
                                                                date > new Date() || date < new Date("1900-01-01")
                                                            }
                                                            initialFocus
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            </div>
                                            <p className="text-[10px] text-muted-foreground">Type manually or use the calendar</p>
                                        </div>
                                    )}
                                />
                                <form.Field
                                    name="gender"
                                    children={(field) => (
                                        <div className="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-border/50">
                                            <Label className="font-semibold">Gender</Label>
                                            <Select
                                                onValueChange={(val) => field.handleChange(val as any)}
                                                defaultValue={field.state.value}
                                            >
                                                <SelectTrigger>
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
                            </CardContent>
                        </HoverCard>
                    </AnimatedItem>

                    {/* SECTION 1: TRIAGE (ALERTS) */}
                    <AnimatedItem>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shadow-sm"><AlertTriangle className="w-6 h-6" /></div>
                                <div>
                                    <h2 className="text-2xl font-bold text-foreground">Part 1: Triage Assessment</h2>
                                    <p className="text-muted-foreground text-sm">Nurse / Initial Assessment Protocol</p>
                                </div>
                            </div>
                            <div
                                className="hidden sm:block relative group cursor-pointer overflow-hidden rounded-xs border-2 border-emerald-100 shadow-sm aspect-[5/7] w-20 transition-all hover:ring-2 hover:ring-emerald-500 hover:shadow-md"
                                onClick={() => window.open('/alerts.png', '_blank')}
                            >
                                <img src="/alerts.png" alt="Alerts Guidance" className="object-cover w-full h-full" />
                                <div className="absolute inset-0 bg-emerald-600/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Eye className="w-6 h-6 text-emerald-900 drop-shadow-sm" />
                                </div>
                            </div>
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
                                    selector={(state) => state.values.riskLevel}
                                    children={(riskLevel) => {
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
                                    <h2 className="text-2xl font-bold text-foreground">Part 2: Clinical Assessment</h2>
                                    <p className="text-muted-foreground text-sm">Doctor / Clinician Review Protocol</p>
                                </div>
                            </div>
                            <div
                                className="hidden sm:block relative group cursor-pointer overflow-hidden rounded-xs border-2 border-blue-100 shadow-sm aspect-[5/7] w-20 transition-all hover:ring-2 hover:ring-blue-500 hover:shadow-md"
                                onClick={() => window.open('/safety.png', '_blank')}
                            >
                                <img src="/safety.png" alt="Safety Guidance" className="object-cover w-full h-full" />
                                <div className="absolute inset-0 bg-blue-600/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Eye className="w-6 h-6 text-blue-900 drop-shadow-sm" />
                                </div>
                            </div>
                        </div>

                        {/* ED Review Time */}
                        <HoverCard className="group premium-card border-none ring-1 ring-border shadow-sm mb-6">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-blue-500" />
                                    ED Clinician Review
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="grid sm:grid-cols-2 gap-6">
                                <form.Field
                                    name="clinicianSeen"
                                    children={(field) => (
                                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-border/50">
                                            <Label htmlFor={field.name} className="font-semibold cursor-pointer">
                                                Seen by ED Clinician?
                                            </Label>
                                            <Switch
                                                id={field.name}
                                                checked={field.state.value}
                                                onCheckedChange={field.handleChange}
                                            />
                                        </div>
                                    )}
                                />
                                <form.Field
                                    name="clinicianSeenTime"
                                    children={(field) => (
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Time of Review</Label>
                                            <Input
                                                type="time"
                                                className="bg-white dark:bg-black"
                                                value={field.state.value || ""}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                            />
                                        </div>
                                    )}
                                />
                            </CardContent>
                        </HoverCard>

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

                    {/* SECTION 3: OUTCOMES (NEW) */}
                    <AnimatedItem>
                        <div className="flex items-center justify-between mb-6 pt-8 border-t-2 border-dashed border-border/50">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl shadow-sm"><CheckCircle2 className="w-6 h-6" /></div>
                                <div>
                                    <h2 className="text-2xl font-bold text-foreground">Part 3: Outcomes & Timings</h2>
                                    <p className="text-muted-foreground text-sm">Discharge & Liaison Pathway</p>
                                </div>
                            </div>
                        </div>

                        <HoverCard className="group premium-card border-none ring-1 ring-border shadow-sm mb-6">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    Psychiatric Liaison
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <form.Field
                                    name="referredToPsych"
                                    children={(field) => (
                                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-border/50">
                                            <Label htmlFor={field.name} className="font-semibold cursor-pointer">
                                                Referred to Psych Liaison?
                                            </Label>
                                            <Switch
                                                id={field.name}
                                                checked={field.state.value}
                                                onCheckedChange={field.handleChange}
                                            />
                                        </div>
                                    )}
                                />

                                <div className="grid sm:grid-cols-2 gap-6">
                                    <form.Field
                                        name="psychReferralTime"
                                        children={(field) => (
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Time of Referral</Label>
                                                <Input
                                                    type="time"
                                                    className="bg-white dark:bg-black"
                                                    value={field.state.value || ""}
                                                    onChange={(e) => field.handleChange(e.target.value)}
                                                />
                                            </div>
                                        )}
                                    />
                                    <form.Field
                                        name="psychReviewTime"
                                        children={(field) => (
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Time of Psych Review</Label>
                                                <Input
                                                    type="time"
                                                    className="bg-white dark:bg-black"
                                                    value={field.state.value || ""}
                                                    onChange={(e) => field.handleChange(e.target.value)}
                                                />
                                            </div>
                                        )}
                                    />
                                </div>
                            </CardContent>
                        </HoverCard>

                        <HoverCard className="group premium-card border-none ring-1 ring-border shadow-sm mb-6">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    Discharge
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <form.Field
                                    name="departureTime"
                                    children={(field) => (
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium">Time of Departure from ED</Label>
                                            <Input
                                                type="time"
                                                className="bg-white dark:bg-black font-mono text-lg"
                                                value={field.state.value || ""}
                                                onChange={(e) => field.handleChange(e.target.value)}
                                            />
                                            <p className="text-xs text-muted-foreground">Used to calculate Total Time in Department</p>
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
                            {mode === "create" ? "Submit Complete Audit" : "Update Audit Record"}
                        </Button>
                    </AnimatedItem>
                </AnimatedContainer>
            </form>
        </div>
    );
}
