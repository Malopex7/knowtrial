import { SourceList } from "@/components/library/SourceList";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function LibraryPage() {
    return (
        <div className="h-full flex-1 flex-col space-y-8 p-8 md:flex">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Study Library</h2>
                    <p className="text-muted-foreground">
                        Manage your study materials and knowledge base.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    {/* Placeholder for Add Source Modal */}
                    <Button disabled>
                        <Plus className="mr-2 h-4 w-4" /> Add Source (Coming Soon)
                    </Button>
                </div>
            </div>

            <SourceList />
        </div>
    );
}
