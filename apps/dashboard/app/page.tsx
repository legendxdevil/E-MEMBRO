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
} from "lucide-react";
import { api, Metrics, ActivityEvent } from "../lib/api";

export default function OverviewPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentEvents, setRecentEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [m, act] = await Promise.all([api.getMetrics(), api.listActivity(undefined, 8)]);
      setMetrics(m);
      setRecentEvents(act);
    } catch (e) {
      console.error("Failed to load overview data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-12 animate-in fade-in duration-300">
      {/* Editorial Hero Header */}
      <div className="pt-2 pb-6 border-b border-hairline flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div className="max-w-3xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider text-ash-gray font-normal">
              Autonomous Intelligence
            </span>
            <span className="text-ash-gray text-xs">•</span>
            <span className="text-xs text-sienna font-medium bg-peach px-2.5 py-0.5 rounded-full">
              Edge Node Active
            </span>
          </div>
          <h1 className="font-serif text-4xl lg:text-5xl font-normal tracking-tight text-ink leading-tight">
            Local memory with <span className="italic">quiet</span> offline authority.
          </h1>
          <p className="text-base text-slate-gray leading-relaxed max-w-2xl">
            A zero-latency memory architecture for edge computing. Vectors are computed locally on device,
            retrieval runs completely offline, and cloud sync respects strict privacy boundaries.
          </p>
        </div>

        {/* Action Pair: Filled Pill & Ghost Pill */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/search"
            className="px-5 py-2.5 rounded-full text-sm font-normal text-ink border border-hairline hover:bg-mist transition flex items-center gap-2 bg-paper shadow-sm"
          >
            <Search className="w-4 h-4 text-slate-gray" />
            Semantic Search
          </Link>
          <Link
            href="/memories"
            className="px-5 py-2.5 rounded-full text-sm font-normal bg-ink text-paper hover:bg-ink/85 transition flex items-center gap-2"
          >
            <Brain className="w-4 h-4 text-paper" />
            Manage Memories
          </Link>
        </div>
      </div>

      {/* Primary KPI Grid: Floating White Artifacts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
        {/* Active Memories */}
        <div className="bg-paper border border-hairline rounded-3xl p-6 shadow-artifact hover:border-slate-gray/30 transition flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-ash-gray font-normal">
                Total Active
              </span>
              <div className="w-8 h-8 rounded-full bg-mist flex items-center justify-center text-ink">
                <Brain className="w-4 h-4 text-slate-gray" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-serif text-ink tracking-tight font-normal">
                {metrics?.total_active_memories ?? 0}
              </span>
              <span className="text-xs text-slate-gray">records</span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-hairline flex items-center justify-between text-xs text-slate-gray">
            <span>Archived: {metrics?.archived_memories_count ?? 0}</span>
            <span>Superseded: {metrics?.superseded_memories_count ?? 0}</span>
          </div>
        </div>

        {/* Important (High Priority) */}
        <div className="bg-paper border border-hairline rounded-3xl p-6 shadow-artifact hover:border-slate-gray/30 transition flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-ash-gray font-normal">
                Important
              </span>
              <div className="w-8 h-8 rounded-full bg-peach flex items-center justify-center text-sienna">
                <AlertTriangle className="w-4 h-4 text-sienna" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-serif text-ink tracking-tight font-normal">
                {metrics?.important_memories_count ?? 0}
              </span>
              <span className="text-xs text-sienna font-medium">priority</span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-hairline flex items-center text-xs text-slate-gray">
            <span>Immediate cloud synchronization</span>
          </div>
        </div>

        {/* Private (Local Only) */}
        <div className="bg-paper border border-hairline rounded-3xl p-6 shadow-artifact hover:border-slate-gray/30 transition flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-ash-gray font-normal">
                Private
              </span>
              <div className="w-8 h-8 rounded-full bg-mist flex items-center justify-center text-ink">
                <Lock className="w-4 h-4 text-slate-gray" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-serif text-ink tracking-tight font-normal">
                {metrics?.private_memories_count ?? 0}
              </span>
              <span className="text-xs text-ash-gray">local-only</span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-hairline flex items-center text-xs text-slate-gray">
            <span>Air-gapped on edge disk</span>
          </div>
        </div>

        {/* Pending Sync Queue */}
        <div className="bg-paper border border-hairline rounded-3xl p-6 shadow-artifact hover:border-slate-gray/30 transition flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-ash-gray font-normal">
                Sync Queue
              </span>
              <div className="w-8 h-8 rounded-full bg-mist flex items-center justify-center text-ink">
                <RefreshCw className="w-4 h-4 text-slate-gray" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl font-serif text-ink tracking-tight font-normal">
                {metrics?.pending_sync_jobs ?? 0}
              </span>
              <span className="text-xs text-slate-gray">pending</span>
            </div>
          </div>
          <div className="mt-5 pt-3 border-t border-hairline flex items-center justify-between text-xs text-slate-gray">
            <span>Synced: {metrics?.total_sync_completed ?? 0}</span>
            <span>Failed: {metrics?.failed_sync_jobs ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Editorial Accent Spotlight Card (Peach Wash) */}
      <div className="bg-peach rounded-3xl p-8 lg:p-10 text-sienna flex flex-col md:flex-row md:items-center justify-between gap-8 border border-peach/50">
        <div className="space-y-3 max-w-2xl">
          <div className="text-xs uppercase tracking-widest font-medium text-sienna/80">
            Cryptographic & Privacy Protocol
          </div>
          <h2 className="font-serif text-2xl lg:text-3xl font-normal tracking-tight text-sienna">
            Local vector retrieval that <span className="italic">never</span> leaks confidential memory.
          </h2>
          <p className="text-sm lg:text-base text-sienna/85 leading-relaxed">
            Private memories are tagged with <code className="bg-sienna/10 px-2 py-0.5 rounded text-xs">local_only</code> and filtered out before any payload enters the replication pipeline. Even when connected to the internet, raw sensitive vectors remain strictly on edge storage.
          </p>
        </div>
        <div className="shrink-0 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <Link
            href="/sync"
            className="px-6 py-2.5 rounded-full text-sm font-normal bg-sienna text-paper hover:bg-sienna/90 transition shadow-sm"
          >
            Inspect Sync Engine
          </Link>
          <Link
            href="/conflicts"
            className="px-5 py-2.5 rounded-full text-sm font-normal text-sienna border border-sienna/40 hover:bg-sienna/10 transition"
          >
            Conflict Protocols →
          </Link>
        </div>
      </div>

      {/* Neutral Content Surfaces & Observability */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        {/* Edge Node Status */}
        <div className="bg-mist rounded-3xl p-7 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif text-xl font-normal text-ink">Edge Node Architecture</h3>
              {metrics?.is_online ? (
                <span className="flex items-center gap-1.5 text-xs text-ink bg-paper px-3 py-1 rounded-full border border-hairline shadow-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Online
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-sienna bg-peach px-3 py-1 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-sienna" />
                  Offline Mode
                </span>
              )}
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center py-2.5 border-b border-hairline">
                <span className="text-slate-gray">Local Vector Store</span>
                <span className="font-sans text-ink font-medium">Qdrant Edge (384d Cosine)</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-hairline">
                <span className="text-slate-gray">Embedding Engine</span>
                <span className="font-sans text-ink font-medium">FastEmbed (bge-small-en)</span>
              </div>
              <div className="flex justify-between items-center py-2.5 border-b border-hairline">
                <span className="text-slate-gray">Active Conflicts</span>
                <span className="text-sienna font-medium">
                  {metrics?.open_conflicts_count ?? 0} open
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-slate-gray">Resolved Conflicts</span>
                <span className="text-ink font-medium">
                  {metrics?.resolved_conflicts_count ?? 0} resolved
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-hairline">
            <Link
              href="/conflicts"
              className="text-xs text-ink hover:underline flex items-center justify-between group font-medium"
            >
              <span>Review Conflict Decisions</span>
              <span className="group-hover:translate-x-1 transition text-slate-gray">→</span>
            </Link>
          </div>
        </div>

        {/* Local Search Performance */}
        <div className="bg-mist rounded-3xl p-7 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-serif text-xl font-normal text-ink">Search Latency</h3>
              <div className="w-7 h-7 rounded-full bg-paper flex items-center justify-center border border-hairline">
                <TrendingUp className="w-3.5 h-3.5 text-slate-gray" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5 my-4">
              <div className="p-4 bg-paper rounded-2xl border border-hairline flex flex-col justify-between shadow-subtle">
                <div className="text-xs text-slate-gray">Last Query</div>
                <div className="text-2xl font-serif text-ink mt-2">
                  {metrics?.last_search_latency_ms ?? 0} <span className="text-xs font-sans text-slate-gray font-normal">ms</span>
                </div>
              </div>
              <div className="p-4 bg-paper rounded-2xl border border-hairline flex flex-col justify-between shadow-subtle">
                <div className="text-xs text-slate-gray">Avg (50 calls)</div>
                <div className="text-2xl font-serif text-ink mt-2">
                  {metrics?.average_search_latency_ms ?? 0} <span className="text-xs font-sans text-slate-gray font-normal">ms</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-gray leading-relaxed mt-4">
              FastEmbed generates dense vectors locally in CPU memory. Top-k cosine similarity queries are resolved without external API round-trips.
            </p>
          </div>

          <div className="mt-8 pt-4 border-t border-hairline">
            <Link
              href="/search"
              className="text-xs text-ink hover:underline flex items-center justify-between group font-medium"
            >
              <span>Try Natural Language Search</span>
              <span className="group-hover:translate-x-1 transition text-slate-gray">→</span>
            </Link>
          </div>
        </div>

        {/* Recent Audit Events */}
        <div className="bg-mist rounded-3xl p-7 flex flex-col justify-between h-full">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl font-normal text-ink">Recent Audit Feed</h3>
              <span className="text-[11px] text-ash-gray uppercase tracking-wider">Live</span>
            </div>

            <div className="space-y-3 overflow-hidden">
              {recentEvents.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-gray">No activity recorded yet.</div>
              ) : (
                recentEvents.slice(0, 5).map((ev) => (
                  <div key={ev.id} className="text-xs flex items-center justify-between gap-3 py-2 border-b border-hairline last:border-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-ink shrink-0" />
                      <span className="text-ink font-normal truncate">
                        {ev.event_type}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-gray shrink-0 font-sans">
                      {new Date(ev.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-hairline">
            <Link
              href="/activity"
              className="text-xs text-ink hover:underline flex items-center justify-between group font-medium"
            >
              <span>View Full Privacy-Safe Audit Log</span>
              <span className="group-hover:translate-x-1 transition text-slate-gray">→</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
