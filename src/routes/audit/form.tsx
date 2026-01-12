import { useNavigate, useSearch, createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    CalendarClock,
    Stethoscope,
} from "lucide-react";

import { AuditForm } from "@/components/audit-form";

const auditSearchSchema = z.object({
    token: z.string(),
    arrival: z.string(),
    encrypted: z.string().optional(),
});

export const Route = createFileRoute("/audit/form")({
    validateSearch: auditSearchSchema,
    component: CombinedAuditForm,
});

function CombinedAuditForm() {
    const { token, arrival, encrypted } = useSearch({ from: "/audit/form" });
    const navigate = useNavigate();
    const arrivalDate = new Date(arrival);

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-neutral-950 pb-20">
            {/* Header */}
            <header className="bg-brand-600/90 backdrop-blur-md text-white border-b border-white/10 sticky top-0 z-30 shadow-xl shadow-brand-900/10">
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
                <AuditForm
                    token={token}
                    encryptedToken={encrypted}
                    arrival={arrival}
                    onSuccess={() => navigate({ to: "/dashboard" })}
                    mode="create"
                />
            </main>
        </div>
    );
}
