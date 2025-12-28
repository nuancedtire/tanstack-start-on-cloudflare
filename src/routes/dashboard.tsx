import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getDashboardStatsFn } from "@/server/actions";
import {
  ShieldCheck,
  Activity,
  AlertTriangle,
  Users,
  ArrowUpRight,
  Clock,
  FileBarChart
} from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardFooter, CardTitle } from "@/components/ui/card";
import {
  MotionDiv,
  AnimatedContainer,
  AnimatedItem,
  AnimatedCounter,
  AnimatedProgress,
  PulsingDot,
  HoverCard
} from "@/components/ui/motion";

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: () => getDashboardStatsFn(),
    refetchInterval: 5000,
  });

  if (isLoading || !metrics) {
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
            <Link to="/data">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground">View All Data</Button>
            </Link>
            <Link to="/audit">
              <Button className="bg-brand-600 hover:bg-brand-700 text-white shadow-sm">New Audit</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        <AnimatedContainer className="space-y-8">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <AnimatedItem>
              <MetricCard
                title="Total Audits"
                value={metrics.totalAudits}
                subtitle="This week"
                icon={Users}
                trend="+12%"
                trendUp={true}
                colorClass="bg-blue-50 text-blue-600 dark:bg-blue-900/20"
              />
            </AnimatedItem>
            <AnimatedItem>
              <MetricCard
                title="Triage < 15m"
                value={metrics.triageCompliance}
                suffix="%"
                subtitle="Target: 90%"
                icon={Clock}
                trend="-2%"
                trendUp={false}
                alert={metrics.triageCompliance < 80}
                colorClass="bg-violet-50 text-violet-600 dark:bg-violet-900/20"
              />
            </AnimatedItem>
            <AnimatedItem>
              <MetricCard
                title="Obs Compliance"
                value={metrics.observationCompliance}
                suffix="%"
                subtitle="High/Med Risk"
                icon={ShieldCheck}
                trend="+5%"
                trendUp={true}
                colorClass="bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20"
              />
            </AnimatedItem>
            <AnimatedItem>
              <MetricCard
                title="Clinical Assess."
                value={metrics.safetyCompliance}
                suffix="%"
                subtitle="4/4 Elements"
                icon={AlertTriangle}
                trend="+8%"
                trendUp={true}
                alert={metrics.safetyCompliance < 70}
                colorClass="bg-amber-50 text-amber-600 dark:bg-amber-900/20"
              />
            </AnimatedItem>
          </div>

          {/* Detailed Sections */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Chart Area */}
            <AnimatedItem className="lg:col-span-2">
              <HoverCard className="h-full premium-card !p-0 overflow-hidden border-border/50 shadow-sm bg-card">
                <div className="p-6 border-b border-border/50">
                  <CardTitle className="flex items-center gap-2">
                    <FileBarChart className="w-5 h-5 text-brand-500" />
                    Compliance Trends
                  </CardTitle>
                  <CardDescription>Weekly performance against RCEM standards.</CardDescription>
                </div>
                <CardContent className="p-6">
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-violet-500" />
                          Standard 1: Triage Timeliness
                        </span>
                        <span className={cn("font-bold", metrics.triageCompliance < 80 ? "text-red-500" : "text-violet-600")}>
                          {metrics.triageCompliance}%
                        </span>
                      </div>
                      <AnimatedProgress value={metrics.triageCompliance} className="h-2.5 bg-neutral-100 dark:bg-neutral-800" indicatorClassName={metrics.triageCompliance < 80 ? "bg-red-500" : "bg-violet-500"} />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Standard 2: Safety Observations
                        </span>
                        <span className="font-bold text-emerald-600">{metrics.observationCompliance}%</span>
                      </div>
                      <AnimatedProgress value={metrics.observationCompliance} className="h-2.5 bg-neutral-100 dark:bg-neutral-800" indicatorClassName="bg-emerald-500" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          Standard 3: Clinical Risk (S.A.F.E)
                        </span>
                        <span className={cn("font-bold", metrics.safetyCompliance < 70 ? "text-amber-500" : "text-emerald-500")}>
                          {metrics.safetyCompliance}%
                        </span>
                      </div>
                      <AnimatedProgress value={metrics.safetyCompliance} className="h-2.5 bg-neutral-100 dark:bg-neutral-800" indicatorClassName="bg-amber-500" />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/30 border-t border-border/50 p-4">
                  <Link to="/data" className="w-full">
                    <Button variant="outline" className="w-full bg-background hover:bg-muted/50 transition-colors">
                      View Detailed Report <ArrowUpRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardFooter>
              </HoverCard>
            </AnimatedItem>

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
                    {metrics.recent?.map((item: any, i: number) => (
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
                    {(!metrics.recent || metrics.recent.length === 0) && (
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
