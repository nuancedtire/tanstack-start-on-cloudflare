import { useNavigate, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { hashMRN } from "@/utils/hash-mrn";
import { encryptWithPin } from "@/utils/encryption";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, differenceInHours, parseISO } from "date-fns";
import { CalendarIcon, Search, Info, History } from "lucide-react";
import { MotionDiv, AnimatedContainer, AnimatedItem, HoverCard } from "@/components/ui/motion";
import { getPatientHistoryFn } from "@/server/actions";
import { type AuditRecord } from "@/lib/schema";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/audit/")({
    component: AuditLanding,
});

function AuditLanding() {
    const navigate = useNavigate();
    const [mrn, setMrn] = useState("");
    const [arrivalDate, setArrivalDate] = useState<Date | undefined>(new Date());
    const [arrivalDateText, setArrivalDateText] = useState(format(new Date(), "dd/MM/yyyy"));
    const [arrivalCalendarMonth, setArrivalCalendarMonth] = useState<Date>(new Date());
    const [isLoading, setIsLoading] = useState(false);

    const maskDate = (value: string) => {
        const v = value.replace(/\D/g, '').slice(0, 8);
        if (v.length >= 5) {
            return `${v.slice(0, 2)}/${v.slice(2, 4)}/${v.slice(4)}`;
        } else if (v.length >= 3) {
            return `${v.slice(0, 2)}/${v.slice(2)}`;
        }
        return v;
    };
    const [history, setHistory] = useState<Partial<AuditRecord>[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    // Initial check for history
    const checkHistory = async (token: string) => {
        const records = await getPatientHistoryFn({ data: { token } });
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
        const encrypted = await encryptWithPin(mrn, "0000");

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
                encrypted,
                arrival: arrivalDate.toISOString(),
            },
        });
        setIsLoading(false);
    };


    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Header Added per Request */}
            <div className="absolute top-0 w-full p-6 flex justify-between items-center z-20 pointer-events-none">
                <MotionDiv
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3"
                >
                    <Link to="/">
                        <h1 className="text-xl font-bold tracking-tight text-foreground">Mental Health QIP</h1>
                    </Link>
                </MotionDiv>
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
                            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-500/30"
                        >
                            <img src="/logo512.png" alt="Logo" className="h-16 w-16 rounded-lg" />
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
                                        data-testid="mrn-input"
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

                            <div className="space-y-4 flex flex-col pt-2">
                                <Label className="text-sm font-semibold text-foreground flex items-center justify-between">
                                    <span>Arrival Date & Time</span>
                                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">Required</span>
                                </Label>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="space-y-1.5 flex-1">
                                        <Label className="text-[10px] uppercase text-muted-foreground ml-1">Arrival Date (DD/MM/YYYY)</Label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Input
                                                    type="text"
                                                    placeholder="DD/MM/YYYY"
                                                    className="h-12 text-lg font-mono bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 focus:ring-2 ring-blue-500/20 transition-all"
                                                    value={arrivalDateText}
                                                    onChange={(e) => {
                                                        const masked = maskDate(e.target.value);
                                                        setArrivalDateText(masked);
                                                        if (masked.length === 10) {
                                                            const parts = masked.split("/");
                                                            if (parts.length === 3) {
                                                                const d = parseInt(parts[0]);
                                                                const m = parseInt(parts[1]) - 1;
                                                                const y = parseInt(parts[2]);
                                                                const current = arrivalDate || new Date();
                                                                const newDate = new Date(y, m, d, current.getHours(), current.getMinutes());
                                                                if (!isNaN(newDate.getTime())) {
                                                                    setArrivalDate(newDate);
                                                                    setArrivalCalendarMonth(newDate);
                                                                }
                                                            }
                                                        }
                                                    }}
                                                />
                                            </div>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="outline" size="icon" className="h-12 w-12 shrink-0 bg-neutral-50 dark:bg-neutral-900" onClick={() => {
                                                        if (arrivalDate) setArrivalCalendarMonth(arrivalDate);
                                                    }}>
                                                        <CalendarIcon className="h-5 w-5 opacity-60" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0 border-none shadow-2xl rounded-xl" align="end">
                                                    <Calendar
                                                        mode="single"
                                                        selected={arrivalDate}
                                                        month={arrivalCalendarMonth}
                                                        onMonthChange={setArrivalCalendarMonth}
                                                        onSelect={(date) => {
                                                            if (date) {
                                                                const current = arrivalDate || new Date();
                                                                date.setHours(current.getHours(), current.getMinutes());
                                                                setArrivalDate(date);
                                                                setArrivalDateText(format(date, "dd/MM/yyyy"));
                                                                setArrivalCalendarMonth(date);
                                                            }
                                                        }}
                                                        captionLayout="dropdown"
                                                        disabled={(date) => date > new Date()}
                                                        initialFocus
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 flex-1">
                                        <Label className="text-[10px] uppercase text-muted-foreground ml-1">Arrival Time</Label>
                                        <Input
                                            type="time"
                                            className="h-12 text-lg font-mono bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 focus:ring-2 ring-blue-500/20 transition-all font-mono"
                                            value={arrivalDate ? format(arrivalDate, "HH:mm") : ""}
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

                                <div className="flex gap-2 items-start p-2.5 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 text-xs border border-blue-100/50 dark:border-blue-900/20">
                                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                                    <p>Enter the <strong>Official Arrival Time</strong> from EPR/Symphony to ensure audit accuracy.</p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="pt-4 pb-6">
                            <Button
                                className="w-full h-14 text-base font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-lg shadow-brand-500/20 rounded-xl transition-all hover:scale-[1.01]"
                                disabled={!mrn || isLoading}
                                onClick={handleStartNew}
                                data-testid="start-audit-button"
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
