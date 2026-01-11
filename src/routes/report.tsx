
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAllAuditsFn } from "@/server/actions";
import { useMemo, useState, useEffect } from "react";
import { differenceInMinutes, format } from "date-fns";
import { parseAndSeedFromCsv } from "@/scripts/ingest-csv"; // Reuse existing CSV parser
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableRow,
} from "@/components/ui/table";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import {
    ArrowLeft,
    Download,
    RefreshCcw,
    AlertTriangle,
    CheckCircle2,
    Database,
    History,
    Activity
} from "lucide-react";
import {
    TimeRunChart,
    ObservationEvidenceChart,
    RiskAssessmentComponentsChart,
} from "@/components/chart-components";
import { cn } from "@/lib/utils";
import { RiskLevel, ObservationStatus } from "@/lib/schema";

export const Route = createFileRoute("/report")({
    component: ReportPage,
});

type DataSource = 'ALL' | 'LIVE' | 'HISTORICAL';

function ReportPage() {
    // 1. Fetch Live Data
    const { data: liveAudits, isLoading: isLoadingLive } = useQuery({
        queryKey: ["allAudits"],
        queryFn: () => getAllAuditsFn(),
    });

    // 2. Fetch Historical Data
    const { data: historicalAudits, isLoading: isLoadingHistory } = useQuery({
        queryKey: ["historicalAudits"],
        queryFn: () => parseAndSeedFromCsv('/Combined-data.csv'),
        staleTime: Infinity // Static file, never changes essentially
    });

    const [dataSource, setDataSource] = useState<DataSource>('ALL');

    // Local State for Outliers (Persisted in LocalStorage)
    const [excludedIds, setExcludedIds] = useState<string[]>([]);

    useEffect(() => {
        const stored = localStorage.getItem("report_excluded_ids");
        if (stored) {
            try {
                setExcludedIds(JSON.parse(stored));
            } catch (e) {
                console.error("Failed to parse excluded IDs", e);
            }
        }
    }, []);

    const handleToggleExclusion = (id: string) => {
        let newExcluded;
        if (excludedIds.includes(id)) {
            newExcluded = excludedIds.filter(x => x !== id);
        } else {
            newExcluded = [...excludedIds, id];
        }
        setExcludedIds(newExcluded);
        localStorage.setItem("report_excluded_ids", JSON.stringify(newExcluded));
    };

    const handleResetExclusions = () => {
        setExcludedIds([]);
        localStorage.removeItem("report_excluded_ids");
    };

    // 3. Merge & Filter Data based on Source and Exclusion
    const reportData = useMemo(() => {
        let combined: any[] = [];

        if (dataSource === 'ALL') {
            combined = [...(liveAudits || []), ...(historicalAudits || [])];
        } else if (dataSource === 'LIVE') {
            combined = liveAudits || [];
        } else {
            combined = historicalAudits || [];
        }

        // Filter outliers
        // Note: Historical CSV parsers might not imply IDs, but the script assigns them or uses token. 
        // The script in ingest-csv.ts does NOT assign 'id' if parsing raw, only 'patientToken'. 
        // Wait, the parser logic: return { patientToken... }. No ID.
        // I need to generate consistent IDs for historical data so exclusion works.
        // The parser output for historical data relies on 'reference' as token. I can use token as ID if unique?
        // Let's ensure the combined list has 'id'.

        return combined.map((r: any) => ({
            ...r,
            id: r.id || r.patientToken // Fallback to token for ID if missing (Historical)
        })).filter((a: any) => !excludedIds.includes(a.id));

    }, [liveAudits, historicalAudits, dataSource, excludedIds]);

    const excludedCount = excludedIds.length;
    const isLoading = isLoadingLive || isLoadingHistory;

    // --- Statistics Calculations (Reused Logic) ---
    const stats = useMemo(() => {
        const total = reportData.length;
        if (total === 0) return null;

        // Standard 1: Triage
        const triageData = reportData
            .filter((a: any) => a.triageTime && a.arrivalDate)
            .map((a: any) => {
                const diff = differenceInMinutes(new Date(a.triageTime), new Date(a.arrivalDate));
                return {
                    id: a.id,
                    token: a.patientToken,
                    minutes: diff < 0 ? 0 : diff,
                    compliant15: diff <= 15 && diff >= 0,
                    compliant30: diff <= 30 && diff >= 0
                };
            });

        const triageMedian = triageData.length > 0
            ? triageData.map(d => d.minutes).sort((a, b) => a - b)[Math.floor(triageData.length / 2)]
            : 0;

        const standard1_15m = Math.round((triageData.filter(d => d.compliant15).length / (triageData.length || 1)) * 100);
        const standard1_30m = Math.round((triageData.filter(d => d.compliant30).length / (triageData.length || 1)) * 100);

        // Timings & Journey
        const getMedian = (arr: number[]) => arr.length ? arr.sort((a, b) => a - b)[Math.floor(arr.length / 2)] : 0;

        const referralToReview = reportData
            .filter((a: any) => a.psychReferralTime && a.psychReviewTime)
            .map((a: any) => differenceInMinutes(new Date(a.psychReviewTime), new Date(a.psychReferralTime)))
            .filter((m: number) => m >= 0);

        const arrivalToDeparture = reportData
            .filter((a: any) => a.arrivalDate && a.departureTime)
            .map((a: any) => differenceInMinutes(new Date(a.departureTime), new Date(a.arrivalDate)))
            .filter((m: number) => m >= 0);

        const timings = {
            referralToReview: getMedian(referralToReview),
            totalTime: getMedian(arrivalToDeparture),
            referralToReviewCount: referralToReview.length,
            totalTimeCount: arrivalToDeparture.length
        };

        // Standard 2: Observation
        const riskPatients = reportData.filter((a: any) => a.riskLevel === RiskLevel.Medium || a.riskLevel === RiskLevel.High);
        const obsCompliantCount = riskPatients.filter((a: any) => a.observationLevelMet === ObservationStatus.Yes).length;
        const standard2 = riskPatients.length === 0 ? 0 : Math.round((obsCompliantCount / riskPatients.length) * 100);

        const obsData = [
            { name: "Good Evidence", value: obsCompliantCount },
            { name: "Partial/No Evidence", value: riskPatients.length - obsCompliantCount }
        ];

        // Standard 3: Risk Assessment (Brief)
        const clinicianSeen = reportData.filter((a: any) => a.clinicianSeen);
        const standard3 = clinicianSeen.length === 0 ? 0 : Math.round((clinicianSeen.filter((a: any) =>
            a.riskAssessmentType && a.riskAssessmentTrigger && a.riskAssessmentFuture && a.riskAssessmentHistory === "Adequate"
        ).length / clinicianSeen.length) * 100);

        // Detailed Breakdown for Std 3
        const assessmentData = [
            { name: "Type", value: clinicianSeen.length ? Math.round((clinicianSeen.filter((a: any) => a.riskAssessmentType).length / clinicianSeen.length) * 100) : 0, total: clinicianSeen.length },
            { name: "Trigger", value: clinicianSeen.length ? Math.round((clinicianSeen.filter((a: any) => a.riskAssessmentTrigger).length / clinicianSeen.length) * 100) : 0, total: clinicianSeen.length },
            { name: "Future Plans", value: clinicianSeen.length ? Math.round((clinicianSeen.filter((a: any) => a.riskAssessmentFuture).length / clinicianSeen.length) * 100) : 0, total: clinicianSeen.length },
            { name: "History", value: clinicianSeen.length ? Math.round((clinicianSeen.filter((a: any) => a.riskAssessmentHistory === "Adequate").length / clinicianSeen.length) * 100) : 0, total: clinicianSeen.length },
        ];

        const absconded = reportData.filter((a: any) => a.dischargePlanSafe === false).length;

        return {
            total,
            triagePoints: triageData.map((d, i) => ({ id: d.id, token: d.token, minutes: d.minutes, index: i + 1, compliant: d.compliant15 })),
            triageMedian,
            standard1_15m,
            standard1_30m,
            standard2,
            standard3,
            obsData,
            assessmentData,
            timings,
            abscondedRate: Math.round((absconded / total) * 100)
        };
    }, [reportData]);


    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCcw className="w-8 h-8 animate-spin text-brand-500" />
                    <p className="text-muted-foreground animate-pulse">Generating Report...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950">
            <header className="bg-background/80 backdrop-blur-md border-b sticky top-0 z-20 print:hidden">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link to="/dashboard">
                            <Button variant="ghost" size="sm" className="hover:bg-muted text-muted-foreground hover:text-foreground">
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Dashboard
                            </Button>
                        </Link>
                        <div className="h-6 w-px bg-border/50 mx-2" />
                        <div>
                            <h1 className="text-sm font-semibold tracking-tight">QIP Report</h1>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Mental Health (Self-Harm)</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">

                        {/* Source Toggle */}
                        <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/50 mr-4">
                            <Button
                                size="sm"
                                variant={dataSource === 'ALL' ? "secondary" : "ghost"}
                                className={cn("h-7 text-xs", dataSource === 'ALL' && "bg-white shadow-sm dark:bg-neutral-800")}
                                onClick={() => setDataSource('ALL')}
                            >
                                <Database className="w-3 h-3 mr-1.5" /> All
                            </Button>
                            <Button
                                size="sm"
                                variant={dataSource === 'HISTORICAL' ? "secondary" : "ghost"}
                                className={cn("h-7 text-xs", dataSource === 'HISTORICAL' && "bg-white shadow-sm dark:bg-neutral-800")}
                                onClick={() => setDataSource('HISTORICAL')}
                            >
                                <History className="w-3 h-3 mr-1.5" /> Historical
                            </Button>
                            <Button
                                size="sm"
                                variant={dataSource === 'LIVE' ? "secondary" : "ghost"}
                                className={cn("h-7 text-xs", dataSource === 'LIVE' && "bg-white shadow-sm dark:bg-neutral-800")}
                                onClick={() => setDataSource('LIVE')}
                            >
                                <Activity className="w-3 h-3 mr-1.5" /> Live
                            </Button>
                        </div>

                        {excludedCount > 0 && (
                            <Button variant="outline" size="sm" onClick={handleResetExclusions} className="text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:border-amber-800 dark:bg-amber-900/20 dark:hover:bg-amber-900/30">
                                <RefreshCcw className="w-3 h-3 mr-2" />
                                Reset ({excludedCount})
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => window.print()}>
                            <Download className="w-4 h-4 mr-2" />
                            Print
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto p-8 space-y-12 print:p-0 print:max-w-none">

                {/* Report Overview Card */}
                <div className="space-y-6">
                    <section className="space-y-4 border-b pb-8">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground max-w-3xl">
                            Mental Health (Self-Harm) Quality Improvement Programme: Initial Findings & Recommendations
                        </h1>
                        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
                            <div><span className="font-semibold text-foreground">Date:</span> {format(new Date(), "dd MMMM yyyy")}</div>
                            <div><span className="font-semibold text-foreground">Author:</span> Fazeen Nasser / Igho Mukoro</div>
                            <div>
                                <span className="font-semibold text-foreground">Data Source:</span>
                                <span className="ml-1 px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 border border-brand-200 text-xs font-medium dark:bg-brand-900/20 dark:text-brand-300 dark:border-brand-800">
                                    {dataSource} (n={stats?.total || 0})
                                </span>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Navigation Tabs */}
                <Tabs defaultValue="executive" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 max-w-md mb-8 print:hidden">
                        <TabsTrigger value="executive">Executive Summary</TabsTrigger>
                        <TabsTrigger value="analysis">Detailed Analysis</TabsTrigger>
                        <TabsTrigger value="data">Action Plan</TabsTrigger>
                    </TabsList>

                    {/* == TAB 1: EXECUTIVE SUMMARY == */}
                    <TabsContent value="executive" className="space-y-8 animate-in fade-in-50">
                        <div className="grid md:grid-cols-2 gap-8">
                            <Card className="border-emerald-100 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-900">
                                <CardHeader>
                                    <CardTitle className="text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5" /> Key Achievements
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="list-disc pl-5 space-y-2 text-sm text-emerald-900 dark:text-emerald-200">
                                        <li>The ED consistently performs comprehensive physical health assessments for patients presenting with self-harm.</li>
                                        <li>Documentation of compassionate care, such as offering food and drink, is generally good.</li>
                                        <li>Risk stratification is recorded in {Math.round((reportData.filter((a: any) => a.riskLevel).length / (reportData.length || 1)) * 100)}% of cases.</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card className="border-amber-100 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-900">
                                <CardHeader>
                                    <CardTitle className="text-amber-800 dark:text-amber-400 flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5" /> Key Areas for Improvement
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="list-disc pl-5 space-y-2 text-sm text-amber-900 dark:text-amber-200">
                                        <li><strong>Timeliness:</strong> Only {stats?.standard1_15m}% of patients receive triage within 15 minutes (Target: 100%).</li>
                                        <li><strong>Risk Assessment:</strong> Complete documentation of all 4 key risk components is at {stats?.standard3}%.</li>
                                        <li><strong>Observation:</strong> Only {stats?.standard2}% of medium/high risk patients have 'Good' evidence of ongoing observation.</li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="prose prose-neutral dark:prose-invert max-w-none">
                            <h3>Introduction</h3>
                            <p>
                                This Quality Improvement Programme (QIP) aims to monitor and improve the quality of care for patients presenting to the Emergency Department (ED) following self-harm.
                                The programme tracks our performance against national clinical standards set by RCEM, NICE, and the Royal College of Psychiatrists.
                            </p>
                            <h3>Methodology</h3>
                            <p>
                                Data was collected for a randomized sample of {stats?.total} patient attendances.
                                All included patients were aged 18 or over, presented with intentional self-harm, and were referred for an emergency mental health assessment.
                            </p>
                        </div>
                    </TabsContent>

                    {/* == TAB 2: DETAILED ANALYSIS == */}
                    <TabsContent value="analysis" className="space-y-12 animate-in fade-in-50">

                        {/* Standard 1 */}
                        <section className="break-inside-avoid">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold tracking-tight">Standard 1: Timely Mental Health Triage</h2>
                                <div className="text-sm text-muted-foreground">Target: 15 mins</div>
                            </div>

                            <div className="grid lg:grid-cols-4 gap-8">
                                {/* Stats Cards */}
                                <div className="lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-4">
                                    <Card className="bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900">
                                        <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Within 15 mins</CardTitle></CardHeader>
                                        <CardContent><div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{stats?.standard1_15m}%</div></CardContent>
                                    </Card>
                                    <Card className="bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900">
                                        <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Within 30 mins</CardTitle></CardHeader>
                                        <CardContent><div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{stats?.standard1_30m}%</div></CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Median Triage</CardTitle></CardHeader>
                                        <CardContent><div className="text-2xl font-bold">{stats?.triageMedian} <span className="text-sm font-normal text-muted-foreground">min</span></div></CardContent>
                                    </Card>
                                </div>

                                {/* Main Chart */}
                                <div className="lg:col-span-3 h-[400px]">
                                    <TimeRunChart data={stats?.triagePoints || []} />
                                </div>
                            </div>

                            {/* Outlier Management (Collapsible) */}
                            <div className="mt-4">
                                <Card className="bg-muted/20 border-dashed">
                                    <CardHeader className="pb-2 py-3 cursor-pointer" onClick={() => { }}>
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                <Activity className="w-4 h-4" />
                                                Data Quality: Outlier Management
                                            </CardTitle>
                                            <span className="text-[10px] text-muted-foreground">
                                                {excludedCount} excluded
                                            </span>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="py-0">
                                        <Table>
                                            <TableBody>
                                                {stats?.triagePoints.sort((a, b) => b.minutes - a.minutes).slice(0, 5).map((pt) => (
                                                    <TableRow key={pt.id} className="h-8 border-b-0 hover:bg-muted/50">
                                                        <TableCell className="py-1 text-xs font-mono text-muted-foreground">ID: {pt.token?.substring(0, 8)}</TableCell>
                                                        <TableCell className="py-1 text-xs font-medium text-right">{pt.minutes}m</TableCell>
                                                        <TableCell className="py-1 text-right w-[100px]">
                                                            <Button variant="ghost" size="sm" onClick={() => handleToggleExclusion(pt.id)} className="h-6 px-2 text-[10px] text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20">
                                                                Exclude
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        </section>

                        {/* Patient Journey Section - REMOVED */}
                        
                        <div className="grid md:grid-cols-2 gap-8 break-inside-avoid">
                            {/* Standard 2 */}
                            <section>
                                <h2 className="text-xl font-bold tracking-tight mb-4">Standard 2: Observation</h2>
                                <Card className="h-full">
                                    <CardContent className="pt-6">
                                        <div className="h-[300px]">
                                            <ObservationEvidenceChart data={stats?.obsData || []} />
                                        </div>
                                        <div className="mt-6 text-center">
                                            <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                                                Only <span className="font-bold text-foreground">{stats?.standard2}%</span> of At-Risk patients had 'Good' evidence of checks.
                                                This is a significant clinical governance risk.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </section>

                            {/* Standard 3 */}
                            <section>
                                <h2 className="text-xl font-bold tracking-tight mb-4">Standard 3: Risk Assessment</h2>
                                <Card className="h-full">
                                    <CardContent className="pt-6">
                                        <div className="h-[300px]">
                                            <RiskAssessmentComponentsChart data={stats?.assessmentData || []} />
                                        </div>
                                        <div className="mt-6 space-y-2">
                                            <div className="flex justify-between text-sm items-center border-b pb-1">
                                                <span className="text-muted-foreground">Composite Standard Met</span>
                                                <span className="font-bold">{stats?.standard3}%</span>
                                            </div>
                                            <p className="text-xs text-muted-foreground pt-2">
                                                Most commonly missed components: <strong>Reason/Trigger</strong> and <strong>Future Plans</strong>.
                                            </p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </section>
                        </div>
                    </TabsContent>

                    {/* == TAB 3: ACTION PLAN == */}
                    <TabsContent value="data" className="space-y-6 animate-in fade-in-50">
                        <h2 className="text-2xl font-bold tracking-tight">Recommendations & Next Steps</h2>

                        <div className="grid gap-6">
                            <Card>
                                <CardHeader><CardTitle>1. Address Triage Delays</CardTitle></CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">The "Front Door" Delay represents the most significant bottleneck.</p>
                                    <div className="bg-muted p-4 rounded-md text-sm">
                                        <strong>Action:</strong> Form a multi-disciplinary working group to map the patient pathway.<br />
                                        <strong>Target:</strong> Reduce median time to MH triage to &lt;30 mins within 3 months.
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>2. Improve Documentation</CardTitle></CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">Inconsistent documentation makes it difficult to defend care provided.</p>
                                    <div className="bg-muted p-4 rounded-md text-sm">
                                        <strong>Action:</strong> Develop and embed a mandatory "Self-Harm Risk Assessment" template.<br />
                                        <strong>Target:</strong> Achieve 80% completion rate for all 4 components.
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader><CardTitle>3. System Integration</CardTitle></CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">Parallel assessment barriers are systemic.</p>
                                    <div className="bg-muted p-4 rounded-md text-sm">
                                        <strong>Action:</strong> Explore new pathway for immediate liaison notification.<br />
                                        <strong>Target:</strong> Increase parallel assessment to 70% within 6 months.
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
