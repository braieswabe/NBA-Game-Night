import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Court Legends: AI Simulation League",
  description: "A cinematic fantasy basketball simulator with round-robin leagues, finals, and AI-enhanced broadcasts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full bg-black">
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
