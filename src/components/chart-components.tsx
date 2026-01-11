import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// Color palette for charts
const COLORS = {
    male: '#3b82f6',
    female: '#ec4899',
    notKnown: '#94a3b8',
    high: '#ef4444',
    medium: '#f59e0b',
    low: '#10b981',
    yes: '#10b981',
    partial: '#f59e0b',
    no: '#ef4444',
};

interface TimeRunChartProps {
    data: Array<{
        id: string;
        minutes: number;
        compliant: boolean;
    }>;
}

export function TimeRunChart({ data }: TimeRunChartProps) {
    return (
        <Card className="premium-card !px-0">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-violet-500" />
                    Time to Triage Run Chart
                </CardTitle>
                <CardDescription>Minutes from arrival to mental health triage per patient</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="id" hide />
                        <YAxis label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                            }}
                            labelFormatter={(label) => `Patient: ${label}`}
                        />
                        <Line
                            type="monotone"
                            dataKey="minutes"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            dot={(props: any) => {
                                const { cx, cy, payload } = props;
                                return (
                                    <circle
                                        cx={cx}
                                        cy={cy}
                                        r={4}
                                        fill={payload.compliant ? COLORS.low : COLORS.high}
                                        stroke="none"
                                    />
                                );
                            }}
                        />
                        {/* Reference lines for 15 and 60 mins */}
                        <Line type="monotone" dataKey="reference15" stroke="transparent" dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

interface ObservationEvidenceProps {
    data: Array<{
        name: string;
        value: number;
    }>;
}

export function ObservationEvidenceChart({ data }: ObservationEvidenceProps) {
    const getBarColor = (name: string) => {
        if (name === 'Yes') return COLORS.yes;
        if (name === 'Partial') return COLORS.partial;
        return COLORS.no;
    };

    return (
        <Card className="premium-card !px-0">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Observation Evidence
                </CardTitle>
                <CardDescription>Documented evidence of observation for At-Risk patients</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                            }}
                        />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getBarColor(entry.name)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

interface RiskAssessmentProps {
    data: Array<{
        name: string;
        value: number;
        total: number;
    }>;
}

export function RiskAssessmentComponentsChart({ data }: RiskAssessmentProps) {
    return (
        <Card className="premium-card !px-0">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Risk Assessment Components
                </CardTitle>
                <CardDescription>Completion rate of key assessment elements</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis dataKey="name" type="category" width={100} className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                            }}
                            formatter={(value: any) => [`${value}%`, 'Completion']}
                        />
                        <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

interface GenderDistributionProps {
    data: Array<{ name: string; value: number; }>;
}

export function GenderDistributionChart({ data }: GenderDistributionProps) {
    const CHART_COLORS = ['#3b82f6', '#ec4899', '#94a3b8'];

    return (
        <Card className="premium-card !px-0">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-500" />
                    Gender Distribution
                </CardTitle>
                <CardDescription>Patient demographics breakdown</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {data.map((_entry, index) => (
                                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

interface RiskLevelChartProps {
    data: Array<{ name: string; count: number; }>;
}

export function RiskLevelChart({ data }: RiskLevelChartProps) {
    const getBarColor = (name: string) => {
        if (name === 'High') return COLORS.high;
        if (name === 'Medium') return COLORS.medium;
        if (name === 'Low') return COLORS.low;
        return '#94a3b8';
    };

    return (
        <Card className="premium-card !px-0">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-500" />
                    Risk Level Distribution
                </CardTitle>
                <CardDescription>Patient risk assessment breakdown</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                            }}
                        />
                        <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getBarColor(entry.name)} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

interface ComplianceTrendProps {
    data: Array<{
        date: string;
        triage: number;
        observation: number;
        safety: number;
    }>;
}

export function ComplianceTrendChart({ data }: ComplianceTrendProps) {
    return (
        <Card className="premium-card !px-0">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-brand-500" />
                    Compliance Trends
                </CardTitle>
                <CardDescription>Weekly compliance rates over time</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--background))',
                                border: '1px solid hsl(var(--border))',
                                borderRadius: '8px'
                            }}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="triage"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            name="Triage"
                            dot={{ fill: '#8b5cf6', r: 4 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="observation"
                            stroke="#10b981"
                            strokeWidth={2}
                            name="Observation"
                            dot={{ fill: '#10b981', r: 4 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="safety"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            name="Safety"
                            dot={{ fill: '#f59e0b', r: 4 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}
