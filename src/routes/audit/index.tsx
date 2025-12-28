import { useNavigate, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { hashMRN } from "@/utils/hash-mrn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, differenceInHours, parseISO } from "date-fns";
import { CalendarIcon, ShieldCheck, Stethoscope, Search, Info, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { MotionDiv, AnimatedContainer, AnimatedItem, HoverCard } from "@/components/ui/motion";
import { getPatientHistoryFn } from "@/server/actions";
import { type AuditRecord } from "@/lib/schema";

export const Route = createFileRoute("/audit/")({
    component: AuditLanding,
});

function AuditLanding() {
    const navigate = useNavigate();
    const [mrn, setMrn] = useState("");
    const [arrivalDate, setArrivalDate] = useState<Date | undefined>(new Date());
    const [isLoading, setIsLoading] = useState(false);
    const [history, setHistory] = useState<Partial<AuditRecord>[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    // Initial check for history
    const checkHistory = async (token: string) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const records = await getPatientHistoryFn({ data: { token } } as any);
        if (records.length > 0) {
            setHistory(records);
            setShowHistory(true);
        } else {
            setShowHistory(false);
        }
    };

    const handleMrnBlur = async () => {
        if (!mrn) return;
        const token = await hashMRN(mrn);
        await checkHistory(token);
    };

    const handleStartNew = async () => {
        if (!mrn || !arrivalDate) return;
        const token = await hashMRN(mrn);

        // Multi-entry handling: Warning only
        const nearbyRecord = history.find(h => {
            if (!h.arrivalDate) return false;
            const diff = Math.abs(differenceInHours(new Date(arrivalDate), parseISO(h.arrivalDate)));
            return diff < 24;
        });

        if (nearbyRecord) {
            const confirmNew = window.confirm(
                `Notice: A presentation was found at ${format(parseISO(nearbyRecord.arrivalDate!), "HH:mm dd/MM")}.\n\n` +
                `Create a NEW audit record for this patient?`
            );
            if (!confirmNew) return;
        }

        setIsLoading(true);
        await navigate({
            to: "/audit/form",
            search: {
                token,
                arrival: arrivalDate.toISOString(),
            },
        });
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Header Added per Request */}
            <div className="absolute top-0 w-full p-6 flex justify-between items-center z-20 pointer-events-none">
                <div className="pointer-events-auto flex items-center gap-2 font-bold text-lg tracking-tight">
                    <div className="bg-brand-600 rounded-lg p-1.5 shadow-lg shadow-brand-500/20">
                        <ShieldCheck className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-foreground">Mental Health QIP</span>
                </div>
                <Button variant="ghost" className="pointer-events-auto text-muted-foreground hover:text-foreground" onClick={() => window.history.back()}>Back</Button>
            </div>

            {/* Background Decor */}
            <div className="absolute inset-0 grid-pattern opacity-30 pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500" />

            <AnimatedContainer className="max-w-xl w-full relative z-10 pt-10" delay={0.1}>
                <AnimatedItem className="flex flex-col justify-center items-start space-y-4 mb-6">
                    <div className="flex flex-col-1 gap-4 justify-center items-start">
                        <MotionDiv
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="bg-gradient-to-br from-blue-600 to-indigo-700 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-xl shadow-blue-500/30"
                        >
                            <Stethoscope className="text-white w-8 h-8" />
                        </MotionDiv>
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">
                                Start New Audit
                            </h1>
                            <p className="text-muted-foreground font-medium mt-1">
                                Enter patient details to link records
                            </p>
                        </div>
                    </div>
                </AnimatedItem>

                <AnimatedItem>
                    <HoverCard className="group premium-card border-t-0 !p-0 overflow-visible bg-card/80 backdrop-blur-sm relative transition-all">
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-blue-500 to-indigo-500 rounded-t-2xl" />

                        <CardHeader className="pt-8 pb-4 text-center">
                            <CardTitle>Patient Identification</CardTitle>
                            <CardDescription className="text-base text-muted-foreground">
                                MRNs are hashed. Previous history is looked up automatically.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="mrn" className="text-sm font-semibold text-foreground">Hospital MRN</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                                    <Input
                                        id="mrn"
                                        placeholder="Search or enter MRN..."
                                        value={mrn}
                                        onChange={(e) => setMrn(e.target.value)}
                                        onBlur={handleMrnBlur}
                                        className="pl-10 h-12 text-lg tracking-wide bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 focus:ring-2 ring-blue-500/20 transition-all font-mono"
                                    />
                                </div>
                            </div>

                            {/* History Alert */}
                            {showHistory && (
                                <MotionDiv
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50 rounded-lg p-3 space-y-2"
                                >
                                    <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-bold text-sm">
                                        <History className="w-4 h-4" />
                                        <span>Previous Presentations Found</span>
                                    </div>
                                    <div className="space-y-1">
                                        {history.slice(0, 3).map((rec, i) => (
                                            <div key={i} className="flex items-center justify-between text-xs bg-white dark:bg-black/20 p-2 rounded border border-orange-100 dark:border-orange-900/40">
                                                <span className="font-mono">
                                                    {rec.arrivalDate ? format(parseISO(rec.arrivalDate), "dd MMM HH:mm") : "N/A"}
                                                </span>
                                                <span className="text-muted-foreground">{rec.createdAt ? format(parseISO(rec.createdAt), "dd/MM") : ""}</span>
                                            </div>
                                        ))}
                                    </div>
                                </MotionDiv>
                            )}

                            <div className="space-y-2 flex flex-col">
                                <Label className="text-sm font-semibold text-foreground flex items-center justify-between">
                                    <span>Arrival Date & Time</span>
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">New Entry</span>
                                </Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant={"outline"}
                                            className={cn(
                                                "w-full h-12 pl-3 text-left font-normal border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all",
                                                !arrivalDate && "text-muted-foreground"
                                            )}
                                        >
                                            {arrivalDate ? (
                                                <span className="text-lg font-mono text-foreground tracking-tight">
                                                    {format(arrivalDate, "HH:mm")} <span className="text-sm text-muted-foreground font-sans ml-1 opacity-70">{format(arrivalDate, "PPP")}</span>
                                                </span>
                                            ) : (
                                                <span>Pick arrival time...</span>
                                            )}
                                            <CalendarIcon className="ml-auto h-5 w-5 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-xl overflow-hidden" align="start">
                                        <div className="bg-card border border-border rounded-xl">
                                            <Calendar
                                                mode="single"
                                                selected={arrivalDate}
                                                onSelect={setArrivalDate}
                                                disabled={(date) =>
                                                    date > new Date() || date < new Date("1900-01-01")
                                                }
                                                initialFocus
                                                className="p-3"
                                            />
                                            <div className="p-4 border-t border-border bg-muted/20 grid gap-2">
                                                <Label className="text-xs font-bold uppercase text-muted-foreground tracking-wider">Exact Arrival Time</Label>
                                                <Input
                                                    type="time"
                                                    className="h-10 text-lg font-mono bg-background"
                                                    defaultValue={arrivalDate ? format(arrivalDate, "HH:mm") : ""}
                                                    onChange={(e) => {
                                                        if (arrivalDate && e.target.value) {
                                                            const [h, m] = e.target.value.split(':').map(Number);
                                                            const newDate = new Date(arrivalDate);
                                                            newDate.setHours(h, m);
                                                            setArrivalDate(newDate);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <div className="flex gap-2 items-start mt-1 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs">
                                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                    <p>Please use exact <strong>EPR Arrival Time</strong>.</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 pb-6">
                            <Button
                                className="w-full h-14 text-base font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/20 rounded-xl transition-all hover:scale-[1.01]"
                                disabled={!mrn || isLoading}
                                onClick={handleStartNew}
                            >
                                Start Audit
                            </Button>
                        </CardFooter>
                    </HoverCard>
                </AnimatedItem>

                <AnimatedItem className="text-center">
                    <p className="text-xs mt-4 text-muted-foreground opacity-60">
                        Secure SHA-256 Hashing | No PII Stored | Built with <span className="font-bold">❤︎</span> by <span className="font-bold">Faz</span>
                    </p>
                </AnimatedItem>
            </AnimatedContainer>
        </div>
    );
}
