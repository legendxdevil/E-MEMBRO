"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Brain,
  Search,
  Lock,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  Plus,
  Zap,
  Globe,
  Database,
  ArrowUpRight,
  Activity,
  HardDrive,
  Smartphone
} from "lucide-react";
import { api, Metrics, ActivityEvent } from "../lib/api";
import CreateMemoryModal from "../components/CreateMemoryModal";

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentEvents, setRecentEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [drainingQueue, setDrainingQueue] = useState(false);
  const [queueMessage, setQueueMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [m, act] = await Promise.all([
        api.getMetrics().catch(() => null),
        api.listActivity(undefined, 8).catch(() => []),
      ]);
      if (m) setMetrics(m);
      if (act) setRecentEvents(act);
    } catch (e) {
      console.error("Failed to load overview data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleDrainQueue = async () => {
    setDrainingQueue(true);
    try {
      const res = await api.processSyncQueue();
      setQueueMessage(res.message || "Queue drained successfully");
      setTimeout(() => setQueueMessage(null), 4000);
      loadData();
    } catch (e: any) {
      alert(`Drain failed: ${e.message}`);
    } finally {
      setDrainingQueue(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Editorial Cyber Hero Header */}
      <div className="relative overflow-hidden rounded-3xl glass-panel-elevated p-8 md:p-10 border border-white/10 glow-border">
        {/* Ambient Backlight Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/15 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                Autonomous Edge Cluster
              </span>
              <span className="text-slate-500 text-xs">•</span>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1 rounded-full font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Zero-Cloud Latency
              </span>
              <span className="text-slate-500 text-xs">•</span>
              <span className="text-[11px] font-mono text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full font-medium">
                FastEmbed BGE-v1.5 (384d)
              </span>
            </div>

            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Quiet Offline Authority with{" "}
              <span className="text-gradient-cyan">Selective Sync</span>
            </h1>

            <p className="text-sm md:text-base text-slate-300 leading-relaxed max-w-2xl font-light">
              An offline-first neural memory fabric designed for edge hardware. Embeddings are generated on-device, queries resolve in sub-20ms with no internet connection, and selective replication preserves strict data confidentiality.
            </p>
          </div>

          {/* Action Triggers */}
          <div className="flex flex-wrap lg:flex-col gap-3 shrink-0">
            <button
              onClick={() => setModalOpen(true)}
              className="px-6 py-3 rounded-2xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-glow transition duration-200 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Record Edge Memory
            </button>

            <Link
              href="/search"
              className="px-6 py-3 rounded-2xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition duration-200 flex items-center justify-center gap-2 hover:border-cyan-500/30"
            >
              <Search className="w-4 h-4 text-cyan-400" />
              Semantic Search HUD
            </Link>

            <button
              onClick={handleDrainQueue}
              disabled={drainingQueue}
              className="px-6 py-3 rounded-2xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition duration-200 flex items-center justify-center gap-2 hover:border-emerald-500/30 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 text-emerald-400 ${drainingQueue ? "animate-spin" : ""}`} />
              {drainingQueue ? "Draining..." : queueMessage || "Drain Sync Queue"}
            </button>
          </div>
        </div>
      </div>

      {/* Interactive System Pipeline Architecture Flow */}
      <div className="glass-panel rounded-3xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-mono uppercase tracking-widest text-slate-300 font-semibold">
              Live Edge Memory Pipeline
            </h2>
          </div>
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            All Pipeline Stages Operational
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
          {/* Stage 1: Hardware Ingestion */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 relative group hover:border-cyan-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Stage 01</span>
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <div className="font-semibold text-sm text-white">Edge Sensor / Client</div>
            <div className="text-[11px] text-slate-400">Node Alpha • REST & Direct</div>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-cyan-300">
              <span>Trust: Level 2</span>
              <span>Audit: On</span>
            </div>
          </div>

          {/* Stage 2: Dense Embedding Engine */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 relative group hover:border-cyan-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Stage 02</span>
              <Brain className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <div className="font-semibold text-sm text-white">FastEmbed BGE-v1.5</div>
            <div className="text-[11px] text-slate-400">Dense 384-Dim Vector</div>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-indigo-300">
              <span>CPU Execution</span>
              <span>100% Offline</span>
            </div>
          </div>

          {/* Stage 3: Local Hybrid Persistence */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 relative group hover:border-cyan-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Stage 03</span>
              <Database className="w-3.5 h-3.5 text-violet-400" />
            </div>
            <div className="font-semibold text-sm text-white">SQLite + Qdrant Edge</div>
            <div className="text-[11px] text-slate-400">Cosine Similarity Index</div>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-violet-300">
              <span>HNSW Local</span>
              <span>Air-Gapped</span>
            </div>
          </div>

          {/* Stage 4: Cryptographic Privacy Gate */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 relative group hover:border-rose-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Stage 04</span>
              <Lock className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="font-semibold text-sm text-white">Privacy Filter Gate</div>
            <div className="text-[11px] text-slate-400">Strict local_only Exclusion</div>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-rose-300">
              <span>Confidential: {metrics?.private_memories_count ?? 0}</span>
              <span>Protected</span>
            </div>
          </div>

          {/* Stage 5: Selective Sync & Consensus */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/5 space-y-2 relative group hover:border-emerald-500/40 transition">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Stage 05</span>
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="font-semibold text-sm text-white">Consensus & Cloud Sync</div>
            <div className="text-[11px] text-slate-400">Deterministic LWW + Review</div>
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-emerald-300">
              <span>{metrics?.total_sync_completed ?? 0} Synced</span>
              <span>{metrics?.open_conflicts_count ?? 0} Pending</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary KPI Grid: High-Tech Cyber Tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
        {/* KPI 1: Active Edge Memories */}
        <div className="glass-panel rounded-3xl p-6 border border-white/10 hover:border-cyan-500/40 transition-all duration-300 group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Active Edge Memory
              </span>
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition">
                <Brain className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">
                {metrics?.total_active_memories ?? 0}
              </span>
              <span className="text-xs font-mono text-cyan-400">dense vectors</span>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Archived: {metrics?.archived_memories_count ?? 0}</span>
            <span>Superseded: {metrics?.superseded_memories_count ?? 0}</span>
          </div>
        </div>

        {/* KPI 2: Important High-Priority Items */}
        <div className="glass-panel rounded-3xl p-6 border border-white/10 hover:border-amber-500/40 transition-all duration-300 group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Important Priority
              </span>
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-amber-300 tracking-tight">
                {metrics?.important_memories_count ?? 0}
              </span>
              <span className="text-xs font-mono text-amber-400">priority tier</span>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Immediate Sync SLA</span>
            <span className="text-amber-400">&lt; 10s priority</span>
          </div>
        </div>

        {/* KPI 3: Air-Gapped Private Memories */}
        <div className="glass-panel rounded-3xl p-6 border border-white/10 hover:border-rose-500/40 transition-all duration-300 group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Air-Gapped Private
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition">
                <Lock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-rose-300 tracking-tight">
                {metrics?.private_memories_count ?? 0}
              </span>
              <span className="text-xs font-mono text-rose-400">local-only</span>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Network Egress Policy</span>
            <span className="text-rose-400 font-semibold">Strict Block</span>
          </div>
        </div>

        {/* KPI 4: Sync Pipeline & Health */}
        <div className="glass-panel rounded-3xl p-6 border border-white/10 hover:border-emerald-500/40 transition-all duration-300 group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Queue & Consensus
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition">
                <RefreshCw className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">
                {metrics?.pending_sync_jobs ?? 0}
              </span>
              <span className="text-xs font-mono text-emerald-400">in queue</span>
            </div>
          </div>

          <div className="mt-6 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Completed: {metrics?.total_sync_completed ?? 0}</span>
            <span className="text-emerald-400">Resolved: {metrics?.resolved_conflicts_count ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Observability & Real-Time Performance Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Card 1: Retrieval Latency Benchmark */}
        <div className="glass-panel rounded-3xl p-7 flex flex-col justify-between border border-white/10">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                <h3 className="font-bold text-base text-white">Retrieval Latency</h3>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                FastEmbed CPU
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3.5 my-4">
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                <div className="text-[11px] font-mono text-slate-400 uppercase">Last Query</div>
                <div className="text-3xl font-extrabold text-white mt-1 font-mono">
                  {metrics?.last_search_latency_ms ?? 0}
                  <span className="text-xs text-cyan-400 ml-1 font-sans">ms</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                <div className="text-[11px] font-mono text-slate-400 uppercase">Avg (50 calls)</div>
                <div className="text-3xl font-extrabold text-white mt-1 font-mono">
                  {metrics?.average_search_latency_ms ?? 0}
                  <span className="text-xs text-cyan-400 ml-1 font-sans">ms</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed mt-2 font-light">
              Cosine vector similarity computed strictly in local RAM. Natural language queries execute autonomously without internet latency or cloud costs.
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5">
            <Link
              href="/search"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center justify-between group"
            >
              <span>Launch Semantic Search Interface</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </Link>
          </div>
        </div>

        {/* Card 2: Consensus Protocol & Device Mesh */}
        <div className="glass-panel rounded-3xl p-7 flex flex-col justify-between border border-white/10">
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                <h3 className="font-bold text-base text-white">Cluster Consensus</h3>
              </div>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                Deterministic
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                <span className="text-slate-400">Open Conflicts</span>
                <span className="text-rose-400 font-bold font-sans flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  {metrics?.open_conflicts_count ?? 0} requires review
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                <span className="text-slate-400">Resolved Consensus</span>
                <span className="text-emerald-400 font-bold font-sans">
                  {metrics?.resolved_conflicts_count ?? 0} auto-resolved
                </span>
              </div>
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                <span className="text-slate-400">Mesh Resolution Rule</span>
                <span className="text-slate-200">Trust-Weight + LWW</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5">
            <Link
              href="/conflicts"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center justify-between group"
            >
              <span>Inspect Conflict Engine</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </Link>
          </div>
        </div>

        {/* Card 3: Real-Time Audit Telemetry Stream */}
        <div className="glass-panel rounded-3xl p-7 flex flex-col justify-between border border-white/10">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="font-bold text-base text-white">Live Audit Telemetry</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Stream
              </span>
            </div>

            <div className="space-y-2.5 overflow-hidden">
              {recentEvents.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 font-mono">No telemetry events recorded yet.</div>
              ) : (
                recentEvents.slice(0, 5).map((ev) => (
                  <div
                    key={ev.id}
                    className="p-2.5 rounded-xl bg-black/30 border border-white/5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" />
                      <span className="font-mono text-slate-200 text-[11px] truncate">
                        {ev.event_type}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/5">
            <Link
              href="/activity"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center justify-between group"
            >
              <span>View Full Privacy Audit Trail</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </Link>
          </div>
        </div>
      </div>

      {/* Modal for Creating Memory */}
      <CreateMemoryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => loadData()}
      />
    </div>
  );
}
