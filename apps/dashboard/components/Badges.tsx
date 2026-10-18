import React from "react";
import { Shield, Lock, Globe, AlertTriangle, CheckCircle, Clock, XCircle, RefreshCw, Zap } from "lucide-react";

export function CategoryBadge({ category }: { category: string }) {
  if (category === "important") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        Important
      </span>
    );
  }
  if (category === "private") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-500/15 text-rose-300 border border-rose-500/30">
        <Lock className="w-3 h-3 text-rose-400" />
        Private
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-white/10">
      Normal
    </span>
  );
}

export function PrivacyBadge({ privacy }: { privacy: string }) {
  if (privacy === "local_only") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-violet-500/15 text-violet-300 border border-violet-500/30">
        <Shield className="w-3 h-3 text-violet-400" />
        Local Only
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
      <Globe className="w-3 h-3 text-cyan-400" />
      Sync Allowed
    </span>
  );
}

export function SyncStateBadge({ syncState }: { syncState: string }) {
  switch (syncState) {
    case "synced":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-glow-emerald" />
          Synced
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-amber-400 font-medium">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          Queue Pending
        </span>
      );
    case "syncing":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-cyan-400 font-medium">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
          Syncing...
        </span>
      );
    case "blocked":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-rose-300 font-medium">
          <Lock className="w-3.5 h-3.5 text-rose-400" />
          Blocked by Policy
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-medium">
          <XCircle className="w-3.5 h-3.5 text-rose-400" />
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-medium">
          <Shield className="w-3.5 h-3.5 text-slate-400" />
          Local Only
        </span>
      );
  }
}

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-glow-emerald" />
          Active
        </span>
      );
    case "archived":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-white/5">
          Archived
        </span>
      );
    case "superseded":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
          Superseded
        </span>
      );
    case "deleted":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono text-slate-500 border border-white/5 line-through">
          Tombstone
        </span>
      );
    default:
      return null;
  }
}
