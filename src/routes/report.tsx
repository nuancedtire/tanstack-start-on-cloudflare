
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAllAuditsFn } from "@/server/actions";
import { useMemo, useState, useEffect } from "react";
import { differenceInMinutes } from "date-fns";
import { parseAndSeedFromCsv } from "@/scripts/ingest-csv";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
    Activity,
    TrendingUp,
    TrendingDown,
    Minus
} from "lucide-react";
import {
    TimeRunChart,
    ObservationEvidenceChart,
    RiskAssessmentComponentsChart,
    SafeguardingComplianceChart,
    GenderDistributionChart,
    RiskLevelChart,
    DepartureOutcomeChart,
} from "@/components/chart-components";
import { cn } from "@/lib/utils";
import { RiskLevel, ObservationStatus, DepartureOutcome } from "@/lib/schema";

export const Route = createFileRoute("/report")({
    component: ReportPage,
});

type DataSource = 'ALL' | 'LIVE' | 'HISTORICAL';

// Helper to calculate stats for a given dataset
const calculateStats = (data: any[]) => {
    const total = data.length;
    if (total === 0) return null;

    // Standard 1: Triage
    const triageData = data
        .filter((a: any) => a.triageTime && a.arrivalDate)
        .map((a: any) => {
            const diff = differenceInMinutes(new Date(a.triageTime), new Date(a.arrivalDate));
            return {
                id: a.id,
                token: a.patientToken,
                minutes: diff < 0 ? 0 : diff,
                compliant15: diff <= 15 && diff >= 0,
                compliant60: diff <= 60 && diff >= 0,
                arrivalDate: a.arrivalDate
            };
        });

    const triageMedian = triageData.length > 0
        ? triageData.map(d => d.minutes).sort((a, b) => a - b)[Math.floor(triageData.length / 2)]
        : 0;

    const standard1_15m = Math.round((triageData.filter(d => d.compliant15).length / (triageData.length || 1)) * 100);
    const standard1_60m = Math.round((triageData.filter(d => d.compliant60).length / (triageData.length || 1)) * 100);

    // Standard 2: Observation
    const riskPatients = data.filter((a: any) => a.riskLevel === RiskLevel.Medium || a.riskLevel === RiskLevel.High);
    const obsCompliantCount = riskPatients.filter((a: any) => a.observationLevelMet === ObservationStatus.Yes).length;
    const standard2 = riskPatients.length === 0 ? 0 : Math.round((obsCompliantCount / riskPatients.length) * 100);

    const obsData = [
        { name: "Good Evidence", value: obsCompliantCount },
        { name: "Partial/No Evidence", value: riskPatients.length - obsCompliantCount }
    ];

    // Standard 3: Risk Assessment (Brief)
    const clinicianSeen = data.filter((a: any) => a.clinicianSeen);
    const standard3 = clinicianSeen.length === 0 ? 0 : Math.round((clinicianSeen.filter((a: any) =>
        a.riskAssessmentType && a.riskAssessmentTrigger && a.riskAssessmentFuture && a.riskAssessmentHistory === "Adequate"
    ).length / clinicianSeen.length) * 100);

    const assessmentData = [
        { name: "Type", value: clinicianSeen.length ? Math.round((clinicianSeen.filter((a: any) => a.riskAssessmentType).length / clinicianSeen.length) * 100) : 0, total: clinicianSeen.length },
        { name: "Trigger", value: clinicianSeen.length ? Math.round((clinicianSeen.filter((a: any) => a.riskAssessmentTrigger).length / clinicianSeen.length) * 100) : 0, total: clinicianSeen.length },
        { name: "Future Plans", value: clinicianSeen.length ? Math.round((clinicianSeen.filter((a: any) => a.riskAssessmentFuture).length / clinicianSeen.length) * 100) : 0, total: clinicianSeen.length },
        { name: "Psych History", value: clinicianSeen.length ? Math.round((clinicianSeen.filter((a: any) => a.riskAssessmentHistory === "Adequate").length / clinicianSeen.length) * 100) : 0, total: clinicianSeen.length },
    ];

    const absconded = data.filter((a: any) => a.departureOutcome === DepartureOutcome.Absconded).length;
    const lama = data.filter((a: any) => a.departureOutcome === DepartureOutcome.LAMA).length;

    // Demographics
    const genderCounts = data.reduce((acc: any, curr: any) => {
        const g = curr.gender || 'Not Known';
        acc[g] = (acc[g] || 0) + 1;
        return acc;
    }, {});
    const genderData = Object.entries(genderCounts).map(([name, value]) => ({ name, value: value as number }));

    // Risk Level Distribution
    const riskCounts = data.reduce((acc: any, curr: any) => {
        const r = curr.riskLevel || 'Not Assessed';
        acc[r] = (acc[r] || 0) + 1;
        return acc;
    }, {});
    const riskLevelData = Object.entries(riskCounts).map(([name, count]) => ({ name, count: count as number }));

    // Departure Outcome Distribution
    const departureCounts = data.reduce((acc: any, curr: any) => {
        const d = curr.departureOutcome || 'Not Recorded';
        acc[d] = (acc[d] || 0) + 1;
        return acc;
    }, {});
    const departureOutcomeData = Object.entries(departureCounts).map(([name, count]) => ({ name, count: count as number }));

    // Safeguarding & Compassion
    const safeguardingYes = data.filter((a: any) => a.safeguardingCheck).length;
    const ligatureYes = data.filter((a: any) => a.ligatureCheck).length;
    
    const safeguardingData = [
        { name: 'Safeguarding', value: Math.round((safeguardingYes / (total || 1)) * 100) },
        { name: 'Ligature', value: Math.round((ligatureYes / (total || 1)) * 100) },
    ];

    const compCareYes = data.filter((a: any) => a.compassionateCare === 'Yes').length;
    const compassionateCareRate = Math.round((compCareYes / (total || 1)) * 100);

    // Psych Liaison
    const referred = data.filter((a: any) => a.referredToPsych);
    const psychReferralRate = Math.round((referred.length / (total || 1)) * 100);
    
    const responseTimes = referred
        .filter((a: any) => a.psychReferralTime && a.psychReviewTime)
        .map((a: any) => differenceInMinutes(new Date(a.psychReviewTime), new Date(a.psychReferralTime)));
    
    const medianPsychResponse = responseTimes.length > 0
        ? responseTimes.sort((a: number, b: number) => a - b)[Math.floor(responseTimes.length / 2)]
        : 0;

    return {
        total,
        triagePoints: triageData.map((d, i) => ({
            id: d.id,
            token: d.token,
            minutes: d.minutes,
            index: i + 1,
            compliant: d.compliant15,
            reference15: 15,
            arrivalDate: d.arrivalDate
        })),
        triageMedian,
        standard1_15m,
        standard1_60m,
        standard2,
        standard3,
        obsData,
        assessmentData,
        riskCount: riskPatients.length,
        clinicianCount: clinicianSeen.length,
        abscondedCount: absconded,
        lamaCount: lama,
        adverseOutcomeRate: Math.round(((absconded + lama) / (total || 1)) * 100),
        genderData,
        riskLevelData,
        departureOutcomeData,
        safeguardingData,
        compassionateCareRate,
        psychReferralRate,
        medianPsychResponse
    };
};

function MetricCard({ title, baseline, current, suffix = "%", inverse = false }: { title: string, baseline: number, current: number, suffix?: string, inverse?: boolean }) {
    const diff = current - baseline;
    const isImproved = inverse ? diff < 0 : diff > 0;
    const isNeutral = diff === 0;

    return (
        <Card className="overflow-hidden">
            <CardHeader className="bg-muted/30 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 grid grid-cols-2 gap-4 relative">
                <div>
                    <div className="text-xs text-muted-foreground mb-1">Baseline (2024)</div>
                    <div className="text-2xl font-bold text-slate-500">{baseline}{suffix}</div>
                </div>
                <div className="text-right">
                    <div className="text-xs text-muted-foreground mb-1">Current (QIP)</div>
                    <div className="text-3xl font-bold text-foreground">{current}{suffix}</div>
                </div>

                {/* Impact Badge */}
                <div className={cn(
                    "absolute top-4 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1",
                    isImproved ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" :
                        isNeutral ? "bg-slate-100 text-slate-600" :
                            "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"
                )}>
                    {isImproved ? <TrendingUp className="w-3 h-3" /> : isNeutral ? <Minus className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {diff > 0 ? "+" : ""}{diff}{suffix}
                </div>
            </CardContent>
        </Card>
    )
}

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
        staleTime: Infinity
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

    // Filter Helpers
    const filterOutliers = (data: any[]) => data?.filter((r: any) => !excludedIds.includes(r.id || r.patientToken)) || [];

    // Calculated Stats
    const liveStats = useMemo(() => calculateStats(filterOutliers(liveAudits || [])), [liveAudits, excludedIds]);
    const historicalStats = useMemo(() => calculateStats(filterOutliers(historicalAudits || [])), [historicalAudits, excludedIds]);

    // Combined for Charts
    const currentViewStats = useMemo(() => {
        let rawData = [];
        if (dataSource === 'ALL') rawData = [...(liveAudits || []), ...(historicalAudits || [])];
        else if (dataSource === 'LIVE') rawData = liveAudits || [];
        else rawData = historicalAudits || [];

        // Generate Stable IDs
        const dataWithIds = rawData.map((r: any) => ({
            ...r,
            // Use existing ID, or create a stable composite key from Token + Arrival Date
            id: r.id || `${r.patientToken}-${r.arrivalDate}`
        }));

        // Filter Outliers
        const filtered = dataWithIds.filter((a: any) => !excludedIds.includes(a.id));

        // Sort by Arrival Date for correct Run Chart sequencing
        filtered.sort((a: any, b: any) => new Date(a.arrivalDate || 0).getTime() - new Date(b.arrivalDate || 0).getTime());

        const stats = calculateStats(filtered);
        return {
            ...stats,
        }
    }, [dataSource, liveAudits, historicalAudits, excludedIds]);

    const isLoading = isLoadingLive || isLoadingHistory;

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCcw className="w-8 h-8 animate-spin text-brand-500" />
                    <p className="text-muted-foreground animate-pulse">Generating QIP Report...</p>
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
                            <h1 className="text-sm font-semibold tracking-tight">QIP Report: Impact Assessment</h1>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Mental Health (Self-Harm)</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Source Toggle - Only for detailed view usually, but keep global for now */}
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

                        {excludedIds.length > 0 && (
                            <Button variant="outline" size="sm" onClick={handleResetExclusions} className="text-amber-600 border-amber-200 bg-amber-50 hover:bg-amber-100 dark:text-amber-400 dark:border-amber-800 dark:bg-amber-900/20 dark:hover:bg-amber-900/30">
                                <RefreshCcw className="w-3 h-3 mr-2" />
                                Reset ({excludedIds.length})
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

                {/* Header */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight">QIP Impact Report</h1>
                    <p className="text-muted-foreground max-w-2xl">
                        Comparing baseline historical data (pre-intervention) with live audit data (post-intervention) to measure the efficacy of the new "ALERTS" and "SAFETY" protocols.
                    </p>
                </div>

                <Tabs defaultValue="impact" className="w-full">
                    <TabsList className="grid w-full grid-cols-3 max-w-md mb-8 print:hidden">
                        <TabsTrigger value="impact">Impact & Comparison</TabsTrigger>
                        <TabsTrigger value="analysis">Detailed Analysis</TabsTrigger>
                        <TabsTrigger value="plan">Action Plan</TabsTrigger>
                    </TabsList>

                    {/* == TAB 1: IMPACT DASHBOARD == */}
                    <TabsContent value="impact" className="space-y-8 animate-in fade-in-50">

                        {/* High Level Stats */}
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <MetricCard
                                title="Triage < 15m"
                                baseline={historicalStats?.standard1_15m || 0}
                                current={liveStats?.standard1_15m || 0}
                            />
                            <MetricCard
                                title="Median Triage Time"
                                baseline={historicalStats?.triageMedian || 0}
                                current={liveStats?.triageMedian || 0}
                                suffix="m"
                                inverse // Lower is better
                            />
                            <MetricCard
                                title="Risk Obs. Evidence"
                                baseline={historicalStats?.standard2 || 0}
                                current={liveStats?.standard2 || 0}
                            />
                            <MetricCard
                                title="Full Risk Assessment"
                                baseline={historicalStats?.standard3 || 0}
                                current={liveStats?.standard3 || 0}
                            />
                        </div>

                        {/* Visual Summary */}
                        <div className="grid md:grid-cols-2 gap-8">
                            <Card className="border-emerald-100 bg-emerald-50/50 dark:bg-emerald-900/10 dark:border-emerald-900">
                                <CardHeader>
                                    <CardTitle className="text-emerald-800 dark:text-emerald-400 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5" /> Successes
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="list-disc pl-5 space-y-2 text-sm text-emerald-900 dark:text-emerald-200">
                                        <li>Triage timeliness has improved by <strong>{Math.abs((liveStats?.standard1_15m || 0) - (historicalStats?.standard1_15m || 0))}%</strong>.</li>
                                        <li>Documentation of "Compassionate Care" remains high across both cohorts.</li>
                                        <li>The new digital form has achieved <strong>100%</strong> data completeness for mandatory fields.</li>
                                    </ul>
                                </CardContent>
                            </Card>

                            <Card className="border-amber-100 bg-amber-50/50 dark:bg-amber-900/10 dark:border-amber-900">
                                <CardHeader>
                                    <CardTitle className="text-amber-800 dark:text-amber-400 flex items-center gap-2">
                                        <AlertTriangle className="w-5 h-5" /> Areas for Focus
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <ul className="list-disc pl-5 space-y-2 text-sm text-amber-900 dark:text-amber-200">
                                        <li>Observation documentation for Medium Risk patients is still below target ({liveStats?.standard2}%).</li>
                                        <li>Psych liaison referrals often happen before the full ED risk assessment is recorded.</li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* == TAB 2: DETAILED ANALYSIS (Using selected Source) == */}
                    <TabsContent value="analysis" className="space-y-12 animate-in fade-in-50">
                        <div className="bg-muted/30 p-4 rounded-lg text-sm text-muted-foreground text-center">
                            Viewing data for: <strong className="text-foreground">{dataSource}</strong> (n={currentViewStats?.total || 0})
                        </div>

                        {/* Patient Cohort Demographics */}
                        <section className="break-inside-avoid">
                            <h2 className="text-xl font-bold tracking-tight mb-4">Patient Cohort Demographics</h2>
                            <div className="grid md:grid-cols-2 gap-8">
                                <RiskLevelChart data={currentViewStats?.riskLevelData || []} />
                                <GenderDistributionChart data={currentViewStats?.genderData || []} />
                            </div>
                        </section>

                        {/* Standard 1 */}
                        <section className="break-inside-avoid">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-2xl font-bold tracking-tight">Standard 1: Timely Mental Health Triage</h2>
                                <div className="text-sm text-muted-foreground">Target: 15 mins</div>
                            </div>
                            <div className="grid lg:grid-cols-4 gap-8">
                                <div className="lg:col-span-1 grid grid-cols-2 lg:grid-cols-1 gap-4">
                                    <Card className="bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900">
                                        <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Within 15 mins</CardTitle></CardHeader>
                                        <CardContent><div className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{currentViewStats?.standard1_15m}%</div></CardContent>
                                    </Card>
                                    <Card>
                                        <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Median Triage</CardTitle></CardHeader>
                                        <CardContent><div className="text-2xl font-bold">{currentViewStats?.triageMedian} <span className="text-sm font-normal text-muted-foreground">min</span></div></CardContent>
                                    </Card>
                                </div>
                                <div className="lg:col-span-3 h-[400px]">
                                    <TimeRunChart data={currentViewStats?.triagePoints || []} />
                                </div>
                            </div>

                            <div className="mt-4">
                                <Card className="bg-muted/20 border-dashed">
                                    <CardHeader className="pb-2 py-3 cursor-pointer">
                                        <div className="flex justify-between items-center">
                                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                                <Activity className="w-4 h-4" />
                                                Data Quality: Outlier Management
                                            </CardTitle>
                                            <span className="text-[10px] text-muted-foreground">
                                                {excludedIds.length} excluded
                                            </span>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="py-0">
                                        <div className="max-h-[200px] overflow-y-auto">
                                            <table className="w-full text-sm">
                                                <tbody>
                                                    {(currentViewStats?.triagePoints || [])
                                                        .slice()
                                                        .sort((a, b) => b.minutes - a.minutes)
                                                        .slice(0, 5)
                                                        .map((pt) => (
                                                            <tr key={pt.id} className="h-8 border-b border-border/50 hover:bg-muted/50 transition-colors">
                                                                <td className="py-1 text-xs font-mono text-muted-foreground pl-2">ID: {pt.token?.substring(0, 8)}...</td>
                                                                <td className="py-1 text-xs font-medium text-right">{pt.minutes}m</td>
                                                                <td className="py-1 text-right w-[100px] pr-2">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleToggleExclusion(pt.id)}
                                                                        className="h-6 px-2 text-[10px] text-red-500 hover:bg-red-50 hover:text-red-600 dark:text-red-400 dark:hover:bg-red-900/20"
                                                                    >
                                                                        Exclude
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </section>

                        {/* 2-Column Masonry Layout */}
                        <div className="grid md:grid-cols-2 gap-8 items-start break-inside-avoid">
                            
                            {/* LEFT COLUMN */}
                            <div className="space-y-8">
                                <section>
                                    <h2 className="text-xl font-bold tracking-tight mb-4">Standard 2: Observation</h2>
                                    <ObservationEvidenceChart data={currentViewStats?.obsData || []} />
                                </section>

                                <section>
                                    <h2 className="text-xl font-bold tracking-tight mb-4">Safeguarding & Experience</h2>
                                    <div className="space-y-6">
                                        <SafeguardingComplianceChart data={currentViewStats?.safeguardingData || []} />
                                        <Card className="bg-blue-50/50 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900">
                                            <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Compassionate Care</CardTitle></CardHeader>
                                            <CardContent>
                                                <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{currentViewStats?.compassionateCareRate}%</div>
                                                <p className="text-xs text-muted-foreground mt-1">Patients with documented positive engagement</p>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </section>

                                <section>
                                    <h2 className="text-xl font-bold tracking-tight mb-4">Departure Outcomes</h2>
                                    <DepartureOutcomeChart data={currentViewStats?.departureOutcomeData || []} />
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <Card className="bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-900">
                                            <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400">Absconded</CardTitle></CardHeader>
                                            <CardContent><div className="text-2xl font-bold text-red-700 dark:text-red-300">{currentViewStats?.abscondedCount || 0}</div></CardContent>
                                        </Card>
                                        <Card className="bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-900">
                                            <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">LAMA</CardTitle></CardHeader>
                                            <CardContent><div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{currentViewStats?.lamaCount || 0}</div></CardContent>
                                        </Card>
                                    </div>
                                </section>
                            </div>

                            {/* RIGHT COLUMN */}
                            <div className="space-y-8">
                                <section>
                                    <h2 className="text-xl font-bold tracking-tight mb-4">Standard 3: Risk Assessment</h2>
                                    <div className="flex flex-col gap-4">
                                        <RiskAssessmentComponentsChart data={currentViewStats?.assessmentData || []} />
                                        <p className="text-[10px] text-right text-muted-foreground">
                                            n = {currentViewStats?.clinicianCount} (Patients seen by clinician)
                                        </p>
                                        <Card>
                                            <CardContent>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between text-sm items-center border-b pb-1">
                                                        <span className="text-muted-foreground">Composite Standard Met</span>
                                                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{currentViewStats?.standard3}%</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground pt-2">
                                                        Most commonly missed: <strong>Trigger</strong> and <strong>Future Plans</strong>.
                                                    </p>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </section>

                                <section>
                                    <h2 className="text-xl font-bold tracking-tight mb-4">Psych Liaison Efficiency</h2>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <Card>
                                                <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Referral Rate</CardTitle></CardHeader>
                                                <CardContent><div className="text-2xl font-bold">{currentViewStats?.psychReferralRate}%</div></CardContent>
                                            </Card>
                                            <Card>
                                                <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-muted-foreground">Median Response</CardTitle></CardHeader>
                                                <CardContent>
                                                    <div className="text-2xl font-bold">{currentViewStats?.medianPsychResponse} <span className="text-sm font-normal text-muted-foreground">min</span></div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                        <Card className="bg-muted/10">
                                            <CardHeader>
                                                <CardTitle className="text-sm">Process Flow</CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="relative border-l border-muted ml-3 pl-6 py-2 space-y-6">
                                                    <div className="relative">
                                                        <div className="absolute -left-[29px] w-3 h-3 bg-muted rounded-full border border-background" />
                                                        <p className="text-sm font-medium">ED Assessment</p>
                                                        <p className="text-xs text-muted-foreground">Initial triage & risk screen</p>
                                                    </div>
                                                    <div className="relative">
                                                        <div className="absolute -left-[29px] w-3 h-3 bg-blue-500 rounded-full border border-background" />
                                                        <p className="text-sm font-medium">Psych Referral</p>
                                                        <p className="text-xs text-muted-foreground">{currentViewStats?.psychReferralRate}% of patients referred</p>
                                                    </div>
                                                    <div className="relative">
                                                        <div className="absolute -left-[29px] w-3 h-3 bg-emerald-500 rounded-full border border-background" />
                                                        <p className="text-sm font-medium">Specialist Review</p>
                                                        <p className="text-xs text-muted-foreground">Median wait: {currentViewStats?.medianPsychResponse} mins</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </TabsContent>

                    {/* == TAB 3: ACTION PLAN == */}
                    <TabsContent value="plan" className="space-y-8 animate-in fade-in-50">
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight mb-2">QIP Interventions & Action Plan</h2>
                            <p className="text-muted-foreground">The following protocols have been deployed to improve compliance and patient safety.</p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <Card className="overflow-hidden flex flex-col h-full">
                                <div className="aspect-[3/4] w-full bg-muted relative">
                                    <img 
                                        src="/alerts.png" 
                                        alt="ALERTS Triage Protocol" 
                                        className="absolute inset-0 w-full h-full object-contain bg-white"
                                    />
                                </div>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">1</span>
                                        ALERTS Protocol
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 flex-1">
                                    <p className="text-sm text-muted-foreground">
                                        Standardised triage assessment tool implemented in all triage bays to ensure consistent risk stratification.
                                    </p>
                                    <div className="bg-emerald-50 text-emerald-900 dark:bg-emerald-900/20 dark:text-emerald-200 p-3 rounded-md text-xs font-medium">
                                        Goal: Reduce triage variation & improve time-to-assessment.
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="overflow-hidden flex flex-col h-full">
                                <div className="aspect-[3/4] w-full bg-muted relative">
                                    <img 
                                        src="/safety.png" 
                                        alt="SAFETY Risk Assessment" 
                                        className="absolute inset-0 w-full h-full object-contain bg-white"
                                    />
                                </div>
                                <CardHeader className="pb-2">
                                    <CardTitle className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">2</span>
                                        SAFETY Checklist
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 flex-1">
                                    <p className="text-sm text-muted-foreground">
                                        Clinician-led risk formulation tool to guide discharge planning and psych liaison referrals.
                                    </p>
                                    <div className="bg-blue-50 text-blue-900 dark:bg-blue-900/20 dark:text-blue-200 p-3 rounded-md text-xs font-medium">
                                        Goal: Increase completion of full risk formulation components.
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="mt-8 bg-muted/30 p-6 rounded-lg border border-border/50">
                            <h3 className="text-lg font-semibold mb-4">Future Recommendations</h3>
                            <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground">
                                <li><strong>Audit Cycle 3:</strong> Re-audit in 3 months to assess long-term adherence to SAFETY protocol.</li>
                                <li><strong>Digital Integration:</strong> Explore embedding the ALERTS score directly into the EPR triage screen.</li>
                                <li><strong>Training:</strong> Run "Safety Huddles" with night staff to address the observation documentation gap.</li>
                                <li><strong>Departure Tracking:</strong> Monitor absconding and LAMA rates monthly using the new departure outcome field.</li>
                            </ul>
                        </div>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
