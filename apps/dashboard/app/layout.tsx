import "./globals.css";
import type { Metadata } from "next";
import Navbar from "../components/Navbar";

export const metadata: Metadata = {
  title: "Edge Memory Platform | AI-Powered Edge Intelligence",
  description: "Offline-first AI memory system with local semantic retrieval, selective sync, and conflict resolution",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-paper text-ink min-h-screen font-sans selection:bg-peach selection:text-sienna">
        <Navbar />
        <div className="pl-64 min-h-screen w-full flex flex-col bg-paper">
          <main className="flex-1 w-full max-w-7xl mx-auto p-6 md:p-10 min-w-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
