"use client";

import React, { useEffect, useState } from "react";
import { X, Clock, Smartphone } from "lucide-react";
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
    <div className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-paper border border-hairline rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-popover overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 border-b border-hairline flex items-center justify-between">
          <div>
            <h3 className="font-serif text-2xl font-normal text-ink">Memory Version History</h3>
            <p className="text-xs text-slate-gray mt-0.5">Immutable audit trail of semantic changes and local revisions</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-gray hover:text-ink hover:bg-mist transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-16 text-center text-slate-gray text-xs">Loading version snapshots...</div>
          ) : versions.length === 0 ? (
            <div className="py-16 text-center text-slate-gray text-xs">No historical versions recorded.</div>
          ) : (
            versions.map((ver) => (
              <div
                key={ver.id}
                className={`p-5 rounded-2xl border transition ${
                  ver.is_current
                    ? "bg-fog border-hairline shadow-subtle"
                    : "bg-mist border-transparent"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-paper border border-hairline text-ink">
                      v{ver.version_number}
                    </span>
                    {ver.is_current && (
                      <span className="text-xs font-normal text-emerald-600 px-2.5 py-0.5 rounded-full bg-emerald-50">
                        Current Active
                      </span>
                    )}
                    <span className="text-xs text-slate-gray flex items-center gap-1 font-sans">
                      <Clock className="w-3 h-3 text-ash-gray" />
                      {new Date(ver.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CategoryBadge category={ver.category_snapshot} />
                    <PrivacyBadge privacy={ver.privacy_snapshot} />
                  </div>
                </div>

                <p className="text-sm text-ink bg-paper p-4 rounded-xl border border-hairline font-sans whitespace-pre-wrap leading-relaxed shadow-sm">
                  {ver.text_snapshot}
                </p>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-gray">
                  <span className="flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-ash-gray" />
                    Device: {ver.source_device_id.slice(0, 13)}...
                  </span>
                  <span className="italic">
                    Reason: {ver.change_reason}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-hairline bg-fog flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full text-xs font-normal bg-ink text-paper hover:bg-ink/85 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
