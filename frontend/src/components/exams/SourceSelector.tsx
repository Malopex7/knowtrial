"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store";
import { Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Source {
    _id: string;
    title: string;
    type: string;
    tags: string[];
}

interface SourceSelectorProps {
    selectedIds: string[];
    onSelectionChange: (ids: string[]) => void;
    "aria-labelledby"?: string;
}

export function SourceSelector({ selectedIds, onSelectionChange, "aria-labelledby": ariaLabelledby }: SourceSelectorProps) {
    const [sources, setSources] = useState<Source[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const { token } = useAuthStore();

    useEffect(() => {
        const fetchSources = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sources`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.success) {
                    setSources(data.data);
                }
            } catch (err) {
                console.error("Failed to fetch sources", err);
            } finally {
                setLoading(false);
            }
        };

        if (token) fetchSources();
    }, [token]);

    const filteredSources = sources.filter(s =>
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const toggleSource = (id: string) => {
        if (selectedIds.includes(id)) {
            onSelectionChange(selectedIds.filter(sid => sid !== id));
        } else {
            onSelectionChange([...selectedIds, id]);
        }
    };

    if (loading) return <div className="text-sm text-muted-foreground" aria-live="polite">Loading sources...</div>;

    return (
        <div className="space-y-3" role="group" aria-labelledby={ariaLabelledby}>
            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search sources..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                    aria-label="Search sources"
                />
            </div>

            <ScrollArea className="h-[200px] rounded-md border p-2">
                {filteredSources.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">No sources found.</div>
                ) : (
                    <div className="space-y-1">
                        {filteredSources.map(source => {
                            const isSelected = selectedIds.includes(source._id);
                            return (
                                <div
                                    key={source._id}
                                    onClick={() => toggleSource(source._id)}
                                    role="checkbox"
                                    aria-checked={isSelected}
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter" || e.key === " ") {
                                            e.preventDefault();
                                            toggleSource(source._id);
                                        }
                                    }}
                                    className={cn(
                                        "flex cursor-pointer items-center justify-between rounded-sm px-2 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                                        isSelected && "bg-accent/50"
                                    )}
                                >
                                    <div className="flex flex-col gap-1">
                                        <span className="font-medium truncate max-w-[200px] sm:max-w-[300px]">{source.title}</span>
                                        <div className="flex gap-1 overflow-hidden">
                                            {source.tags.slice(0, 3).map(tag => (
                                                <Badge key={tag} variant="outline" className="text-[10px] px-1 py-0 h-4">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    {isSelected && <Check className="h-4 w-4 text-primary" />}
                                </div>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>
            <div className="text-xs text-muted-foreground text-right">
                {selectedIds.length} source(s) selected
            </div>
        </div>
    );
}
