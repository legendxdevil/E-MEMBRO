"use client";

import React, { useEffect, useState } from "react";
import {
  PlayCircle,
  Shield,
  Wifi,
  WifiOff,
  Pause,
  Play,
  Cpu,
  Database,
  CheckCircle2,
  Sparkles,
  Server
} from "lucide-react";
import { api, SyncStatus } from "../../lib/api";

export default function SettingsPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [health, setHealth] = useState<{ status: string; app: string; version: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  const loadSettingsData = async () => {
    try {
      const [st, h] = await Promise.all([
        api.getSyncStatus().catch(() => null),
        api.getHealth().catch(() => null),
      ]);
      if (st) setSyncStatus(st);
      if (h) setHealth(h);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  const handleToggleOffline = async () => {
    if (!syncStatus) return;
    try {
      await api.toggleOfflineSimulation(!syncStatus.offline_simulation);
      loadSettingsData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleSync = async () => {
    if (!syncStatus) return;
    try {
      await api.toggleSync(!syncStatus.sync_enabled);
      loadSettingsData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    setSeedResult(null);
    try {
      await api.seedDemo();
      setSeedResult(`Demo scenario seeded! Device A memories indexed & synced; conflicting Gate 3 update from Device B resolved.`);
      loadSettingsData();
    } catch (e: any) {
      setSeedResult(`Error seeding demo: ${e.message}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/10 glow-border">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 font-semibold">
            Engine Configuration
          </span>
          <span className="text-slate-500">•</span>
          <span className="text-xs font-mono text-emerald-400">Node Alpha • Core v1.0.0</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
          Platform Configuration & Telemetry
        </h1>
        <p className="text-xs md:text-sm text-slate-400 font-light mt-1">
          Network partition simulation, selective cloud dispatch policies, and reproducible scenario triggers.
        </p>
      </div>

      {/* Demo Scenario Runner Card */}
      <div className="glass-panel-elevated rounded-3xl p-8 border border-cyan-500/30 glow-border space-y-4 shadow-glow">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2 max-w-lg">
            <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Autonomous Verification
            </div>
            <h3 className="text-xl font-bold text-white">
              Inject Multi-Device Demo Scenario
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-light">
              Populates opposing &ldquo;Gate 3&rdquo; states across Device A and Device B, indexes Normal & Private memories, and executes semantic consensus resolution.
            </p>
          </div>

          <button
            onClick={handleSeedDemo}
            disabled={seeding}
            className="px-6 py-3 rounded-2xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 text-white shadow-glow transition flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <PlayCircle className="w-4 h-4" />
            {seeding ? "Injecting Scenario..." : "Run Demo Scenario"}
          </button>
        </div>

        {seedResult && (
          <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{seedResult}</span>
          </div>
        )}
      </div>

      {/* Sync & Connectivity Controls */}
      <div className="glass-panel rounded-3xl p-8 space-y-6 border border-white/10 shadow-2xl">
        <h3 className="text-lg font-bold text-white border-b border-white/10 pb-3 flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          Network Partition & Dispatch Rules
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-white/5">
          <div>
            <div className="font-semibold text-white text-sm">Offline Network Partition Simulation</div>
            <div className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed font-light">
              Simulates physical disconnection. Vector embeddings, dense semantic retrieval, and queue persistence operate 100% autonomously.
            </div>
          </div>
          <button
            onClick={handleToggleOffline}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition shrink-0 cursor-pointer ${
              syncStatus?.offline_simulation
                ? "bg-amber-500/15 text-amber-300 border-amber-500/30 shadow-glow"
                : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10"
            }`}
          >
            {syncStatus?.offline_simulation ? "Simulating Offline (Active)" : "Online (Normal)"}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-white/5">
          <div>
            <div className="font-semibold text-white text-sm">Selective Cloud Dispatch Engine</div>
            <div className="text-xs text-slate-400 mt-1 max-w-md leading-relaxed font-light">
              When paused, all outbound sync jobs are safely buffered in the local SQLite queue without data loss.
            </div>
          </div>
          <button
            onClick={handleToggleSync}
            className={`px-4 py-2 rounded-xl text-xs font-semibold border transition shrink-0 cursor-pointer ${
              syncStatus?.sync_enabled
                ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30 shadow-glow-emerald"
                : "bg-white/5 text-slate-400 border-white/10 hover:bg-white/10"
            }`}
          >
            {syncStatus?.sync_enabled ? "Dispatcher Active" : "Dispatcher Paused"}
          </button>
        </div>

        {/* System Architecture Specifications */}
        <div className="pt-2 space-y-3">
          <h4 className="text-xs font-mono uppercase tracking-wider text-slate-500">
            Node Specifications
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
              <span className="text-slate-500 block mb-1">Vector Storage</span>
              <span className="text-white font-medium">Qdrant Embedded (384d Cosine)</span>
            </div>
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
              <span className="text-slate-500 block mb-1">Embedding Neural Model</span>
              <span className="text-cyan-400 font-medium">BAAI/bge-small-en-v1.5</span>
            </div>
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
              <span className="text-slate-500 block mb-1">Primary Relational Store</span>
              <span className="text-emerald-400 font-medium">SQLite 3 (WAL Mode)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
