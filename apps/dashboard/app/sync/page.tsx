"use client";

import React, { useEffect, useState } from "react";
import {
  RefreshCw,
  Wifi,
  WifiOff,
  Pause,
  Play,
  RotateCcw,
  CheckCircle,
  Lock,
  Layers,
  ZapOff,
  Clock,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { api, SyncStatus, SyncJob } from "../../lib/api";

export default function SyncCenterPage() {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [jobs, setJobs] = useState<SyncJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "succeeded" | "failed" | "blocked">("pending");

  const loadSyncData = async () => {
    try {
      const [st, j] = await Promise.all([
        api.getSyncStatus().catch(() => null),
        api.listSyncJobs().catch(() => []),
      ]);
      if (st) setStatus(st);
      if (j) setJobs(j);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSyncData();
    const interval = setInterval(loadSyncData, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleDrainQueue = async () => {
    setActionLoading(true);
    try {
      const res = await api.processSyncQueue();
      alert(`Sync process completed: ${res.message || "Processed jobs successfully."}`);
      loadSyncData();
    } catch (e: any) {
      alert(`Sync process failed: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleOffline = async () => {
    if (!status) return;
    try {
      await api.toggleOfflineSimulation(!status.offline_simulation);
      loadSyncData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleToggleSync = async () => {
    if (!status) return;
    try {
      await api.toggleSync(!status.sync_enabled);
      loadSyncData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRetryJob = async (jobId: string) => {
    try {
      await api.retrySyncJob(jobId);
      loadSyncData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filteredJobs = jobs.filter((j) => {
    if (activeTab === "pending") return j.status === "pending" || j.status === "processing";
    if (activeTab === "succeeded") return j.status === "succeeded";
    if (activeTab === "failed") return j.status === "failed";
    if (activeTab === "blocked") return j.status === "blocked";
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-3xl p-6 md:p-8 border border-white/10 glow-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 font-semibold">
              Replication Pipeline
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs font-mono text-emerald-400">Zero Leakage Air-Gap Policy</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Selective Sync Center
          </h1>
          <p className="text-xs md:text-sm text-slate-400 font-light mt-1">
            Durable SQLite queue with exponential backoff and guaranteed local isolation for private data.
          </p>
        </div>

        {/* Global Sync Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleToggleOffline}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition cursor-pointer ${
              status?.offline_simulation
                ? "bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-glow"
                : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
            }`}
          >
            {status?.offline_simulation ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                Simulating Offline
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                Simulate Offline
              </>
            )}
          </button>

          <button
            onClick={handleToggleSync}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition cursor-pointer"
          >
            {status?.sync_enabled ? (
              <>
                <Pause className="w-3.5 h-3.5 text-slate-400" />
                Pause Sync
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-400" />
                Resume Sync
              </>
            )}
          </button>

          <button
            onClick={handleDrainQueue}
            disabled={actionLoading || !status?.is_online || !status?.sync_enabled}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 text-white shadow-glow transition disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} />
            Drain Queue
          </button>
        </div>
      </div>

      {/* Circuit Breaker Alert Banner */}
      {status?.circuit_breaker_open && (
        <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between shadow-glow">
          <div className="flex items-center gap-2.5">
            <ZapOff className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold">Circuit Breaker is OPEN.</span> Upstream failures detected. Queue processing cooling down.
            </div>
          </div>
        </div>
      )}

      {/* Sync Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel rounded-3xl p-6 border border-white/10">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Queue Status</span>
          <div className="mt-3 text-3xl font-extrabold text-white tracking-tight">
            {status?.pending_jobs_count ?? 0} <span className="text-xs font-mono text-cyan-400 font-normal">pending</span>
          </div>
          <div className="text-xs text-slate-500 mt-3 pt-2 border-t border-white/5 font-mono">
            Priority FIFO processing
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6 border border-white/10">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Succeeded Jobs</span>
          <div className="mt-3 text-3xl font-extrabold text-emerald-400 tracking-tight">
            {status?.succeeded_jobs_count ?? 0} <span className="text-xs font-mono text-emerald-500 font-normal">synced</span>
          </div>
          <div className="text-xs text-slate-500 mt-3 pt-2 border-t border-white/5 font-mono">
            Upstream verified
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6 border border-white/10">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Failed / Retrying</span>
          <div className="mt-3 text-3xl font-extrabold text-amber-400 tracking-tight">
            {status?.failed_jobs_count ?? 0} <span className="text-xs font-mono text-amber-500 font-normal">in retry</span>
          </div>
          <div className="text-xs text-slate-500 mt-3 pt-2 border-t border-white/5 font-mono">
            Exponential backoff + jitter
          </div>
        </div>

        <div className="glass-panel rounded-3xl p-6 border border-white/10">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Air-Gapped Private</span>
          <div className="mt-3 text-3xl font-extrabold text-rose-400 tracking-tight">
            {status?.blocked_private_count ?? 0} <span className="text-xs font-mono text-rose-500 font-normal">retained</span>
          </div>
          <div className="text-xs text-slate-500 mt-3 pt-2 border-t border-white/5 font-mono">
            Never leaves device
          </div>
        </div>
      </div>

      {/* Queue Tabs and Table */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        {/* Navigation Tabs */}
        <div className="border-b border-white/10 p-4 flex flex-wrap items-center justify-between gap-3 bg-black/30">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                activeTab === "pending"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Pending ({status?.pending_jobs_count ?? 0})
            </button>
            <button
              onClick={() => setActiveTab("succeeded")}
              className={`px-4 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                activeTab === "succeeded"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Succeeded ({status?.succeeded_jobs_count ?? 0})
            </button>
            <button
              onClick={() => setActiveTab("failed")}
              className={`px-4 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                activeTab === "failed"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Failed ({status?.failed_jobs_count ?? 0})
            </button>
            <button
              onClick={() => setActiveTab("blocked")}
              className={`px-4 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                activeTab === "blocked"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              Blocked Private ({status?.blocked_private_count ?? 0})
            </button>
          </div>

          <div className="text-xs font-mono text-slate-500">
            Node: {status?.active_device_id ? status.active_device_id.slice(0, 16) + "..." : "Local Node"}
          </div>
        </div>

        {/* Tab Content List */}
        <div className="divide-y divide-white/5">
          {filteredJobs.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <Layers className="w-8 h-8 text-slate-600 mx-auto" />
              <div className="text-slate-400 text-xs font-mono">No {activeTab} sync jobs in queue.</div>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div key={job.id} className="p-6 hover:bg-white/[0.02] transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded-md uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                      {job.operation}
                    </span>
                    <span
                      className={`text-[11px] font-mono px-2.5 py-0.5 rounded-md ${
                        job.priority === "high"
                          ? "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                          : "bg-white/5 text-slate-400 border border-white/10"
                      }`}
                    >
                      {job.priority} Priority
                    </span>
                    <span className="text-xs font-mono text-slate-500">
                      ID: {job.id.slice(0, 8)}...
                    </span>
                  </div>

                  <div className="text-xs font-mono text-slate-400">
                    Memory Ref: <span className="text-white">{job.memory_id}</span>
                  </div>

                  {job.last_error && (
                    <div className="text-xs font-mono text-amber-300 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 max-w-xl">
                      Error: {job.last_error}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
                    <span>Attempts: {job.attempt_count}</span>
                    <span>Created: {new Date(job.created_at).toLocaleTimeString()}</span>
                    {job.next_attempt_at && (
                      <span className="text-amber-400">
                        Next: {new Date(job.next_attempt_at).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Job Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {job.status === "failed" && (
                    <button
                      onClick={() => handleRetryJob(job.id)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Retry Now
                    </button>
                  )}
                  {job.status === "blocked" && (
                    <span className="text-xs font-mono text-rose-300 flex items-center gap-1.5 bg-rose-500/15 px-3 py-1 rounded-xl border border-rose-500/30">
                      <Lock className="w-3.5 h-3.5 text-rose-400" />
                      Policy Protected
                    </span>
                  )}
                  {job.status === "succeeded" && (
                    <span className="text-xs font-mono text-emerald-300 flex items-center gap-1.5 bg-emerald-500/15 px-3 py-1 rounded-xl border border-emerald-500/30">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      Synced
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
