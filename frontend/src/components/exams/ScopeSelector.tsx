"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TagInput } from "@/components/ui/tag-input";
import { SourceSelector } from "./SourceSelector";
import { Card, CardContent } from "@/components/ui/card";
import { Dispatch, SetStateAction } from "react";

export type ScopeType = 'all' | 'tags' | 'sources';

interface ScopeSelectorProps {
    scope: ScopeType;
    setScope: (scope: ScopeType) => void;
    scopeIds: string[];
    setScopeIds: Dispatch<SetStateAction<string[]>>;
}

export function ScopeSelector({ scope, setScope, scopeIds, setScopeIds }: ScopeSelectorProps) {

    const handleScopeChange = (val: ScopeType) => {
        setScope(val);
        setScopeIds([]); // Reset selection when changing scope
    };

    return (
        <div className="space-y-4">
            <Label className="text-base">Content Scope</Label>
            <RadioGroup
                value={scope}
                onValueChange={(val) => handleScopeChange(val as ScopeType)}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
            >
                <div>
                    <RadioGroupItem value="all" id="scope-all" className="peer sr-only" />
                    <Label
                        htmlFor="scope-all"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                        <span className="mb-2 text-lg font-semibold">All Content</span>
                        <span className="text-xs text-muted-foreground text-center">
                            Draw questions from your entire library
                        </span>
                    </Label>
                </div>

                <div>
                    <RadioGroupItem value="tags" id="scope-tags" className="peer sr-only" />
                    <Label
                        htmlFor="scope-tags"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                        <span className="mb-2 text-lg font-semibold">By Tags</span>
                        <span className="text-xs text-muted-foreground text-center">
                            Focus on specific topics
                        </span>
                    </Label>
                </div>

                <div>
                    <RadioGroupItem value="sources" id="scope-sources" className="peer sr-only" />
                    <Label
                        htmlFor="scope-sources"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                    >
                        <span className="mb-2 text-lg font-semibold">Specific Sources</span>
                        <span className="text-xs text-muted-foreground text-center">
                            Select documents to study
                        </span>
                    </Label>
                </div>
            </RadioGroup>

            <div className="mt-4">
                {scope === 'tags' && (
                    <Card>
                        <CardContent className="pt-6">
                            <Label className="mb-2 block">Filter Tags</Label>
                            <TagInput
                                tags={scopeIds}
                                setTags={setScopeIds}
                                placeholder="add tags (e.g. biology, history)..."
                            />
                            <p className="text-xs text-muted-foreground mt-2">
                                Press enter or comma to add tags.
                            </p>
                        </CardContent>
                    </Card>
                )}

                {scope === 'sources' && (
                    <Card>
                        <CardContent className="pt-6">
                            <Label className="mb-2 block">Select Sources</Label>
                            <SourceSelector
                                selectedIds={scopeIds}
                                onSelectionChange={(ids) => setScopeIds(ids)}
                            />
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
