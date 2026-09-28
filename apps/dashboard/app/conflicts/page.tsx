"use client";

import React, { useEffect, useState } from "react";
import {
  GitCompare,
  CheckCircle,
  AlertTriangle,
  Clock,
  Smartphone,
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
      setConflicts(data);
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
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-ash-gray font-normal mb-1">
            Consensus Protocol
          </div>
          <h1 className="font-serif text-3xl lg:text-4xl font-normal tracking-tight text-ink">
            Semantic <span className="italic">Conflict Viewer</span>
          </h1>
          <p className="text-sm text-slate-gray mt-1 max-w-xl">
            Detects opposing conditions across distributed devices, preserves version histories, and explains deterministic decisions.
          </p>
        </div>

        {/* Filter State */}
        <div className="flex items-center gap-2">
          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="bg-mist rounded-full px-4 py-2 text-xs text-ink focus:outline-none cursor-pointer"
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
        <div className="py-24 text-center text-slate-gray text-xs">Loading conflict records...</div>
      ) : conflicts.length === 0 ? (
        <div className="bg-paper border border-hairline rounded-3xl p-16 text-center space-y-3 shadow-artifact">
          <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
          <div className="text-ink font-serif text-xl">No active conflicts detected</div>
          <p className="text-xs text-slate-gray max-w-md mx-auto leading-relaxed">
            All registered memories are currently consistent. When opposing statuses (such as &ldquo;open&rdquo; vs &ldquo;closed&rdquo;) arrive from competing edge nodes, deterministic resolution traces will appear here.
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
                className="bg-paper border border-hairline rounded-3xl p-7 shadow-artifact space-y-6"
              >
                {/* Conflict Metadata Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-ash-gray">
                      ID: {c.id.slice(0, 8)}...
                    </span>
                    <span
                      className={`text-xs px-3 py-0.5 rounded-full font-normal ${
                        isResolved
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-peach text-sienna font-medium animate-pulse"
                      }`}
                    >
                      {isResolved ? "Resolved" : "Needs Review"}
                    </span>
                    <span className="text-xs text-slate-gray">
                      Type: {c.conflict_type}
                    </span>
                  </div>

                  <div className="text-xs text-ash-gray">
                    Detected: {new Date(c.created_at).toLocaleString()}
                  </div>
                </div>

                {/* Side-by-Side Version Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Memory Version A */}
                  <div
                    className={`p-5 rounded-2xl border space-y-3 ${
                      c.decision === "a_wins"
                        ? "bg-fog border-ink shadow-subtle"
                        : "bg-mist border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-ink">
                          Version A (Device A)
                        </span>
                        {c.decision === "a_wins" && (
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                            Authoritative
                          </span>
                        )}
                      </div>
                      {memA && <StatusBadge status={memA.status} />}
                    </div>

                    <p className="text-sm font-sans text-ink bg-paper p-4 rounded-xl border border-hairline leading-relaxed shadow-sm">
                      {memA ? memA.text : "Memory content not available"}
                    </p>

                    <div className="text-xs text-slate-gray space-y-1 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-ash-gray" />
                        Timestamp: {memA ? new Date(memA.created_at).toLocaleString() : "N/A"}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-ash-gray" />
                        Device: {memA?.device_id.slice(0, 16)}...
                      </div>
                    </div>
                  </div>

                  {/* Memory Version B */}
                  <div
                    className={`p-5 rounded-2xl border space-y-3 ${
                      c.decision === "b_wins"
                        ? "bg-fog border-ink shadow-subtle"
                        : "bg-mist border-transparent"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-ink">
                          Version B (Device B)
                        </span>
                        {c.decision === "b_wins" && (
                          <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                            Authoritative
                          </span>
                        )}
                      </div>
                      {memB && <StatusBadge status={memB.status} />}
                    </div>

                    <p className="text-sm font-sans text-ink bg-paper p-4 rounded-xl border border-hairline leading-relaxed shadow-sm">
                      {memB ? memB.text : "Memory content not available"}
                    </p>

                    <div className="text-xs text-slate-gray space-y-1 pt-1">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-ash-gray" />
                        Timestamp: {memB ? new Date(memB.created_at).toLocaleString() : "N/A"}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-ash-gray" />
                        Device: {memB?.device_id.slice(0, 16)}...
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resolution Policy & Decision Reason: Peach Accent Panel */}
                <div className="p-5 rounded-2xl bg-peach/40 border border-peach text-sienna space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium uppercase tracking-wider text-sienna">
                      Applied Resolution Trace
                    </span>
                    <span className="font-mono text-sienna">
                      Decision: <span className="font-bold uppercase">{c.decision}</span>
                    </span>
                  </div>
                  <p className="text-xs text-sienna/90 leading-relaxed">
                    {c.decision_reason}
                  </p>
                </div>

                {/* Manual Resolution Controls */}
                {!isResolved && (
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <span className="text-xs text-sienna flex items-center gap-1.5 font-medium">
                      <AlertTriangle className="w-4 h-4" />
                      Ambiguous conflict requires human approval
                    </span>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => handleResolve(c.id, "a_wins", "Operator manually selected Version A as authoritative.")}
                        disabled={resolvingId === c.id}
                        className="px-5 py-2 rounded-full text-xs font-normal text-ink border border-hairline bg-paper hover:bg-mist transition"
                      >
                        Accept Version A
                      </button>
                      <button
                        onClick={() => handleResolve(c.id, "b_wins", "Operator manually selected Version B as authoritative.")}
                        disabled={resolvingId === c.id}
                        className="px-5 py-2 rounded-full text-xs font-normal bg-ink text-paper hover:bg-ink/85 transition"
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
