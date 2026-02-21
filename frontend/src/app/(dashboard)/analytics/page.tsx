"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuthStore } from "@/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, BarChart2 } from "lucide-react";
import {
    RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
    BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
    ResponsiveContainer,
} from "recharts";

interface TopicScore { correct: number; total: number; }
interface Attempt {
    _id: string;
    topicScores: Record<string, TopicScore>;
    percentage: number;
}

interface TopicStat {
    topic: string;
    correct: number;
    total: number;
    pct: number;
}

function pctColor(pct: number) {
    if (pct >= 80) return "#22c55e";
    if (pct >= 50) return "#eab308";
    return "#ef4444";
}

// Aggregate topicScores across all attempts
function aggregateTopics(attempts: Attempt[]): TopicStat[] {
    const map: Record<string, { correct: number; total: number }> = {};
    for (const a of attempts) {
        for (const [tag, s] of Object.entries(a.topicScores || {})) {
            if (!map[tag]) map[tag] = { correct: 0, total: 0 };
            map[tag].correct += s.correct;
            map[tag].total += s.total;
        }
    }
    return Object.entries(map)
        .map(([topic, s]) => ({ topic, ...s, pct: Math.round((s.correct / s.total) * 100) }))
        .sort((a, b) => b.pct - a.pct);
}

export default function AnalyticsPage() {
    const { token } = useAuthStore();
    const [attempts, setAttempts] = useState<Attempt[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attempts`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setAttempts(data); })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [token]);

    const topics = useMemo(() => aggregateTopics(attempts), [attempts]);

    // For radar: limit to top 10 topics to keep chart readable
    const radarData = topics.slice(0, 10).map(t => ({
        topic: t.topic.length > 20 ? t.topic.slice(0, 18) + "…" : t.topic,
        Score: t.pct,
        fullTopic: t.topic,
    }));

    // Bar chart: all topics sorted worst → best for "weak areas" view
    const barData = [...topics].reverse().slice(-20);

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (topics.length === 0) {
        return (
            <div className="p-4 md:p-8 max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-2">Analytics</h1>
                <p className="text-muted-foreground mb-8">Performance breakdown by topic across all attempts.</p>
                <Card>
                    <CardContent className="p-12 flex flex-col items-center text-center">
                        <BarChart2 className="h-12 w-12 text-muted-foreground mb-4" />
                        <h2 className="text-xl font-semibold mb-2">No data yet</h2>
                        <p className="text-muted-foreground">Complete at least one exam to see your topic analytics.</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Analytics</h1>
                <p className="text-muted-foreground mt-1">
                    Aggregated performance across {attempts.length} attempt{attempts.length !== 1 ? "s" : ""} · {topics.length} topic{topics.length !== 1 ? "s" : ""}
                </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                {/* ── Radar chart ── */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Topic Radar — Top {radarData.length}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={320}>
                            <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                                <PolarGrid stroke="hsl(var(--border))" />
                                <PolarAngleAxis
                                    dataKey="topic"
                                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                />
                                <PolarRadiusAxis
                                    angle={90}
                                    domain={[0, 100]}
                                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                                    tickCount={5}
                                />
                                <Radar
                                    name="Score"
                                    dataKey="Score"
                                    stroke="hsl(var(--primary))"
                                    fill="hsl(var(--primary))"
                                    fillOpacity={0.25}
                                    strokeWidth={2}
                                />
                                <Tooltip
                                    content={({ payload }) => {
                                        if (!payload?.length) return null;
                                        const d = payload[0].payload;
                                        return (
                                            <div className="rounded-md bg-popover border border-border px-3 py-2 text-xs shadow-md">
                                                <p className="font-semibold text-foreground mb-1">{d.fullTopic}</p>
                                                <p className="text-muted-foreground">Score: <span className="font-bold text-foreground">{d.Score}%</span></p>
                                            </div>
                                        );
                                    }}
                                />
                            </RadarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* ── Horizontal bar chart ── */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">All Topics — Score Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart
                                data={barData}
                                layout="vertical"
                                margin={{ top: 0, right: 30, bottom: 0, left: 8 }}
                                barSize={12}
                            >
                                <XAxis
                                    type="number"
                                    domain={[0, 100]}
                                    tickFormatter={v => `${v}%`}
                                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="topic"
                                    width={130}
                                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                    tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 16) + "…" : v}
                                />
                                <Tooltip
                                    content={({ payload }) => {
                                        if (!payload?.length) return null;
                                        const d = payload[0].payload as TopicStat;
                                        return (
                                            <div className="rounded-md bg-popover border border-border px-3 py-2 text-xs shadow-md">
                                                <p className="font-semibold text-foreground mb-1">{d.topic}</p>
                                                <p className="text-muted-foreground">{d.correct}/{d.total} correct · <span className="font-bold text-foreground">{d.pct}%</span></p>
                                            </div>
                                        );
                                    }}
                                />
                                <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
                                    {barData.map((entry, idx) => (
                                        <Cell key={idx} fill={pctColor(entry.pct)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            {/* ── Summary table ── */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Topic Summary</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-xs text-muted-foreground uppercase tracking-wider">
                                    <th className="px-4 py-3 text-left">Topic</th>
                                    <th className="px-4 py-3 text-right">Correct</th>
                                    <th className="px-4 py-3 text-right">Total</th>
                                    <th className="px-4 py-3 text-right">Score</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topics.map(t => (
                                    <tr key={t.topic} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-2.5 font-medium">{t.topic}</td>
                                        <td className="px-4 py-2.5 text-right text-muted-foreground">{t.correct}</td>
                                        <td className="px-4 py-2.5 text-right text-muted-foreground">{t.total}</td>
                                        <td className="px-4 py-2.5 text-right">
                                            <span className="font-semibold" style={{ color: pctColor(t.pct) }}>
                                                {t.pct}%
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
