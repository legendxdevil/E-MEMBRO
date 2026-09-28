import React from "react";
import { Shield, Lock, Globe, AlertTriangle, CheckCircle, Clock, XCircle, RefreshCw } from "lucide-react";

export function CategoryBadge({ category }: { category: string }) {
  if (category === "important") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-normal bg-peach text-sienna">
        <span className="w-1.5 h-1.5 rounded-full bg-sienna" />
        Important
      </span>
    );
  }
  if (category === "private") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-normal bg-mist text-ink">
        <Lock className="w-3 h-3 text-slate-gray" />
        Private
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-normal bg-fog text-slate-gray border border-hairline">
      Normal
    </span>
  );
}

export function PrivacyBadge({ privacy }: { privacy: string }) {
  if (privacy === "local_only") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] bg-fog text-ink border border-hairline">
        <Shield className="w-3 h-3 text-sienna" />
        Local Only
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[12px] bg-mist text-slate-gray">
      <Globe className="w-3 h-3 text-slate-gray" />
      Sync Allowed
    </span>
  );
}

export function SyncStateBadge({ syncState }: { syncState: string }) {
  switch (syncState) {
    case "synced":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-ink font-normal">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          Synced
        </span>
      );
    case "pending":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-sienna font-normal">
          <span className="w-2 h-2 rounded-full bg-peach border border-sienna" />
          Queue Pending
        </span>
      );
    case "syncing":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-ink font-normal">
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-ink" />
          Syncing...
        </span>
      );
    case "blocked":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-gray font-normal">
          <Lock className="w-3.5 h-3.5 text-ash-gray" />
          Local Only (Kept Private)
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-sienna font-normal">
          <XCircle className="w-3.5 h-3.5 text-sienna" />
          Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-gray font-normal">
          <Shield className="w-3.5 h-3.5 text-ash-gray" />
          Local Only
        </span>
      );
  }
}

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-normal bg-paper text-ink border border-hairline shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Active
        </span>
      );
    case "archived":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-normal bg-mist text-slate-gray">
          Archived
        </span>
      );
    case "superseded":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-normal bg-peach text-sienna">
          Superseded
        </span>
      );
    case "deleted":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-normal bg-mist text-ash-gray line-through">
          Tombstone
        </span>
      );
    default:
      return null;
  }
}
