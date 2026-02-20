"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BookOpen, Loader2 } from "lucide-react";

export default function RegisterPage() {
    const router = useRouter();
    const { login, isLoading, error, clearError } = useAuthStore();

    // Using local state for registration since `useAuthStore` only has `login` currently
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [regError, setRegError] = useState<string | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        clearError();
        setRegError(null);
        setIsRegistering(true);

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001";
            const res = await fetch(`${API_URL}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || data.error || 'Registration failed');
            }

            // Immediately login after successful registration
            await login(email, password);

            const state = useAuthStore.getState();
            if (!state.error && state.token) {
                router.push("/dashboard");
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setRegError(err.message);
            } else {
                setRegError('An unknown error occurred during registration');
            }
        } finally {
            setIsRegistering(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen items-center justify-center p-4 bg-muted/40">
            <Link href="/" className="flex items-center gap-2 mb-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <BookOpen className="h-6 w-6" />
                </div>
                <span className="text-2xl font-bold tracking-tight">KnowTrial</span>
            </Link>

            <Card className="w-full max-w-sm">
                <CardHeader>
                    <CardTitle className="text-2xl">Create an account</CardTitle>
                    <CardDescription>
                        Enter your details below to create your account.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {(error || regError) && (
                            <Alert variant="destructive">
                                <AlertDescription>{regError || error}</AlertDescription>
                            </Alert>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="John Doe"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </CardContent>
                    <CardFooter className="flex flex-col space-y-4">
                        <Button type="submit" className="w-full" disabled={isRegistering || isLoading}>
                            {(isRegistering || isLoading) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Sign Up
                        </Button>
                        <div className="text-center text-sm text-muted-foreground">
                            Already have an account?{" "}
                            <Link href="/login" className="underline underline-offset-4 hover:text-primary">
                                Sign in
                            </Link>
                        </div>
                    </CardFooter>
                </form>
            </Card>
        </div>
    );
}
