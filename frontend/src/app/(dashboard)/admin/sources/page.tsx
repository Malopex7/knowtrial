"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, FileText, Download, CheckCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

interface AdminSource {
    _id: string;
    userId: {
        _id: string;
        name: string;
        email: string;
    };
    title: string;
    originalName: string;
    mimeType: string;
    status: 'pending' | 'processing' | 'ready' | 'failed';
    errorMessage?: string;
    tags: string[];
    createdAt: string;
}

export default function AdminSourcesPage() {
    const { token, user } = useAuthStore();
    const router = useRouter();
    const [sources, setSources] = useState<AdminSource[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
        // Enforce admin-only on the client side just in case
        if (user && user.role !== 'admin') {
            router.push('/dashboard');
            return;
        }

        if (!token) return;

        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/sources`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(async res => {
                if (!res.ok) {
                    if (res.status === 403) throw new Error("Unauthorized Access");
                    throw new Error("Failed to load sources");
                }
                return res.json();
            })
            .then(data => setSources(data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [token, user, router]);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'ready': return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
            case 'processing': return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
            default: return <Clock className="h-4 w-4 text-yellow-500" />;
        }
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 md:p-8 max-w-7xl mx-auto">
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-10 flex flex-col items-center text-center">
                        <ShieldAlert className="h-12 w-12 text-red-500 mb-4" />
                        <h2 className="text-xl font-bold text-red-700 mb-2">Access Denied</h2>
                        <p className="text-red-600 mb-6">{error}</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Platform Sources</h1>
                <p className="text-muted-foreground mt-1">
                    Manage all uploaded knowledge base materials across the entire platform.
                </p>
            </div>

            <Card>
                <CardHeader
                    className="flex flex-row items-center justify-between cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="space-y-1">
                        <CardTitle className="text-lg">All Sources ({sources.length})</CardTitle>
                        <CardDescription>A comprehensive top-down view of all user uploads.</CardDescription>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-expanded={isExpanded}
                        aria-label={isExpanded ? "Collapse sources list" : "Expand sources list"}
                    >
                        {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                    </Button>
                </CardHeader>
                {isExpanded && (
                    <CardContent className="p-0 border-t">
                        {sources.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                No sources have been uploaded yet.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                                        <tr>
                                            <th className="px-6 py-4 font-medium">Source Title & File</th>
                                            <th className="px-6 py-4 font-medium">Uploader</th>
                                            <th className="px-6 py-4 font-medium">Status & Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {sources.map(source => (
                                            <tr key={source._id} className="hover:bg-muted/30 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-start gap-3">
                                                        <div className="mt-1 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                                            <FileText className="h-4 w-4 text-primary" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-base truncate">{source.title}</p>
                                                            <p className="text-muted-foreground flex items-center gap-1.5 mt-0.5 mt-1 border rounded px-1.5 py-0.5 bg-muted/20 w-fit text-xs">
                                                                <Download className="h-3 w-3" />
                                                                {source.originalName ? (source.originalName.length > 50 ? source.originalName.slice(0, 47) + '...' : source.originalName) : 'Unknown File'}
                                                            </p>
                                                            {source.tags && source.tags.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mt-2">
                                                                    {source.tags.map(tag => (
                                                                        <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                                                            {tag}
                                                                        </Badge>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                    <div>
                                                        <p className="font-medium">{source.userId?.name || 'Unknown User'}</p>
                                                        <p className="text-muted-foreground text-xs">{source.userId?.email || 'N/A'}</p>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="flex items-center gap-1.5 capitalize font-medium text-xs">
                                                            {getStatusIcon(source.status)}
                                                            {source.status}
                                                        </div>
                                                        <p className="text-muted-foreground text-xs">
                                                            {new Date(source.createdAt).toLocaleDateString()}
                                                        </p>
                                                        {source.status === 'failed' && source.errorMessage && (
                                                            <p className="text-red-500 text-xs mt-1 max-w-[200px] truncate" title={source.errorMessage}>
                                                                {source.errorMessage}
                                                            </p>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                )}
            </Card>
        </div>
    );
}
