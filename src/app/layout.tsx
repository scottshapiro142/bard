import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { LoomProvider } from "@/lib/loom/store";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Loom — Interview in. Graph out.",
  description:
    "Loom interviews you about the app you're designing, compiles the answers into a workflow graph, runs the reviews in parallel, and hands back a prioritized, build-ready spec.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <LoomProvider>{children}</LoomProvider>
      </body>
    </html>
  );
}
