"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { FileText, Globe, MoreVertical, Trash2, ExternalLink, Edit, Filter } from "lucide-react";
import { useAuthStore } from "@/store";
import { StatusBadge } from "./StatusBadge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { EditSourceDialog } from "./EditSourceDialog";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";


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
    errorMessage?: string;
}

export function SourceList() {
    const [sources, setSources] = useState<Source[]>([]);
    const [loading, setLoading] = useState(true);
    const { token } = useAuthStore();

    // Edit Dialog State
    const [editingSource, setEditingSource] = useState<Source | null>(null);
    const [editOpen, setEditOpen] = useState(false);

    // Filter State
    const [selectedTag, setSelectedTag] = useState<string>("all");

    const fetchSources = useCallback(async () => {
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
    }, [token]);

    useEffect(() => {
        if (token) {
            fetchSources();
        }
    }, [token, fetchSources]);

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

    const handleEdit = (source: Source) => {
        setEditingSource(source);
        setEditOpen(true);
    };

    // Get unique tags from all sources for filter
    const allTags = Array.from(new Set(sources.flatMap(s => s.tags || []))).sort();

    // Filtered sources
    const filteredSources = selectedTag === "all"
        ? sources
        : sources.filter(s => s.tags?.includes(selectedTag));

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
        <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedTag} onValueChange={setSelectedTag}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by Tag" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Tags</SelectItem>
                        {allTags.map(tag => (
                            <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Chunks</TableHead>
                            <TableHead>Date Added</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredSources.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No sources found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredSources.map((source) => (
                                <TableRow key={source._id}>
                                    <TableCell>
                                        {source.type === "url" ? (
                                            <Globe className="h-4 w-4 text-blue-500" />
                                        ) : (
                                            <FileText className="h-4 w-4 text-orange-500" />
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <Link href={`/library/${source._id}`} className="font-medium hover:underline flex items-center gap-1">
                                                    {source.title}
                                                </Link>
                                                {source.url && (
                                                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground" title="Open original URL">
                                                        <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                )}
                                            </div>
                                            {/* Tags */}
                                            {source.tags && source.tags.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {source.tags.map(tag => (
                                                        <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0 h-5">
                                                            {tag}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <StatusBadge status={source.status} errorMessage={source.errorMessage} />
                                    </TableCell>
                                    <TableCell>{source.chunkCount}</TableCell>
                                    <TableCell>{format(new Date(source.createdAt), "MMM d, yyyy")}</TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => handleEdit(source)}>
                                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleDelete(source._id)} className="text-red-600 focus:text-red-600">
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <EditSourceDialog
                source={editingSource}
                open={editOpen}
                onOpenChange={setEditOpen}
                onSourceUpdated={() => {
                    fetchSources();
                }}
            />
        </div>
    );
}
