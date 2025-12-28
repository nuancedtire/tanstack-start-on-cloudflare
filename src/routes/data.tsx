
import { createFileRoute, Link } from "@tanstack/react-router";
import { type AuditRecord } from "@/lib/schema";
import { useQuery } from "@tanstack/react-query";
import { getAllAuditsFn } from "@/server/actions";
import { format } from "date-fns";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Eye, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AnimatedContainer, AnimatedItem, HoverCard } from "@/components/ui/motion";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { hashMRN } from "@/utils/hash-mrn";

export const Route = createFileRoute("/data")({
    component: DataView,
});

function DataView() {
    const { data: audits, isLoading } = useQuery({
        queryKey: ["allAudits"],
        queryFn: () => getAllAuditsFn(),
    });

    const [filterMrn, setFilterMrn] = useState("");
    const [selectedAudit, setSelectedAudit] = useState<AuditRecord | null>(null);

    // This is client-side filtering for the demo. 
    // In production, we'd hash the input and send to server if the list is huge.
    // But since we have the list, we can filter locally.
    // Note: The list contains Hashes. We need to hash the input filter to match.
    // However, hashMRN is async. 
    // Simpler approach: Just string match if the user pastes a hash, OR we build a small effect.
    // The user wants "MRN based patient search". They will type "123". We need to match Hash("123").
    const [filterHash, setFilterHash] = useState("");

    const handleSearchChange = async (val: string) => {
        setFilterMrn(val);
        if (val.trim()) {
            const hash = await hashMRN(val);
            setFilterHash(hash);
        } else {
            setFilterHash("");
        }
    };

    const filteredAudits = audits?.filter((a: AuditRecord) => {
        if (!filterHash) return true;
        return a.patientToken === filterHash;
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50/50 dark:bg-black w-full">
            {/* Header */}
            <header className="bg-background/80 backdrop-blur-md border-b sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard">
                            <Button variant="ghost" size="sm" className="hover:bg-muted text-muted-foreground hover:text-foreground">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back
                            </Button>
                        </Link>
                        <h1 className="text-xl font-bold tracking-tight text-foreground">Audit Records</h1>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6 space-y-6">

                {/* Search Bar */}
                <div className="max-w-md relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Filter by MRN..."
                        className="pl-9 bg-background"
                        value={filterMrn}
                        onChange={(e) => handleSearchChange(e.target.value)}
                    />
                </div>

                <AnimatedContainer>
                    <AnimatedItem>
                        <HoverCard className="premium-card !p-0 overflow-hidden border-border/50 shadow-sm bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
                                        <TableHead className="w-[120px] pl-6 font-semibold">ID (Hash)</TableHead>
                                        <TableHead className="font-semibold">Creation Time</TableHead>
                                        <TableHead className="font-semibold">Risk Level</TableHead>
                                        <TableHead className="font-semibold">Triage</TableHead>
                                        <TableHead className="font-semibold">Clinical</TableHead>
                                        <TableHead className="text-right pr-6 font-semibold">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {!filteredAudits || filteredAudits.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                                No records found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredAudits.map((audit: AuditRecord, i: number) => {
                                            const date = new Date(audit.createdAt);
                                            return (
                                                <TableRow key={audit.id || i} className="hover:bg-muted/30 border-b border-border/50 transition-colors">
                                                    <TableCell className="pl-6 font-mono text-xs text-muted-foreground">
                                                        {audit.patientToken.substring(0, 8)}...
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground text-sm">
                                                        {format(date, "MMM dd, HH:mm")}
                                                    </TableCell>
                                                    <TableCell>
                                                        {audit.riskLevel ? (
                                                            <Badge variant="secondary" className={cn(
                                                                "font-medium border",
                                                                audit.riskLevel === "High" ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400" :
                                                                    audit.riskLevel === "Medium" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400" :
                                                                        "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400"
                                                            )}>
                                                                {audit.riskLevel}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground/30 text-xs">-</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {audit.triagePerformed ?
                                                            <CheckCircle className="w-4 h-4 text-emerald-500" /> :
                                                            <span className="text-muted-foreground">-</span>
                                                        }
                                                    </TableCell>
                                                    <TableCell>
                                                        {audit.triagePerformed ?
                                                            <span className="text-xs font-mono">{audit.riskAssessmentHistory}</span> :
                                                            <span className="text-muted-foreground">-</span>
                                                        }
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <Button variant="ghost" size="sm" onClick={() => setSelectedAudit(audit)}>
                                                            <Eye className="w-4 h-4 mr-1" /> View
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </HoverCard>
                    </AnimatedItem>
                </AnimatedContainer>
            </main>

            {/* Details Modal */}
            <Dialog open={!!selectedAudit} onOpenChange={(open) => !open && setSelectedAudit(null)}>
                <DialogContent className="!max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Audit Details</DialogTitle>
                        <DialogDescription>
                            SHA-256: {selectedAudit?.patientToken}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedAudit && (
                        <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                            <div className="space-y-1">
                                <h4 className="font-semibold text-muted-foreground">Arrival</h4>
                                <p className="font-mono bg-muted p-1 rounded">{format(new Date(selectedAudit.arrivalDate), "yyyy-MM-dd HH:mm")}</p>
                            </div>
                            <div className="space-y-1">
                                <h4 className="font-semibold text-muted-foreground">Triage Time</h4>
                                <p className="font-mono bg-muted p-1 rounded">{selectedAudit.triageTime ? format(new Date(selectedAudit.triageTime), "HH:mm") : "N/A"}</p>
                            </div>
                            <div className="col-span-2 border-t pt-4 mt-2">
                                <h4 className="font-semibold mb-2">Clinical Assessment</h4>
                                <ul className="grid grid-cols-2 gap-2">
                                    <li className="flex justify-between border-b pb-1">
                                        <span>Risk Level</span>
                                        <span className="font-medium">{selectedAudit.riskLevel}</span>
                                    </li>
                                    <li className="flex justify-between border-b pb-1">
                                        <span>Self-Harm Type</span>
                                        <span className="font-medium">{selectedAudit.riskAssessmentType ? "Yes" : "No"}</span>
                                    </li>
                                    <li className="flex justify-between border-b pb-1">
                                        <span>Safeguarding</span>
                                        <span className="font-medium">{selectedAudit.safeguardingCheck ? "Yes" : "No"}</span>
                                    </li>
                                    <li className="flex justify-between border-b pb-1">
                                        <span>Discharge Plan</span>
                                        <span className="font-medium">{selectedAudit.dischargePlanSafe ? "Yes" : "No"}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function CheckCircle({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
}
