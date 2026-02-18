import { SourceList } from "@/components/library/SourceList";
import { AddSourceModal } from "@/components/library/AddSourceModal";

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
                    <AddSourceModal onSourceAdded={() => window.location.reload()} />
                </div>
            </div>

            <SourceList />
        </div>
    );
}
