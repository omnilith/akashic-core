import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Akashic Core - Ontology Management",
  description: "Web UI for managing entities, types, and relations in Akashic Core",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <aside className="w-64 border-r bg-card">
              <div className="flex h-full flex-col">
                {/* Logo/Header */}
                <div className="flex h-16 items-center border-b px-6">
                  <h1 className="text-xl font-semibold">Akashic Core</h1>
                </div>
                
                {/* Navigation */}
                <div className="flex-1 overflow-y-auto p-4">
                  <Navigation />
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
              <div className="container mx-auto p-6">
                {children}
              </div>
            </main>
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}