"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen } from "lucide-react";
import { useAuthStore } from "@/store";

interface CitationModalProps {
    open: boolean;
    onClose: () => void;
    sourceId: string;
    chunkId: string;
}

interface ChunkData {
    _id: string;
    text: string;
    heading: string | null;
    index: number;
    tokenCount: number;
}

interface SourceMeta {
    _id: string;
    title: string;
    type: string;
}

export function CitationModal({ open, onClose, sourceId, chunkId }: CitationModalProps) {
    const { token } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [chunk, setChunk] = useState<ChunkData | null>(null);
    const [source, setSource] = useState<SourceMeta | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fetch whenever the modal opens (or sourceId/chunkId change)
    useEffect(() => {
        if (!open || !sourceId || !chunkId) return;

        setLoading(true);
        setError(null);
        setChunk(null);
        setSource(null);

        fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/api/sources/${sourceId}/chunks/${chunkId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        )
            .then(res => res.json().then(data => ({ ok: res.ok, data })))
            .then(({ ok, data }) => {
                if (!ok || !data.success) throw new Error(data.error || "Failed to load source chunk");
                setChunk(data.data.chunk);
                setSource(data.data.source);
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }, [open, sourceId, chunkId, token]);

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
            <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <DialogTitle className="text-base">Source Reference</DialogTitle>
                    </div>
                    {source && (
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant="secondary" className="text-xs capitalize">{source.type}</Badge>
                            <span className="text-sm text-muted-foreground truncate">{source.title}</span>
                        </div>
                    )}
                </DialogHeader>

                <div className="flex-1 overflow-y-auto">
                    {loading && (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {error && (
                        <div className="text-sm text-destructive p-4 rounded-md bg-destructive/10">
                            {error}
                        </div>
                    )}

                    {chunk && !loading && (
                        <div className="space-y-3">
                            {chunk.heading && (
                                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-2">
                                    {chunk.heading}
                                </div>
                            )}
                            <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground/90">
                                {chunk.text}
                            </p>
                            <div className="text-xs text-muted-foreground pt-2 border-t">
                                Chunk #{chunk.index + 1} · ~{chunk.tokenCount} tokens
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
