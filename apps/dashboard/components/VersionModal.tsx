"use client";

import React, { useEffect, useState } from "react";
import { X, Clock, Smartphone, History, ArrowRight } from "lucide-react";
import { api, MemoryVersion } from "../lib/api";
import { CategoryBadge, PrivacyBadge } from "./Badges";

interface VersionModalProps {
  memoryId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function VersionModal({ memoryId, isOpen, onClose }: VersionModalProps) {
  const [versions, setVersions] = useState<MemoryVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !memoryId) return;
    setLoading(true);
    api.getMemoryVersions(memoryId)
      .then((data) => setVersions(data))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [memoryId, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass-panel-elevated rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-popover overflow-hidden border border-white/10 glow-border">
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-glow">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Memory Revision History</h3>
              <p className="text-xs text-slate-400 font-mono">Immutable audit trail of semantic changes on edge node</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {loading ? (
            <div className="py-16 text-center text-slate-400 text-xs font-mono">Loading version snapshots from SQLite...</div>
          ) : versions.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">No historical versions recorded for this memory.</div>
          ) : (
            versions.map((ver) => (
              <div
                key={ver.id}
                className={`p-5 rounded-2xl border transition ${
                  ver.is_current
                    ? "bg-cyan-500/10 border-cyan-500/30 shadow-glow"
                    : "bg-white/[0.02] border-white/5"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-cyan-400">
                      v{ver.version_number}
                    </span>
                    {ver.is_current && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        CURRENT ACTIVE
                      </span>
                    )}
                    <CategoryBadge category={ver.category_snapshot} />
                    <PrivacyBadge privacy={ver.privacy_snapshot} />
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {new Date(ver.created_at).toLocaleString()}
                  </div>
                </div>

                <p className="text-sm text-slate-100 font-sans leading-relaxed p-3 bg-black/30 rounded-xl border border-white/5">
                  {ver.text_snapshot}
                </p>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-400 font-mono">
                  <div className="flex items-center gap-1 text-slate-500">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Actor: {ver.source_device_id ? ver.source_device_id.slice(0, 16) + "..." : "Local Node"}</span>
                  </div>
                  <span className="text-slate-400 italic">
                    "{ver.change_reason || "Direct update"}"
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
