import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  ArrowRight,
  BarChart3,
  Stethoscope,
  Lock,
  Zap,
  CheckCircle2
} from "lucide-react";
import {
  FadeInView,
  HoverCard,
  AnimatedContainer,
  AnimatedItem,
  FloatingElement
} from "@/components/ui/motion";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none -z-10" />
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full radial-gradient blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full radial-gradient blur-3xl opacity-20 pointer-events-none" />

      {/* Navbar Removed per user request */}

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-20 pb-24 relative">
        <AnimatedContainer className="max-w-4xl mx-auto space-y-8 relative z-10" delay={0.2}>

          <AnimatedItem className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50/50 backdrop-blur-sm border border-brand-100/50 text-brand-700 text-xs font-medium shadow-sm ring-1 ring-white/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500"></span>
              </span>
              2024/25 RCEM Standards Compliance
            </div>
          </AnimatedItem>

          <AnimatedItem>
            <h1 className="text-5xl sm:text-7xl font-bold tracking-tight text-foreground leading-[1.1]">
              Quality Improvement <br />
              <span className="gradient-text">Made Simple.</span>
            </h1>
          </AnimatedItem>

          <AnimatedItem>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              A streamlined, high-precision audit tool for RCEM Standards in Mental Health.
              Securely track <a href="/safety.png" target="_blank" rel="noopener noreferrer" className="text-foreground font-semibold hover:underline decoration-brand-500 underline-offset-4 transition-all">SAFETY</a> and <a href="/alerts.png" target="_blank" rel="noopener noreferrer" className="text-foreground font-semibold hover:underline decoration-brand-500 underline-offset-4 transition-all">ALERTS</a> protocols with real-time analytics.
            </p>
          </AnimatedItem>

          <AnimatedItem className="flex flex-col sm:flex-row gap-5 justify-center pt-8">
            <Link to="/audit" className="w-full sm:w-auto group">
              <Button size="lg" className="w-full h-14 px-8 text-base bg-brand-600 hover:bg-brand-700 text-white rounded-full transition-all shadow-xl shadow-brand-500/20 hover:shadow-brand-500/40 hover:-translate-y-0.5">
                <Stethoscope className="w-5 h-5 mr-2" />
                Start New Audit
                <ArrowRight className="w-4 h-4 ml-2 opacity-50 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" variant="outline" className="w-full h-14 px-8 text-base rounded-full border-border bg-background/50 hover:bg-muted/50 transition-all hover:-translate-y-0.5 backdrop-blur-sm">
                <BarChart3 className="w-5 h-5 mr-2 text-muted-foreground" />
                View Analytics
              </Button>
            </Link>
          </AnimatedItem>

          <AnimatedItem className="pt-12 grid grid-cols-2 gap-6 max-w-2xl mx-auto">
            <a href="/safety.png" target="_blank" rel="noopener noreferrer" className="block group relative aspect-[3/4] rounded-xl overflow-hidden border border-border/50 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10" />
              <img src="/safety.png" alt="Safety Poster" className="w-full h-full object-cover" />
              <div className="absolute bottom-3 left-3 right-3 bg-white/90 dark:bg-black/90 backdrop-blur-sm px-3 py-2 rounded-lg text-xs font-bold text-center opacity-0 group-hover:opacity-100 transition-opacity z-20 translate-y-2 group-hover:translate-y-0">
                View Safety Protocol
              </div>
            </a>
            <a href="/alerts.png" target="_blank" rel="noopener noreferrer" className="block group relative aspect-[3/4] rounded-xl overflow-hidden border border-border/50 shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10" />
              <img src="/alerts.png" alt="Alerts Poster" className="w-full h-full object-cover" />
              <div className="absolute bottom-3 left-3 right-3 bg-white/90 dark:bg-black/90 backdrop-blur-sm px-3 py-2 rounded-lg text-xs font-bold text-center opacity-0 group-hover:opacity-100 transition-opacity z-20 translate-y-2 group-hover:translate-y-0">
                View ALERTS Protocol
              </div>
            </a>
          </AnimatedItem>

          {/* Floating UI Elements for decoration */}
          <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 hidden lg:block opacity-10 pointer-events-none">
            <FloatingElement delay={0} duration={8}>
              <BarChart3 className="w-64 h-64 text-brand-500" />
            </FloatingElement>
          </div>
          <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 hidden lg:block opacity-10 pointer-events-none">
            <FloatingElement delay={1} duration={10}>
              <ShieldCheck className="w-64 h-64 text-accent-violet" />
            </FloatingElement>
          </div>
        </AnimatedContainer>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 max-w-6xl w-full text-left px-4">
          <FadeInView delay={0.4} direction="up" className="h-full">
            <HoverCard className="premium-card h-full group">
              <div className="h-12 w-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                <Zap className="text-emerald-600 w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl mb-2 group-hover:text-emerald-700 transition-colors">Real-time Compliance</h3>
              <p className="text-muted-foreground leading-relaxed">
                Instant feedback on Triage timeliness and Observation levels. Dashboard updates in real-time as audits are submitted.
              </p>
            </HoverCard>
          </FadeInView>

          <FadeInView delay={0.5} direction="up" className="h-full">
            <HoverCard className="premium-card h-full group">
              <div className="h-12 w-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                <Lock className="text-blue-600 w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl mb-2 group-hover:text-blue-700 transition-colors">Secure & Private</h3>
              <p className="text-muted-foreground leading-relaxed">
                Patient MRNs are hashed client-side with SHA-256 before transmission. No Personal Identifiable Information is ever stored.
              </p>
            </HoverCard>
          </FadeInView>

          <FadeInView delay={0.6} direction="up" className="h-full">
            <HoverCard className="premium-card h-full group">
              <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                <CheckCircle2 className="text-indigo-600 w-6 h-6" />
              </div>
              <h3 className="font-bold text-xl mb-2 group-hover:text-indigo-700 transition-colors">RCEM Standards</h3>
              <p className="text-muted-foreground leading-relaxed">
                Built specifically for the 2024/25 Quality Improvement Programme. Automatically tracks standard compliance.
              </p>
            </HoverCard>
          </FadeInView>
        </div>
      </main>

      <footer className="py-8 text-center text-sm text-muted-foreground border-t border-border/50 bg-background/50 backdrop-blur-sm">
        <p>© 2025 Barts Health NHS Trust • Quality Improvement Team</p>
      </footer>
    </div>
  );
}
