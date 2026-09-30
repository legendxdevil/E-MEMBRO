"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Brain,
  Search,
  HardDrive,
  RefreshCw,
  GitCompare,
  Smartphone,
  Activity,
  Settings,
  Wifi,
  WifiOff,
  Zap,
  PlayCircle
} from "lucide-react";
import { api, SyncStatus } from "../lib/api";

export default function Navbar() {
  const pathname = usePathname();
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await api.getSyncStatus();
      setSyncStatus(data);
    } catch (e) {
      // offline or backend starting
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await api.seedDemo();
      setSeedSuccess(true);
      setTimeout(() => setSeedSuccess(false), 4000);
      fetchStatus();
      // Reload page to refresh active tab data
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (e: any) {
      alert(`Seed failed: ${e.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const navItems = [
    { href: "/", label: "Overview", icon: Brain },
    { href: "/memories", label: "Memories", icon: HardDrive },
    { href: "/search", label: "Semantic Search", icon: Search },
    { href: "/sync", label: "Sync Center", icon: RefreshCw },
    { href: "/conflicts", label: "Conflicts", icon: GitCompare },
    { href: "/devices", label: "Devices", icon: Smartphone },
    { href: "/activity", label: "Activity Log", icon: Activity },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-fog border-r border-hairline flex flex-col justify-between h-screen fixed left-0 top-0 z-40 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-hairline flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-ink flex items-center justify-center text-paper">
              <Zap className="w-4 h-4 text-paper" />
            </div>
            <div>
              <div className="font-serif text-lg tracking-tight text-ink flex items-center gap-2">
                <span className="italic">E-</span>MEMBRO
                <span className="text-[10px] font-sans px-2 py-0.5 rounded-full bg-peach text-sienna font-medium">
                  LOCAL
                </span>
              </div>
              <div className="text-[12px] text-slate-gray">Offline-First AI</div>
            </div>
          </div>
        </div>

        {/* Network & Device Indicator Bar */}
        <div className="px-5 py-2.5 bg-paper/60 border-b border-hairline flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {syncStatus?.is_online ? (
              <span className="flex items-center gap-1.5 text-ink font-normal text-[12px]">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Online
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-sienna font-normal text-[12px]">
                <span className="w-2 h-2 rounded-full bg-peach border border-sienna animate-pulse" />
                Offline Mode
              </span>
            )}
          </div>
          <span className="text-[11px] text-ash-gray font-sans">
            {syncStatus?.pending_jobs_count ?? 0} queued
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-full text-sm transition-all ${
                  active
                    ? "bg-mist text-ink font-medium"
                    : "text-slate-gray hover:text-ink hover:bg-mist/50"
                }`}
              >
                <Icon className={`w-4 h-4 ${active ? "text-ink" : "text-ash-gray"}`} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls & Demo Seed Button */}
      <div className="p-5 border-t border-hairline space-y-2.5">
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="w-full py-2.5 px-4 rounded-full text-xs font-normal bg-ink text-paper hover:bg-ink/85 flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          <PlayCircle className="w-4 h-4" />
          {seeding ? "Seeding Demo..." : seedSuccess ? "Demo Seeded!" : "Seed Demo Scenario"}
        </button>
        <div className="text-[11px] text-center text-ash-gray">
          Device Node Alpha • v1.0.0
        </div>
      </div>
    </aside>
  );
}
