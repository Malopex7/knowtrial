"use client";

import { useState } from "react";
import { SourceList } from "@/components/library/SourceList";
import { AddSourceModal } from "@/components/library/AddSourceModal";

export default function LibraryPage() {
    const [refreshKey, setRefreshKey] = useState(0);

    const handleSourceAdded = () => {
        setRefreshKey((prev) => prev + 1);
    };

    return (
        <div className="container mx-auto py-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Study Library</h1>
                    <p className="text-muted-foreground mt-2">
                        Manage your study materials, articles, and documents.
                    </p>
                </div>
                <AddSourceModal onSourceAdded={handleSourceAdded} />
            </div>

            <SourceList key={refreshKey} />
        </div>
    );
}
