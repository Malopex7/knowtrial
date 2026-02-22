"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldAlert, Edit2, Trash2, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";

interface GlobalTag {
    name: string;
    count: number;
}

export default function AdminTagsPage() {
    const { token, user } = useAuthStore();
    const router = useRouter();
    const [tags, setTags] = useState<GlobalTag[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Edit state
    const [editingTag, setEditingTag] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const loadTags = () => {
        if (!token) return;
        setLoading(true);
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tags`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(async res => {
                if (!res.ok) {
                    if (res.status === 403) throw new Error("Unauthorized Access");
                    throw new Error("Failed to load tags");
                }
                return res.json();
            })
            .then(data => setTags(data))
            .catch(err => setError(err.message))
            .finally(() => setLoading(false));
    }

    useEffect(() => {
        if (user && user.role !== 'admin') {
            router.push('/dashboard');
            return;
        }
        loadTags();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, user, router]);

    const handleEdit = async (oldName: string) => {
        if (!editValue.trim() || editValue.trim() === oldName) {
            setEditingTag(null);
            return;
        }

        if (!confirm(`Are you sure you want to rename "${oldName}" to "${editValue.trim()}"? This will affect ALL sources across the platform.`)) {
            return;
        }

        setActionLoading(`edit-${oldName}`);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tags`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ oldName, newName: editValue.trim() })
            });

            if (!res.ok) throw new Error("Failed to rename tag");

            setEditingTag(null);
            loadTags(); // Reload to get fresh aggregated counts
            toast.success("Tag renamed successfully");
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            toast.error(msg);
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (tagName: string) => {
        if (!confirm(`Critical Warning: Are you sure you want to DELETE the tag "${tagName}"? It will be stripped from ALL sources across the platform permanently.`)) {
            return;
        }

        setActionLoading(`delete-${tagName}`);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tags`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: tagName })
            });

            if (!res.ok) throw new Error("Failed to delete tag");

            loadTags();
            toast.success("Tag deleted successfully");
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Unknown error";
            toast.error(msg);
        } finally {
            setActionLoading(null);
        }
    };

    const startEditing = (tagName: string) => {
        setEditingTag(tagName);
        setEditValue(tagName);
    };

    if (loading && tags.length === 0) {
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
                <h1 className="text-3xl font-bold tracking-tight">Global Tags</h1>
                <p className="text-muted-foreground mt-1">
                    Manage and organize topics intelligently across all user-uploaded knowledge sources.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Platform Tags ({tags.length})</CardTitle>
                    <CardDescription>Aggregated dictionary of all distinct tags extracted from sources.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {tags.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            No tags are currently in use across the platform.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
                                    <tr>
                                        <th className="px-6 py-4 font-medium w-1/2">Tag / Topic Name</th>
                                        <th className="px-6 py-4 font-medium">Usage Count</th>
                                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y border-b">
                                    {tags.map(tag => (
                                        <tr key={tag.name} className="hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-primary/10 shrink-0">
                                                        <TagIcon className="h-4 w-4 text-primary" />
                                                    </div>

                                                    {editingTag === tag.name ? (
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                type="text"
                                                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                                                value={editValue}
                                                                onChange={(e) => setEditValue(e.target.value)}
                                                                autoFocus
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') handleEdit(tag.name);
                                                                    if (e.key === 'Escape') setEditingTag(null);
                                                                }}
                                                            />
                                                            <Button size="sm" onClick={() => handleEdit(tag.name)} disabled={actionLoading === `edit-${tag.name}`}>
                                                                {actionLoading === `edit-${tag.name}` ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                                                            </Button>
                                                            <Button size="sm" variant="ghost" onClick={() => setEditingTag(null)}>Cancel</Button>
                                                        </div>
                                                    ) : (
                                                        <span className="font-semibold text-base">{tag.name}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 font-medium">
                                                    <span>{tag.count}</span>
                                                    <span className="text-muted-foreground font-normal text-xs">sources</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {editingTag !== tag.name && (
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            aria-label={`Edit tag ${tag.name}`}
                                                            className="h-8 w-8"
                                                            onClick={() => startEditing(tag.name)}
                                                            disabled={actionLoading !== null}
                                                        >
                                                            <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="icon"
                                                            aria-label={`Delete tag ${tag.name}`}
                                                            className="h-8 w-8 opacity-80 hover:opacity-100"
                                                            onClick={() => handleDelete(tag.name)}
                                                            disabled={actionLoading !== null}
                                                        >
                                                            {actionLoading === `delete-${tag.name}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                        </Button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
