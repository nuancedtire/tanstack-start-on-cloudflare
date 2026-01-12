import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getAllAuditsFn } from "@/server/actions";
import {
  ShieldCheck,
  Activity,
  AlertTriangle,
  Users,
  ArrowUpRight,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMemo } from "react";

import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardTitle } from "@/components/ui/card";

import {
  MotionDiv,
  AnimatedContainer,
  AnimatedItem,
  AnimatedCounter,
  PulsingDot,
  HoverCard
} from "@/components/ui/motion";
import {
  RiskLevelChart,
  TimeRunChart,
  ObservationEvidenceChart,
  RiskAssessmentComponentsChart
} from "@/components/chart-components";
import { parseAndSeedFromCsv } from "@/scripts/ingest-csv";
import { RiskLevel, ObservationStatus } from "@/lib/schema";
import { differenceInMinutes } from "date-fns";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {


  const { data: allAudits, isLoading } = useQuery({
    queryKey: ["allAudits"],
    queryFn: () => getAllAuditsFn(),
    refetchInterval: 5000,
  });



  // Compute metrics from filtered audits
  // Compute metrics from all audits
  const metrics = useMemo(() => {
    const audits = allAudits || [];
    const total = audits.length;

    //  Standard 1: Triage < 15 mins (Total Dataset)
    const triageCompliantCount = audits.filter((a: any) => {
      if (!a.triageTime || !a.arrivalDate) return false;
      const diff = differenceInMinutes(new Date(a.triageTime), new Date(a.arrivalDate));
      return diff <= 15 && diff >= 0;
    }).length;

    // Data for Run Chart (Triage Times)
    const triageRunData = audits
      .filter((a: any) => a.triageTime && a.arrivalDate)
      .sort((a: any, b: any) => new Date(a.arrivalDate).getTime() - new Date(b.arrivalDate).getTime())
      .map((a: any, index: number) => {
        const diff = differenceInMinutes(new Date(a.triageTime), new Date(a.arrivalDate));
        return {
          id: a.patientToken?.substring(0, 4) || 'Unk',
          minutes: diff < 0 ? 0 : diff, // Handle potential data errors
          compliant: diff <= 15 && diff >= 0,
          arrivalDate: a.arrivalDate,
          index: index + 1
        };
      });

    // Standard 2: Med/High Risk Obs
    const riskPatients = audits.filter((a: any) => a.riskLevel === RiskLevel.Medium || a.riskLevel === RiskLevel.High);
    const obsCompliantCount = riskPatients.filter((a: any) => a.observationLevelMet === ObservationStatus.Yes).length;

    // Data for Observation Evidence Chart
    const obsData = [
      { name: "Yes", value: riskPatients.filter((a: any) => a.observationLevelMet === ObservationStatus.Yes).length },
      { name: "Partial", value: riskPatients.filter((a: any) => a.observationLevelMet === ObservationStatus.Partial).length },
      { name: "No", value: riskPatients.filter((a: any) => a.observationLevelMet === ObservationStatus.No || !a.observationLevelMet).length },
    ];

    // Standard 3: Safety Assessment
    const safetyCompliantCount = audits.filter((a: any) => {
      if (!a.clinicianSeen) return false;
      return (
        a.riskAssessmentType &&
        a.riskAssessmentTrigger &&
        a.riskAssessmentFuture &&
        a.riskAssessmentHistory === "Adequate"
      );
    }).length;

    // Data for Risk Assessment Components Chart
    const clinicianSeenAudits = audits.filter((a: any) => a.clinicianSeen);
    const assessmentData = [
      { name: "Type", value: 0, total: clinicianSeenAudits.length },
      { name: "Trigger", value: 0, total: clinicianSeenAudits.length },
      { name: "Future", value: 0, total: clinicianSeenAudits.length },
      { name: "History", value: 0, total: clinicianSeenAudits.length },
    ];

    if (clinicianSeenAudits.length > 0) {
      assessmentData[0].value = Math.round((clinicianSeenAudits.filter((a: any) => a.riskAssessmentType).length / clinicianSeenAudits.length) * 100);
      assessmentData[1].value = Math.round((clinicianSeenAudits.filter((a: any) => a.riskAssessmentTrigger).length / clinicianSeenAudits.length) * 100);
      assessmentData[2].value = Math.round((clinicianSeenAudits.filter((a: any) => a.riskAssessmentFuture).length / clinicianSeenAudits.length) * 100);
      assessmentData[3].value = Math.round((clinicianSeenAudits.filter((a: any) => a.riskAssessmentHistory === "Adequate").length / clinicianSeenAudits.length) * 100);
    }



    return {
      totalAudits: total,
      triageCompliance: total === 0 ? 0 : Math.round((triageCompliantCount / total) * 100),
      observationCompliance: riskPatients.length === 0 ? 100 : Math.round((obsCompliantCount / riskPatients.length) * 100),
      safetyCompliance: total === 0 ? 0 : Math.round((safetyCompliantCount / total) * 100),
      recent: audits.slice(0, 5).map((a: any) => ({
        id: a.patientToken,
        type: a.clinicianSeen && a.triagePerformed ? "FULL" : (a.clinicianSeen ? "SAFETY" : "ALERTS"),
        time: a.createdAt || new Date().toISOString()
      })),
      riskData: [
        { name: "High", count: audits.filter((a: any) => a.riskLevel === "High").length },
        { name: "Medium", count: audits.filter((a: any) => a.riskLevel === "Medium").length },
        { name: "Low", count: audits.filter((a: any) => a.riskLevel === "Low").length },
        { name: "Unknown", count: audits.filter((a: any) => !a.riskLevel).length },
      ].filter(d => d.count > 0),
      triageRunData,
      obsData,
      assessmentData,
    };
  }, [allAudits]);

  // Fetch Baseline Data (CSV)
  const { data: baselineMetrics } = useQuery({
    queryKey: ["baselineData"],
    queryFn: async () => {
      try {
        const records = await parseAndSeedFromCsv('/Combined-data.csv');
        const total = records.length;
        if (total === 0) return null;

        // Triage
        const triagePass = records.filter((a: any) => {
          if (!a.triageTime || !a.arrivalDate) return false;
          const diff = differenceInMinutes(new Date(a.triageTime), new Date(a.arrivalDate));
          return diff <= 15 && diff >= 0;
        }).length;

        // Obs
        const riskSubset = records.filter((a: any) => a.riskLevel === RiskLevel.Medium || a.riskLevel === RiskLevel.High);
        const obsPass = riskSubset.filter((a: any) => a.observationLevelMet === ObservationStatus.Yes).length;

        // Safety
        const safetyPass = records.filter((a: any) => {
          if (!a.clinicianSeen) return false;
          return (
            a.riskAssessmentType &&
            a.riskAssessmentTrigger &&
            a.riskAssessmentFuture &&
            a.riskAssessmentHistory === "Adequate"
          );
        }).length;

        return {
          triage: Math.round((triagePass / total) * 100),
          obs: riskSubset.length === 0 ? 0 : Math.round((obsPass / riskSubset.length) * 100),
          safety: Math.round((safetyPass / total) * 100),
          trendData: [
            { date: "Baseline", triage: Math.round((triagePass / total) * 100), observation: riskSubset.length === 0 ? 0 : Math.round((obsPass / riskSubset.length) * 100), safety: Math.round((safetyPass / total) * 100) }
          ]
        };
      } catch (e) {
        console.error("Failed to fetch baseline", e);
        return null;
      }
    },
    staleTime: Infinity
  });

  const finalMetrics = useMemo(() => {
    const baseline = baselineMetrics || { triage: 0, obs: 0, safety: 0, trendData: [] };

    return {
      ...metrics,
      trends: {
        // Current - Baseline
        triage: metrics.triageCompliance - baseline.triage,
        obs: metrics.observationCompliance - baseline.obs,
        safety: metrics.safetyCompliance - baseline.safety,
        total: metrics.totalAudits - 137 // Hardcoded approximate baseline count diff or just show count? Let's just show count.
      },
      // Trend Chart: Show Baseline + Live
      trendData: [
        ...baseline.trendData.map((d: any) => ({ ...d, date: "Baseline" })),
        {
          date: "Current",
          triage: metrics.triageCompliance,
          observation: metrics.observationCompliance,
          safety: metrics.safetyCompliance
        }
      ]
    };
  }, [metrics, baselineMetrics]);

  if (isLoading || !allAudits) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <PulsingDot color="info" className="scale-150" />
          <p className="text-muted-foreground animate-pulse">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50/50 dark:bg-neutral-950">
      <header className="bg-background/80 backdrop-blur-md border-b sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <MotionDiv
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <Link to="/">
              <img src="/logo512.png" alt="Logo" className="h-8 w-8 rounded-lg shadow-sm" />
            </Link>
            <h1 className="text-xl font-bold tracking-tight text-foreground">QIP Analytics</h1>
          </MotionDiv>

          <nav className="flex items-center gap-3">
            <Link to="/report">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">Report</Button>
            </Link>
            <Link to="/data">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">View All Data</Button>
            </Link>
            <Link to="/audit">
              <Button className="bg-brand-600 hover:bg-brand-700 text-white shadow-sm">New Audit</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 space-y-6">
        <AnimatedContainer className="space-y-6">
          {/* Stats Overview Header - Removed Gender Filter */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-foreground">Overview</h2>
            <span className="text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
              {finalMetrics.totalAudits} Patient Presentations (Live)
            </span>
          </div>

          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <AnimatedItem>
              <MetricCard
                title="Total Audits"
                value={finalMetrics.totalAudits}
                subtitle="Live Data"
                icon={Users}
                trend=""
                trendUp={true}
                colorClass="bg-blue-50 text-blue-600 dark:bg-blue-900/20"
              />
            </AnimatedItem>
            <AnimatedItem>
              <MetricCard
                title="Triage < 15m"
                value={finalMetrics.triageCompliance}
                suffix="%"
                subtitle="vs Baseline"
                icon={Clock}
                trend={`${finalMetrics.trends.triage > 0 ? '+' : ''}${finalMetrics.trends.triage}%`}
                trendUp={finalMetrics.trends.triage >= 0}
                alert={finalMetrics.triageCompliance < 80}
                colorClass="bg-violet-50 text-violet-600 dark:bg-violet-900/20"
              />
            </AnimatedItem>
            <AnimatedItem>
              <MetricCard
                title="Obs Compliance"
                value={finalMetrics.observationCompliance}
                suffix="%"
                subtitle="vs Baseline"
                icon={ShieldCheck}
                trend={`${finalMetrics.trends.obs > 0 ? '+' : ''}${finalMetrics.trends.obs}%`}
                trendUp={finalMetrics.trends.obs >= 0}
                colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"
              />
            </AnimatedItem>
            <AnimatedItem>
              <MetricCard
                title="Clinical Assess."
                value={finalMetrics.safetyCompliance}
                suffix="%"
                subtitle="vs Baseline"
                icon={AlertTriangle}
                trend={`${finalMetrics.trends.safety > 0 ? '+' : ''}${finalMetrics.trends.safety}%`}
                trendUp={finalMetrics.trends.safety >= 0}
                alert={finalMetrics.safetyCompliance < 70}
                colorClass="bg-amber-50 text-amber-600 dark:bg-amber-900/20"
              />
            </AnimatedItem>
          </div>

          {/* Charts Row 1: Time to Triage Run Chart (Visualisation for Standard 1) */}
          <AnimatedItem>
            <TimeRunChart data={finalMetrics.triageRunData} />
          </AnimatedItem>

          {/* Charts Row 2: Observation & Risk Components (Standard 2 & 3) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatedItem>
              <ObservationEvidenceChart data={finalMetrics.obsData} />
            </AnimatedItem>
            <AnimatedItem>
              <RiskAssessmentComponentsChart data={finalMetrics.assessmentData} />
            </AnimatedItem>
          </div>

          {/* Charts Row 3: Demographics & Trends (Supplemental) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Swapped Gender for Compliance Trend */}
            <AnimatedItem>
              <RiskLevelChart data={finalMetrics.riskData} />
            </AnimatedItem>
          </div>

          {/* Detailed Sections: Feed */}
          <div className="grid grid-cols-1 gap-8">
            {/* Recent Activity / Feed */}

            {/* Recent Activity / Feed */}
            <AnimatedItem>
              <HoverCard className="h-full premium-card !p-0 border-border/50 shadow-sm bg-card">
                <div className="p-6 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-brand-500" />
                    Recent Audits
                  </CardTitle>
                  <CardDescription>Latest submissions feed.</CardDescription>
                </div>
                <CardContent className="!p-0">
                  <div className="divide-y divide-border/50">
                    {finalMetrics.recent?.map((item: any, i: number) => (
                      <MotionDiv
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        key={item.id + i}
                        className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors group cursor-default"
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-2 h-2 rounded-full ring-4 ring-opacity-20 transition-all group-hover:scale-110",
                            item.type === "SAFETY" ? "bg-blue-500 ring-blue-500" : "bg-emerald-500 ring-emerald-500"
                          )} />
                          <div>
                            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                              {item.id.substring(0, 8)}
                            </div>
                            <div className="text-sm font-semibold text-foreground">
                              {item.type} Audit
                            </div>
                          </div>
                        </div>
                        <div className="text-xs font-medium text-muted-foreground bg-muted/50 px-2 py-1 rounded-md">
                          {new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </MotionDiv>
                    ))}
                    {(!finalMetrics.recent || finalMetrics.recent.length === 0) && (
                      <div className="p-8 text-sm text-muted-foreground text-center italic">No audits yet.</div>
                    )}
                  </div>
                </CardContent>
              </HoverCard>
            </AnimatedItem>
          </div>
        </AnimatedContainer>
      </main>
    </div>
  );
}

function MetricCard({ title, value, suffix = "", subtitle, icon: Icon, trend, trendUp, alert, colorClass }: any) {
  return (
    <HoverCard className={cn(
      "premium-card border-l-4",
      alert ? "border-l-red-500" : "border-l-brand-500"
    )}>
      <div className="flex items-center justify-between space-x-4 mb-4">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className={cn("p-2 rounded-lg", colorClass)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="flex flex-col space-y-1">
        <span className="text-3xl font-bold tracking-tight text-foreground">
          <AnimatedCounter value={value} suffix={suffix} />
        </span>
        <div className="flex items-center text-xs">
          <span className={cn(
            "font-bold flex items-center gap-1",
            trendUp ? "text-emerald-600" : "text-red-600"
          )}>
            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3 rotate-180" />}
            {trend}
          </span>
          <span className="text-muted-foreground ml-2">
            {subtitle}
          </span>
        </div>
      </div>
    </HoverCard>
  );
}
