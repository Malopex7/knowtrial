"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { FileText, Globe, MoreVertical, Trash2, ExternalLink } from "lucide-react";
import { useAuthStore } from "@/store";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export function SourceList() {
    const [sources, setSources] = useState<Source[]>([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuthStore();

    useEffect(() => {
        const fetchSources = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sources`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                const data = await res.json();
                if (data.success) {
                    setSources(data.data);
                }
            } catch (error) {
                console.error("Failed to fetch sources:", error);
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchSources();
        }
    }, [token]);

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this source?")) return;

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sources/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            if (res.ok) {
                setSources((prev) => prev.filter((s) => s._id !== id));
            }
        } catch (error) {
            console.error("Failed to delete source:", error);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading library...</div>;
    }

    if (sources.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-lg bg-muted/50">
                <FileText className="w-10 h-10 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold">No sources yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                    Add a URL, PDF, or text to start building your library.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-md border bg-card">
            <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm text-left">
                    <thead className="[&_tr]:border-b">
                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground w-[50px]">Type</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Title</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Status</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Chunks</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground">Date</th>
                            <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                        {sources.map((source) => (
                            <tr key={source._id} className="border-b transition-colors hover:bg-muted/50">
                                <td className="p-4 align-middle">
                                    {source.type === "url" ? (
                                        <Globe className="w-5 h-5 text-blue-500" />
                                    ) : (
                                        <FileText className="w-5 h-5 text-orange-500" />
                                    )}
                                </td>
                                <td className="p-4 align-middle font-medium">
                                    <div className="flex flex-col">
                                        <span>{source.title}</span>
                                        {source.url && (
                                            <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:underline flex items-center gap-1">
                                                {source.url} <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                        {source.tags?.length > 0 && (
                                            <div className="flex gap-1 mt-1">
                                                {source.tags.map(tag => (
                                                    <span key={tag} className="px-1.5 py-0.5 rounded-sm bg-secondary text-secondary-foreground text-[10px]">
                                                        {tag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="p-4 align-middle">
                                    <StatusBadge status={source.status} />
                                </td>
                                <td className="p-4 align-middle text-muted-foreground">
                                    {source.chunkCount || 0}
                                </td>
                                <td className="p-4 align-middle text-muted-foreground">
                                    {format(new Date(source.createdAt), "MMM d, yyyy")}
                                </td>
                                <td className="p-4 align-middle text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDelete(source._id)}>
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
