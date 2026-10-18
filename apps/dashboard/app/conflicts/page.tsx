"use client";

import React, { useEffect, useState } from "react";
import {
  GitCompare,
  CheckCircle,
  AlertTriangle,
  Clock,
  Smartphone,
  Shield,
  ArrowRight,
  Sparkles
} from "lucide-react";
import { api, ConflictRecord } from "../../lib/api";
import { StatusBadge } from "../../components/Badges";

export default function ConflictViewerPage() {
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState<string>("");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const loadConflicts = async () => {
    try {
      const data = await api.listConflicts(filterState || undefined);
      setConflicts(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConflicts();
    const interval = setInterval(loadConflicts, 5000);
    return () => clearInterval(interval);
  }, [filterState]);

  const handleResolve = async (conflictId: string, decision: "a_wins" | "b_wins", reason: string) => {
    setResolvingId(conflictId);
    try {
      await api.resolveConflict(conflictId, {
        decision,
        decision_reason: reason,
      });
      loadConflicts();
    } catch (e: any) {
      alert(`Resolution failed: ${e.message}`);
    } finally {
      setResolvingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-3xl p-6 md:p-8 border border-white/10 glow-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 font-semibold">
              Consensus Engine
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs font-mono text-slate-400">Deterministic LWW + Semantic Reasoning</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Conflict & Consensus Center
          </h1>
          <p className="text-xs md:text-sm text-slate-400 font-light mt-1">
            Audits opposing conditions across distributed edge nodes, maintains version lineages, and explains automatic consensus.
          </p>
        </div>

        {/* Filter State */}
        <div className="flex items-center gap-2">
          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="glass-input rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="">All Conflicts</option>
            <option value="needs_review">Needs Review</option>
            <option value="resolved">Resolved</option>
            <option value="candidate">Candidates</option>
          </select>
        </div>
      </div>

      {/* Conflict Records List */}
      {loading ? (
        <div className="py-24 text-center text-slate-400 text-xs font-mono">Loading consensus telemetry records...</div>
      ) : conflicts.length === 0 ? (
        <div className="glass-panel rounded-3xl p-16 text-center space-y-3 border border-white/10">
          <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
          <div className="text-white text-lg font-bold">No active conflicts detected</div>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            All registered memories are currently consistent across the cluster mesh. When conflicting statements arrive from different devices (such as &ldquo;open&rdquo; vs &ldquo;closed&rdquo;), automated resolution traces will display here.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {conflicts.map((c) => {
            const isResolved = c.state === "resolved";
            const memA = c.memory_a;
            const memB = c.memory_b;

            return (
              <div
                key={c.id}
                className="glass-panel rounded-3xl p-7 border border-white/10 space-y-6 shadow-2xl hover:border-cyan-500/30 transition glow-border"
              >
                {/* Conflict Metadata Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20">
                      ID: {c.id.slice(0, 8)}...
                    </span>
                    <span
                      className={`text-xs px-3 py-0.5 rounded-full font-mono ${
                        isResolved
                          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold animate-pulse"
                      }`}
                    >
                      {isResolved ? "Resolved" : "Needs Review"}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Type: {c.conflict_type}
                    </span>
                  </div>

                  <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    Detected: {new Date(c.created_at).toLocaleString()}
                  </div>
                </div>

                {/* Side-by-Side Version Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Memory Version A */}
                  <div
                    className={`p-5 rounded-2xl border space-y-3 transition ${
                      c.decision === "a_wins"
                        ? "bg-cyan-500/10 border-cyan-500/40 shadow-glow"
                        : "bg-black/30 border-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                          Version A (Device A)
                        </span>
                        {c.decision === "a_wins" && (
                          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/30 font-bold">
                            AUTHORITATIVE WINNER
                          </span>
                        )}
                      </div>
                      {memA && <StatusBadge status={memA.status} />}
                    </div>

                    <p className="text-sm font-sans text-slate-100 bg-black/40 p-4 rounded-xl border border-white/5 leading-relaxed">
                      {memA ? memA.text : "Memory content not available"}
                    </p>

                    <div className="text-xs font-mono text-slate-400 space-y-1 pt-1">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Timestamp: {memA ? new Date(memA.created_at).toLocaleString() : "N/A"}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                        Device: {memA?.device_id ? memA.device_id.slice(0, 16) + "..." : "Device A"}
                      </div>
                    </div>
                  </div>

                  {/* Memory Version B */}
                  <div
                    className={`p-5 rounded-2xl border space-y-3 transition ${
                      c.decision === "b_wins"
                        ? "bg-cyan-500/10 border-cyan-500/40 shadow-glow"
                        : "bg-black/30 border-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold">
                          Version B (Device B)
                        </span>
                        {c.decision === "b_wins" && (
                          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/30 font-bold">
                            AUTHORITATIVE WINNER
                          </span>
                        )}
                      </div>
                      {memB && <StatusBadge status={memB.status} />}
                    </div>

                    <p className="text-sm font-sans text-slate-100 bg-black/40 p-4 rounded-xl border border-white/5 leading-relaxed">
                      {memB ? memB.text : "Memory content not available"}
                    </p>

                    <div className="text-xs font-mono text-slate-400 space-y-1 pt-1">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Timestamp: {memB ? new Date(memB.created_at).toLocaleString() : "N/A"}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                        Device: {memB?.device_id ? memB.device_id.slice(0, 16) + "..." : "Device B"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resolution Policy & Decision Reason Panel */}
                <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 space-y-1.5 font-mono">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold uppercase tracking-wider text-cyan-400">
                      Applied Resolution Trace
                    </span>
                    <span className="text-slate-300">
                      Decision: <span className="font-bold uppercase text-cyan-300">{c.decision}</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-sans font-light">
                    {c.decision_reason}
                  </p>
                </div>

                {/* Manual Resolution Controls */}
                {!isResolved && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <span className="text-xs text-amber-300 flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      Ambiguous conflict requires operator review
                    </span>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleResolve(c.id, "a_wins", "Operator manually selected Version A as authoritative.")}
                        disabled={resolvingId === c.id}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition cursor-pointer"
                      >
                        Accept Version A
                      </button>
                      <button
                        onClick={() => handleResolve(c.id, "b_wins", "Operator manually selected Version B as authoritative.")}
                        disabled={resolvingId === c.id}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 text-white shadow-glow transition cursor-pointer"
                      >
                        Accept Version B
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
