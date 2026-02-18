"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, FileText, Globe, Calendar, Tag, Layers } from "lucide-react";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/library/StatusBadge";

interface Source {
    _id: string;
    title: string;
    type: string;
    url?: string;
    originalFilename?: string;
    tags: string[];
    status: string;
    chunkCount: number;
    createdAt: string;
}

interface Chunk {
    _id: string;
    index: number;
    heading: string | null;
    text: string;
    tokenCount: number;
}

export default function SourceViewerPage() {
    const params = useParams();
    const router = useRouter();
    const { token } = useAuthStore();
    const [source, setSource] = useState<Source | null>(null);
    const [chunks, setChunks] = useState<Chunk[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        if (!params.id || !token) return;

        try {
            setLoading(true);
            const headers = { Authorization: `Bearer ${token}` };

            // Fetch Source
            const sourceRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sources/${params.id}`, { headers });
            const sourceData = await sourceRes.json();

            if (!sourceData.success) throw new Error(sourceData.error || "Failed to fetch source");
            setSource(sourceData.data);

            // Fetch Chunks
            const chunksRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sources/${params.id}/chunks`, { headers });
            const chunksData = await chunksRes.json();

            if (chunksData.success) {
                setChunks(chunksData.data);
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unknown error occurred");
            }
        } finally {
            setLoading(false);
        }
    }, [params.id, token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading source content...</div>;
    }

    if (error || !source) {
        return (
            <div className="container mx-auto py-8 text-center">
                <p className="text-red-500 mb-4">{error || "Source not found"}</p>
                <Button onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Library
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-8 space-y-6 h-[calc(100vh-4rem)] flex flex-col">
            {/* Header */}
            <div className="flex flex-col gap-4">
                <Button variant="ghost" className="w-fit -ml-2 text-muted-foreground" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Library
                </Button>

                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            {source.type === "url" ? <Globe className="h-5 w-5 text-blue-500" /> : <FileText className="h-5 w-5 text-orange-500" />}
                            <h1 className="text-2xl font-bold tracking-tight">{source.title}</h1>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" /> {format(new Date(source.createdAt), "PPP")}
                            </span>
                            <span className="flex items-center gap-1">
                                <Layers className="h-3 w-3" /> {source.chunkCount} chunks
                            </span>
                            <StatusBadge status={source.status} />
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    {source.tags.map(tag => (
                        <Badge key={tag} variant="secondary">
                            <Tag className="mr-1 h-3 w-3" /> {tag}
                        </Badge>
                    ))}
                </div>
            </div>

            <Separator />

            {/* Chunks Viewer */}
            <div className="flex-1 min-h-0 grid gap-6 md:grid-cols-[1fr_300px]">
                {/* Main Content */}
                <Card className="flex flex-col h-full overflow-hidden border-2 shadow-sm">
                    <CardHeader className="py-4 bg-muted/30 border-b">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                            <FileText className="h-4 w-4" /> Extracted Text
                        </CardTitle>
                    </CardHeader>
                    <ScrollArea className="flex-1 p-6">
                        <div className="space-y-8 max-w-3xl mx-auto">
                            {chunks.length === 0 ? (
                                <p className="text-center text-muted-foreground italic">No extracted text available yet. Check the source status.</p>
                            ) : (
                                chunks.map((chunk) => (
                                    <div key={chunk._id} className="group relative pl-4 border-l-2 border-transparent hover:border-primary/20 transition-colors">
                                        <div className="absolute -left-[9px] top-0 text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 bg-background px-1">
                                            #{chunk.index + 1}
                                        </div>
                                        {chunk.heading && (
                                            <h3 className="font-semibold text-lg mb-2 text-primary">{chunk.heading}</h3>
                                        )}
                                        <p className="leading-relaxed text-foreground/90 whitespace-pre-wrap">{chunk.text}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </Card>

                {/* Sidebar Info */}
                <div className="space-y-4 hidden md:block">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm">Source Details</CardTitle>
                        </CardHeader>
                        <CardContent className="text-sm space-y-4">
                            <div>
                                <p className="text-muted-foreground mb-1">Type</p>
                                <p className="font-medium capitalize">{source.type}</p>
                            </div>
                            {source.url && (
                                <div>
                                    <p className="text-muted-foreground mb-1">URL</p>
                                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline break-all">
                                        {source.url}
                                    </a>
                                </div>
                            )}
                            {source.originalFilename && (
                                <div>
                                    <p className="text-muted-foreground mb-1">Original Filename</p>
                                    <p className="font-medium break-all">{source.originalFilename}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-muted-foreground mb-1">Created</p>
                                <p className="font-medium">{format(new Date(source.createdAt), "PPpp")}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
