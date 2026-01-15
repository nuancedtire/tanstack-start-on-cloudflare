
import { createFileRoute, Link } from "@tanstack/react-router";
import { type AuditRecord } from "@/lib/schema";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { getAllAuditsFn, resetAndSeedFn, deleteAuditFn } from "@/server/actions";
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
import { ArrowLeft, Loader2, Eye, Search, Trash2, AlertTriangle, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AnimatedContainer, AnimatedItem, HoverCard } from "@/components/ui/motion";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { useState } from "react";
import { hashMRN } from "@/utils/hash-mrn";
import { decryptWithPin } from "@/utils/encryption";
import { PinProtection } from "@/components/pin-protection";
import { AuditSummary } from "@/components/audit-summary";

export const Route = createFileRoute("/data")({
    component: DataView,
});

function DataView() {
    const queryClient = useQueryClient();
    const { data: audits, isLoading } = useQuery({
        queryKey: ["allAudits"],
        queryFn: () => getAllAuditsFn(),
    });

    const [showPin, setShowPin] = useState(false);
    const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
    const [pinTitle, setPinTitle] = useState("");
    const [pinDesc, setPinDesc] = useState("");

    const handleProtectedAction = (action: () => void, title: string, desc: string) => {
        setPendingAction(() => action);
        setPinTitle(title);
        setPinDesc(desc);
        setShowPin(true);
    };

    const [unlockedMrns, setUnlockedMrns] = useState<Record<string, string>>({});

    const handleUnlock = (id: string, encrypted: string) => {
        handleProtectedAction(async () => {
            try {
                // Hardcoded PIN matches the one in PinProtection component for now
                const decrypted = await decryptWithPin(encrypted, "5555");
                setUnlockedMrns(prev => ({ ...prev, [id]: decrypted }));
            } catch (e) {
                console.error(e);
                alert("Failed to decrypt. Data might be corrupted.");
            }
        }, "Unlock MRN", "Enter PIN to decrypt Patient ID.");
    };

    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteAuditFn({ data: { id } }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["allAudits"] });
            setSelectedAudit(null); // Close modal if open
            setDeleteId(null); // Close delete confirmation
        },
    });

    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    const handleClearClick = () => {
        handleProtectedAction(() => setShowClearConfirm(true), "Admin Access", "Enter PIN to clear database.");
    };

    const handleDeleteClick = (id: string) => {
        handleProtectedAction(() => setDeleteId(id), "Admin Access", "Enter PIN to delete record.");
    };

    const confirmClear = async () => {
        setShowClearConfirm(false);
        try {
            // Send empty records to just reset/clear the DB
            await resetAndSeedFn({ data: { records: [] } });
            await queryClient.invalidateQueries({ queryKey: ["allAudits"] });
            alert(`Successfully cleared all data.`);
        } catch (e) {
            console.error(e);
            alert("Failed to clear data. Check console.");
        }
    };

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
        if (!filterMrn) return true;
        // Match exact hash OR partial match on raw token string (useful for testing or if searching by known hash)
        return (a.patientToken === filterHash) || (a.patientToken.toLowerCase().includes(filterMrn.toLowerCase()));
    });

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950 w-full">
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
                    <Button variant="outline" size="sm" onClick={handleClearClick} className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200">
                        <Lock className="w-3 h-3 mr-1" />
                        Clear All Data
                    </Button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-6 space-y-6">

                {/* Search Bar */}
                <div className="max-w-md relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by full MRN..."
                        className="pl-9 bg-background"
                        value={filterMrn}
                        onChange={(e) => handleSearchChange(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 ml-1">
                        * Exact MRN match required for security (Hashing).
                    </p>
                </div>

                <AnimatedContainer>
                    <AnimatedItem>
                        <HoverCard className="premium-card !p-0 overflow-hidden border-border/50 shadow-sm bg-card">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50 hover:bg-muted/50 border-b border-border/50">
                                        <TableHead className="w-[120px] pl-6 font-semibold py-4">ID (Hash)</TableHead>
                                        <TableHead className="font-semibold py-4">Creation Time</TableHead>
                                        <TableHead className="font-semibold py-4">Risk Level</TableHead>
                                        <TableHead className="font-semibold py-4">Triage</TableHead>
                                        <TableHead className="font-semibold py-4">Clinical</TableHead>
                                        <TableHead className="text-right pr-6 font-semibold py-4">Actions</TableHead>
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
                                                <TableRow key={audit.id || i} className="hover:bg-muted/30 border-b border-border/50 transition-colors h-16 group">
                                                    <TableCell className="pl-6 font-mono text-xs text-muted-foreground">
                                                        {unlockedMrns[audit.id!] ? (
                                                            <span className="text-emerald-600 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded border border-emerald-200 dark:border-emerald-800">
                                                                {unlockedMrns[audit.id!]}
                                                            </span>
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <span>{audit.patientToken.substring(0, 8)}...</span>
                                                                {/* @ts-ignore - Schema update might strictly require rebuild for types */}
                                                                {audit.patientTokenEncrypted && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            // @ts-ignore
                                                                            if (audit.id) handleUnlock(audit.id, audit.patientTokenEncrypted);
                                                                        }}
                                                                    >
                                                                        <Lock className="w-3 h-3" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        )}
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
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (audit.id) handleDeleteClick(audit.id);
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4 mr-1" /> Delete
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

            {/* PIN Protection Modal */}
            <PinProtection
                open={showPin}
                onOpenChange={setShowPin}
                onSuccess={() => {
                    if (pendingAction) pendingAction();
                    setPendingAction(null);
                }}
                title={pinTitle}
                description={pinDesc}
            />

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
                        <div className="mt-4">
                            <AuditSummary values={selectedAudit} arrival={selectedAudit.arrivalDate} />
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Modal */}
            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this audit record? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Custom Alert Dialog for Clear */}
            <Dialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Confirm Data Clearance
                        </DialogTitle>
                        <DialogDescription className="py-2">
                            This action will <span className="font-bold text-foreground">permanently delete all existing audits</span>.
                            <br />
                            The database will be empty after this action.
                            <br /><br />
                            Are you sure you want to proceed?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setShowClearConfirm(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmClear}>
                            Yes, Clear Data
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function CheckCircle({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>
}
