import type { Metadata } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { ClientLayout } from "@/components/layout/client-layout";

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
});

export const metadata: Metadata = {
  title: "KnowTrial - Turn Study Material into Practice Exams",
  description: "Upload PDFs, docs, or URLs and instantly generate exam-style questions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${lexend.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

