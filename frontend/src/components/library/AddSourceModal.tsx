"use client";

import { useState } from "react";
import { Upload, FileText, Globe, Type, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store";

// Allowed file types
const ACCEPTED_TYPES = {
    "application/pdf": ".pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
    "text/plain": ".txt",
};

interface AddSourceModalProps {
    onSourceAdded?: () => void;
}

export function AddSourceModal({ onSourceAdded }: AddSourceModalProps) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { token } = useAuthStore();

    // Form States
    const [url, setUrl] = useState("");

    const [file, setFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);

    const [textTitle, setTextTitle] = useState("");
    const [rawText, setRawText] = useState("");

    const resetForm = () => {
        setUrl("");
        setFile(null);
        setTextTitle("");
        setRawText("");
        setError(null);
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (Object.keys(ACCEPTED_TYPES).includes(droppedFile.type)) {
                setFile(droppedFile);
            } else {
                setError("Invalid file type. Please upload PDF, DOCX, or TXT.");
            }
        }
    };

    const handlFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleSubmit = async (type: "url" | "file" | "text") => {
        setError(null);
        setLoading(true);

        try {
            let body: BodyInit | null = null;
            const headers: HeadersInit = {
                Authorization: `Bearer ${token}`,
            };

            if (type === "url") {
                if (!url) throw new Error("Please enter a URL");
                body = JSON.stringify({ type: "url", url });
                (headers as Record<string, string>)["Content-Type"] = "application/json";
            } else if (type === "file") {
                if (!file) throw new Error("Please select a file");
                const formData = new FormData();
                formData.append("file", file);
                body = formData;
                // Content-Type is set automatically for FormData
            } else if (type === "text") {
                if (!textTitle) throw new Error("Please enter a title");
                if (!rawText) throw new Error("Please enter text content");
                body = JSON.stringify({ type: "text", title: textTitle, text: rawText });
                (headers as Record<string, string>)["Content-Type"] = "application/json";
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sources`, {
                method: "POST",
                headers,
                body,
            });

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.error || "Failed to add source");
            }

            // Success
            setOpen(false);
            resetForm();
            if (onSourceAdded) onSourceAdded();

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
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Source
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Add New Source</DialogTitle>
                    <DialogDescription>
                        Import knowledge from a URL, document, or paste text directly.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="url" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="url"><Globe className="w-4 h-4 mr-2" /> URL</TabsTrigger>
                        <TabsTrigger value="file"><Upload className="w-4 h-4 mr-2" /> File</TabsTrigger>
                        <TabsTrigger value="text"><Type className="w-4 h-4 mr-2" /> Text</TabsTrigger>
                    </TabsList>

                    {/* URL TAB */}
                    <TabsContent value="url" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="url">Website URL</Label>
                            <Input
                                id="url"
                                placeholder="https://example.com/article"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Button onClick={() => handleSubmit('url')} disabled={loading} className="w-full">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Import URL
                        </Button>
                    </TabsContent>

                    {/* FILE TAB */}
                    <TabsContent value="file" className="space-y-4 py-4">
                        <div
                            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                                }`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            {file ? (
                                <div className="flex flex-col items-center">
                                    <FileText className="h-8 w-8 text-primary mb-2" />
                                    <p className="text-sm font-medium">{file.name}</p>
                                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                                    <Button variant="ghost" size="sm" onClick={() => setFile(null)} className="mt-2 text-red-500 hover:text-red-600">
                                        <X className="mr-2 h-4 w-4" /> Remove
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                                    <p className="text-sm font-medium mb-1">Drag & drop or click to upload</p>
                                    <p className="text-xs text-muted-foreground">PDF, DOCX, TXT</p>
                                    <Input
                                        id="file-upload"
                                        type="file"
                                        className="hidden"
                                        accept={Object.values(ACCEPTED_TYPES).join(',')}
                                        onChange={handlFileSelect}
                                    />
                                    <Button variant="secondary" size="sm" className="mt-4" onClick={() => document.getElementById('file-upload')?.click()}>
                                        Select File
                                    </Button>
                                </div>
                            )}
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Button onClick={() => handleSubmit('file')} disabled={loading || !file} className="w-full">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Upload File
                        </Button>
                    </TabsContent>

                    {/* TEXT TAB */}
                    <TabsContent value="text" className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                placeholder="Document Title"
                                value={textTitle}
                                onChange={(e) => setTextTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="content">Content</Label>
                            <Textarea
                                id="content"
                                placeholder="Paste your text here..."
                                className="min-h-[150px]"
                                value={rawText}
                                onChange={(e) => setRawText(e.target.value)}
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Button onClick={() => handleSubmit('text')} disabled={loading} className="w-full">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Text
                        </Button>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
