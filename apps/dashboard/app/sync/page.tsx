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
  ZapOff
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
      const [st, j] = await Promise.all([api.getSyncStatus(), api.listSyncJobs()]);
      setStatus(st);
      setJobs(j);
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
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-ash-gray font-normal mb-1">
            Replication Protocol
          </div>
          <h1 className="font-serif text-3xl lg:text-4xl font-normal tracking-tight text-ink">
            Selective <span className="italic">Sync Center</span>
          </h1>
          <p className="text-sm text-slate-gray mt-1 max-w-xl">
            Durable SQLite queue with exponential backoff and guaranteed zero leakage for private records.
          </p>
        </div>

        {/* Global Sync Controls: Pill Pair */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleToggleOffline}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-normal border transition ${
              status?.offline_simulation
                ? "bg-peach text-sienna border-peach"
                : "bg-paper text-ink border-hairline hover:bg-mist"
            }`}
          >
            {status?.offline_simulation ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-sienna animate-pulse" />
                Offline Mode (Simulated)
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                Simulate Offline
              </>
            )}
          </button>

          <button
            onClick={handleToggleSync}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-normal bg-paper border border-hairline text-ink hover:bg-mist transition"
          >
            {status?.sync_enabled ? (
              <>
                <Pause className="w-3.5 h-3.5 text-slate-gray" />
                Pause Sync
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-600" />
                Resume Sync
              </>
            )}
          </button>

          <button
            onClick={handleDrainQueue}
            disabled={actionLoading || !status?.is_online || !status?.sync_enabled}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-normal bg-ink text-paper hover:bg-ink/85 transition disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? "animate-spin" : ""}`} />
            Drain Queue Now
          </button>
        </div>
      </div>

      {/* Circuit Breaker Alert Banner */}
      {status?.circuit_breaker_open && (
        <div className="p-4 rounded-2xl bg-peach border border-peach text-sienna text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ZapOff className="w-4 h-4 text-sienna shrink-0" />
            <div>
              <span className="font-medium">Circuit Breaker is OPEN.</span> Upstream failures detected. Queue draining is cooling down.
            </div>
          </div>
        </div>
      )}

      {/* Sync Status Cards: Floating Artifacts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-paper border border-hairline rounded-3xl p-6 shadow-artifact">
          <span className="text-xs uppercase tracking-wider text-ash-gray font-normal">Queue Status</span>
          <div className="mt-3 text-3xl font-serif text-ink tracking-tight font-normal">
            {status?.pending_jobs_count ?? 0} <span className="text-xs font-sans text-slate-gray font-normal">pending</span>
          </div>
          <div className="text-xs text-slate-gray mt-3 pt-2 border-t border-hairline">
            Priority-ordered FIFO queue
          </div>
        </div>

        <div className="bg-paper border border-hairline rounded-3xl p-6 shadow-artifact">
          <span className="text-xs uppercase tracking-wider text-ash-gray font-normal">Succeeded Jobs</span>
          <div className="mt-3 text-3xl font-serif text-ink tracking-tight font-normal">
            {status?.succeeded_jobs_count ?? 0} <span className="text-xs font-sans text-slate-gray font-normal">synced</span>
          </div>
          <div className="text-xs text-slate-gray mt-3 pt-2 border-t border-hairline">
            Acknowledged by upstream cloud
          </div>
        </div>

        <div className="bg-paper border border-hairline rounded-3xl p-6 shadow-artifact">
          <span className="text-xs uppercase tracking-wider text-ash-gray font-normal">Failed / Retrying</span>
          <div className="mt-3 text-3xl font-serif text-ink tracking-tight font-normal">
            {status?.failed_jobs_count ?? 0} <span className="text-xs font-sans text-sienna font-normal">retry</span>
          </div>
          <div className="text-xs text-slate-gray mt-3 pt-2 border-t border-hairline">
            Exponential backoff with jitter
          </div>
        </div>

        <div className="bg-paper border border-hairline rounded-3xl p-6 shadow-artifact">
          <span className="text-xs uppercase tracking-wider text-ash-gray font-normal">Air-Gapped Private</span>
          <div className="mt-3 text-3xl font-serif text-ink tracking-tight font-normal">
            {status?.blocked_private_count ?? 0} <span className="text-xs font-sans text-ash-gray font-normal">retained</span>
          </div>
          <div className="text-xs text-slate-gray mt-3 pt-2 border-t border-hairline">
            Strictly kept on device disk
          </div>
        </div>
      </div>

      {/* Queue Tabs and Table */}
      <div className="bg-paper border border-hairline rounded-3xl overflow-hidden shadow-artifact">
        {/* Navigation Tabs */}
        <div className="border-b border-hairline p-4 flex flex-wrap items-center justify-between gap-3 bg-fog/40">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-1.5 rounded-full text-xs font-normal transition ${
                activeTab === "pending"
                  ? "bg-ink text-paper"
                  : "text-slate-gray hover:text-ink hover:bg-mist"
              }`}
            >
              Pending ({status?.pending_jobs_count ?? 0})
            </button>
            <button
              onClick={() => setActiveTab("succeeded")}
              className={`px-4 py-1.5 rounded-full text-xs font-normal transition ${
                activeTab === "succeeded"
                  ? "bg-ink text-paper"
                  : "text-slate-gray hover:text-ink hover:bg-mist"
              }`}
            >
              Succeeded ({status?.succeeded_jobs_count ?? 0})
            </button>
            <button
              onClick={() => setActiveTab("failed")}
              className={`px-4 py-1.5 rounded-full text-xs font-normal transition ${
                activeTab === "failed"
                  ? "bg-ink text-paper"
                  : "text-slate-gray hover:text-ink hover:bg-mist"
              }`}
            >
              Failed ({status?.failed_jobs_count ?? 0})
            </button>
            <button
              onClick={() => setActiveTab("blocked")}
              className={`px-4 py-1.5 rounded-full text-xs font-normal transition ${
                activeTab === "blocked"
                  ? "bg-ink text-paper"
                  : "text-slate-gray hover:text-ink hover:bg-mist"
              }`}
            >
              Blocked Private ({status?.blocked_private_count ?? 0})
            </button>
          </div>

          <div className="text-xs text-ash-gray">
            Device: {status?.active_device_id.slice(0, 16)}...
          </div>
        </div>

        {/* Tab Content List */}
        <div className="divide-y divide-hairline">
          {filteredJobs.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <Layers className="w-8 h-8 text-ash-gray mx-auto" />
              <div className="text-slate-gray text-xs">No {activeTab} sync jobs in queue.</div>
            </div>
          ) : (
            filteredJobs.map((job) => (
              <div key={job.id} className="p-6 hover:bg-fog/50 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full uppercase bg-mist text-ink">
                      {job.operation}
                    </span>
                    <span
                      className={`text-[11px] font-normal px-2.5 py-0.5 rounded-full ${
                        job.priority === "high"
                          ? "bg-peach text-sienna font-medium"
                          : "bg-fog text-slate-gray border border-hairline"
                      }`}
                    >
                      {job.priority} Priority
                    </span>
                    <span className="text-xs text-ash-gray">
                      ID: {job.id.slice(0, 8)}...
                    </span>
                  </div>

                  <div className="text-xs text-slate-gray">
                    Memory ID: <span className="text-ink font-mono">{job.memory_id}</span>
                  </div>

                  {job.last_error && (
                    <div className="text-xs text-sienna bg-peach/40 p-3 rounded-xl border border-peach max-w-xl">
                      Error: {job.last_error}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-ash-gray">
                    <span>Attempts: {job.attempt_count}</span>
                    <span>Created: {new Date(job.created_at).toLocaleTimeString()}</span>
                    {job.next_attempt_at && (
                      <span className="text-sienna">
                        Next Attempt: {new Date(job.next_attempt_at).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Job Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {job.status === "failed" && (
                    <button
                      onClick={() => handleRetryJob(job.id)}
                      className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-normal bg-ink text-paper hover:bg-ink/85 transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Retry Now
                    </button>
                  )}
                  {job.status === "blocked" && (
                    <span className="text-xs text-slate-gray flex items-center gap-1.5 bg-mist px-3 py-1 rounded-full">
                      <Lock className="w-3 h-3 text-ash-gray" />
                      Policy Protected
                    </span>
                  )}
                  {job.status === "succeeded" && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-3 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" />
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
