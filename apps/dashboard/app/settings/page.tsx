"use client";

import React, { useEffect, useState } from "react";
import {
  PlayCircle,
  Shield,
  Wifi,
  WifiOff,
  Pause,
  Play
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
      const [st, h] = await Promise.all([api.getSyncStatus(), api.getHealth()]);
      setSyncStatus(st);
      setHealth(h);
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
      setSeedResult(`Demo scenario seeded! Device A memories created, synced, and conflicting Gate 3 update from Device B resolved.`);
      loadSettingsData();
    } catch (e: any) {
      setSeedResult(`Error seeding demo: ${e.message}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl">
      {/* Header */}
      <div className="border-b border-hairline pb-6">
        <div className="text-xs uppercase tracking-wider text-ash-gray font-normal mb-1">
          Configuration & Policies
        </div>
        <h1 className="font-serif text-3xl lg:text-4xl font-normal tracking-tight text-ink">
          Platform <span className="italic">Settings</span>
        </h1>
        <p className="text-sm text-slate-gray mt-1 max-w-xl">
          Network partition simulation, selective cloud upload policies, and reproducible scenario triggers.
        </p>
      </div>

      {/* Demo Scenario Runner Card: Accent Peach Card (Steep Specification) */}
      <div className="bg-peach rounded-3xl p-8 text-sienna border border-peach/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-lg">
            <div className="text-xs uppercase tracking-wider text-sienna/75 font-medium">
              Autonomous Verification
            </div>
            <h3 className="font-serif text-2xl font-normal text-sienna">
              Seed End-to-End Demo Scenario
            </h3>
            <p className="text-xs lg:text-sm text-sienna/85 leading-relaxed">
              Populates opposing &ldquo;Gate 3&rdquo; states across Device A and Device B, indexes Normal & Private memories, and triggers semantic consensus resolution.
            </p>
          </div>

          <button
            onClick={handleSeedDemo}
            disabled={seeding}
            className="px-6 py-3 rounded-full text-xs font-normal bg-sienna text-paper hover:bg-sienna/90 transition shadow-sm flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
          >
            <PlayCircle className="w-4 h-4" />
            {seeding ? "Seeding Scenario..." : "Run Demo Scenario"}
          </button>
        </div>

        {seedResult && (
          <div className="p-3.5 rounded-2xl bg-paper/70 border border-sienna/20 text-sienna text-xs font-sans">
            {seedResult}
          </div>
        )}
      </div>

      {/* Sync & Connectivity Controls: Floating White Artifact Card */}
      <div className="bg-paper border border-hairline rounded-3xl p-8 space-y-6 shadow-artifact">
        <h3 className="font-serif text-xl font-normal text-ink border-b border-hairline pb-3">
          Network Simulation & Dispatch Rules
        </h3>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-hairline">
          <div>
            <div className="font-medium text-ink text-sm">Offline Network Partition</div>
            <div className="text-xs text-slate-gray mt-0.5 max-w-md leading-relaxed">
              Simulates total disconnection. Memory embedding, semantic query resolution, and queue persistence remain 100% active.
            </div>
          </div>
          <button
            onClick={handleToggleOffline}
            className={`px-5 py-2 rounded-full text-xs font-normal border transition shrink-0 ${
              syncStatus?.offline_simulation
                ? "bg-peach text-sienna border-peach font-medium"
                : "bg-paper text-ink border-hairline hover:bg-mist"
            }`}
          >
            {syncStatus?.offline_simulation ? "Simulating Offline (Active)" : "Online (Normal)"}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 border-b border-hairline">
          <div>
            <div className="font-medium text-ink text-sm">Selective Cloud Dispatch Engine</div>
            <div className="text-xs text-slate-gray mt-0.5 max-w-md leading-relaxed">
              When paused, all outbound sync jobs are safely buffered in the local SQLite queue without data loss.
            </div>
          </div>
          <button
            onClick={handleToggleSync}
            className={`px-5 py-2 rounded-full text-xs font-normal border transition shrink-0 ${
              syncStatus?.sync_enabled
                ? "bg-mist text-ink border-hairline"
                : "bg-peach text-sienna border-peach"
            }`}
          >
            {syncStatus?.sync_enabled ? "Sync Enabled" : "Sync Paused"}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
          <div>
            <div className="font-medium text-ink text-sm">Privacy Boundary Safeguard</div>
            <div className="text-xs text-slate-gray mt-0.5 max-w-md leading-relaxed">
              Memories categorized as Private are automatically tagged <code className="bg-mist px-1.5 py-0.5 rounded text-[11px]">local_only</code> and blocked from sync jobs.
            </div>
          </div>
          <span className="text-xs text-emerald-700 bg-emerald-50 px-3.5 py-1 rounded-full shrink-0 font-normal">
            Air-Gapped & Locked
          </span>
        </div>
      </div>

      {/* System Hardware & Architecture Specs */}
      <div className="bg-paper border border-hairline rounded-3xl p-8 space-y-5 shadow-artifact">
        <h3 className="font-serif text-xl font-normal text-ink border-b border-hairline pb-3">
          Hardware & Engine Specifications
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
          <div className="p-4 bg-fog rounded-2xl border border-hairline">
            <div className="text-ash-gray uppercase tracking-wider text-[11px]">Vector Store</div>
            <div className="text-ink font-serif text-base mt-1">Qdrant Edge (Embedded Rust Core)</div>
            <div className="text-slate-gray mt-1">Storage: data/qdrant_edge</div>
          </div>

          <div className="p-4 bg-fog rounded-2xl border border-hairline">
            <div className="text-ash-gray uppercase tracking-wider text-[11px]">Embedding Model</div>
            <div className="text-ink font-serif text-base mt-1">FastEmbed (BAAI/bge-small-en-v1.5)</div>
            <div className="text-slate-gray mt-1">Dimension: 384d Dense Vectors</div>
          </div>

          <div className="p-4 bg-fog rounded-2xl border border-hairline">
            <div className="text-ash-gray uppercase tracking-wider text-[11px]">Durable Queue & Ledger</div>
            <div className="text-ink font-serif text-base mt-1">SQLite (WAL Mode, ACID)</div>
            <div className="text-slate-gray mt-1">Path: data/edge_memory.db</div>
          </div>

          <div className="p-4 bg-fog rounded-2xl border border-hairline">
            <div className="text-ash-gray uppercase tracking-wider text-[11px]">Active Node Identifier</div>
            <div className="text-ink font-serif text-base mt-1 truncate">
              {syncStatus?.active_device_id}
            </div>
            <div className="text-slate-gray mt-1">Status: Registered Node Alpha</div>
          </div>
        </div>
      </div>
    </div>
  );
}
