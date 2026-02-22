"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/ui/tag-input";
import { useAuthStore } from "@/store";

interface Source {
    _id: string;
    title: string;
    tags: string[];
}

interface EditSourceDialogProps {
    source: Source | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSourceUpdated: () => void;
}

export function EditSourceDialog({ source, open, onOpenChange, onSourceUpdated }: EditSourceDialogProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { token } = useAuthStore();

    const [title, setTitle] = useState("");
    const [tags, setTags] = useState<string[]>([]);

    useEffect(() => {
        if (source) {
            setTitle(source.title);
            setTags(source.tags || []);
            setError(null);
        }
    }, [source]);

    const handleSubmit = async () => {
        if (!source) return;
        setError(null);
        setLoading(true);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sources/${source._id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ title, tags }),
            });

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.error || "Failed to update source");
            }

            onSourceUpdated();
            onOpenChange(false);
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("An unknown error occurred");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Source</DialogTitle>
                    <DialogDescription>
                        Update the title and tags for this source.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-title">Title</Label>
                        <Input
                            id="edit-title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Source title"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-tags">Tags</Label>
                        <TagInput
                            id="edit-tags"
                            tags={tags}
                            setTags={setTags}
                            placeholder="Enter tags..."
                        />
                    </div>
                    {error && <p className="text-sm text-red-500">{error}</p>}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
