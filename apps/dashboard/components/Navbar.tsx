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
  PlayCircle,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import { api, SyncStatus, Metrics } from "../lib/api";

export default function Navbar() {
  const pathname = usePathname();
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState(false);
  const [togglingOffline, setTogglingOffline] = useState(false);

  const fetchStatus = async () => {
    try {
      const [statusData, metricsData] = await Promise.all([
        api.getSyncStatus().catch(() => null),
        api.getMetrics().catch(() => null),
      ]);
      if (statusData) setSyncStatus(statusData);
      if (metricsData) setMetrics(metricsData);
    } catch {
      // quiet offline handle
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await api.seedDemo();
      setSeedSuccess(true);
      await fetchStatus();
      setTimeout(() => {
        setSeedSuccess(false);
        if (typeof window !== "undefined") {
          window.location.reload();
        }
      }, 1000);
    } catch (e: any) {
      alert(`Seed failed: ${e.message}`);
    } finally {
      setSeeding(false);
    }
  };

  const handleToggleOffline = async () => {
    if (!syncStatus || togglingOffline) return;
    setTogglingOffline(true);
    try {
      await api.toggleOfflineSimulation(!syncStatus.offline_simulation);
      await fetchStatus();
    } catch (e: any) {
      alert(`Simulation toggle failed: ${e.message}`);
    } finally {
      setTogglingOffline(false);
    }
  };

  const navItems = [
    { href: "/", label: "Overview", icon: Brain, badge: null },
    {
      href: "/memories",
      label: "Memories",
      icon: HardDrive,
      badge: metrics?.total_active_memories ? `${metrics.total_active_memories}` : null,
    },
    { href: "/search", label: "Semantic Search", icon: Search, badge: "BGE-v1.5" },
    {
      href: "/sync",
      label: "Sync Center",
      icon: RefreshCw,
      badge: syncStatus?.pending_jobs_count ? `${syncStatus.pending_jobs_count} queue` : null,
      badgeColor: syncStatus?.pending_jobs_count ? "text-amber-400 bg-amber-500/10 border-amber-500/30" : undefined,
    },
    {
      href: "/conflicts",
      label: "Consensus",
      icon: GitCompare,
      badge: metrics?.open_conflicts_count ? `${metrics.open_conflicts_count} review` : null,
      badgeColor: metrics?.open_conflicts_count ? "text-rose-400 bg-rose-500/10 border-rose-500/30" : undefined,
    },
    { href: "/devices", label: "Device Mesh", icon: Smartphone, badge: "Cluster" },
    { href: "/activity", label: "Audit Telemetry", icon: Activity, badge: null },
    { href: "/settings", label: "Engine Config", icon: Settings, badge: null },
  ];

  const isOnline = syncStatus ? syncStatus.is_online : true;

  return (
    <aside className="w-64 glass-panel border-r border-white/10 flex flex-col justify-between h-screen fixed left-0 top-0 z-40 select-none shadow-2xl">
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Brand Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/20">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-glow transition group-hover:scale-105">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-extrabold tracking-tight text-white flex items-center gap-1.5 text-base">
                <span>E-MEMBRO</span>
                <span className="text-[9px] font-mono tracking-widest px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-semibold">
                  EDGE
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono tracking-tight flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Autonomous Engine
              </div>
            </div>
          </Link>
        </div>

        {/* Live Connectivity Banner & Quick Toggle */}
        <div className="px-4 py-3 bg-black/40 border-b border-white/5 flex items-center justify-between">
          <button
            onClick={handleToggleOffline}
            disabled={togglingOffline}
            className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl border text-xs transition group cursor-pointer ${
              isOnline
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                : "bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25"
            }`}
            title="Click to toggle offline simulation"
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-medium text-[11px]">Mesh Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span className="font-medium text-[11px]">Simulating Offline</span>
              </>
            )}
          </button>

          <span className="text-[11px] font-mono text-slate-400 px-2 py-0.5 bg-white/5 rounded-lg border border-white/5">
            {syncStatus?.pending_jobs_count ?? 0} queued
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-1 overflow-y-auto flex-1 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all duration-200 group ${
                  active
                    ? "bg-gradient-to-r from-cyan-500/20 to-indigo-500/10 text-cyan-300 font-semibold border border-cyan-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition duration-200 ${
                      active
                        ? "text-cyan-400 scale-110"
                        : "text-slate-400 group-hover:text-slate-200 group-hover:scale-105"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                      item.badgeColor ||
                      (active
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/30"
                        : "bg-white/5 text-slate-400 border-white/10")
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer System Telemetry & Seed Control */}
      <div className="p-4 border-t border-white/10 bg-black/40 space-y-3">
        {/* Hardware Status Tile */}
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Node Alpha</span>
          </div>
          <span className="text-emerald-400 flex items-center gap-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Active
          </span>
        </div>

        {/* Demo Seed Action Button */}
        <button
          onClick={handleSeed}
          disabled={seeding}
          className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white flex items-center justify-center gap-2 transition duration-200 shadow-glow disabled:opacity-50 cursor-pointer active:scale-95"
        >
          <PlayCircle className="w-4 h-4" />
          {seeding ? "Injecting Scenario..." : seedSuccess ? "Scenario Loaded!" : "Seed Demo Scenario"}
        </button>

        <div className="text-[10px] text-center text-slate-500 font-mono tracking-tight">
          E-MEMBRO Edge v1.0.0 • Offline-First
        </div>
      </div>
    </aside>
  );
}
