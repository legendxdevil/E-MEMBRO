import "./globals.css";
import type { Metadata } from "next";
import Navbar from "../components/Navbar";

export const metadata: Metadata = {
  title: "E-MEMBRO | Edge AI Autonomous Memory Platform",
  description: "Offline-first AI memory system with dense local semantic retrieval, selective sync, and multi-device consensus.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#080b11] text-slate-100 min-h-screen font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
        <Navbar />
        <div className="pl-64 min-h-screen w-full flex flex-col">
          <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-10 min-w-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
