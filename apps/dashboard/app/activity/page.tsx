"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  Clock,
  Lock,
  FileText,
  RefreshCw,
  AlertTriangle,
  Search,
  Code,
  Smartphone
} from "lucide-react";
import { api, ActivityEvent } from "../../lib/api";

export default function ActivityLogPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("");

  const loadActivity = async () => {
    try {
      const data = await api.listActivity(filterType || undefined, 100);
      setEvents(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivity();
    const interval = setInterval(loadActivity, 5000);
    return () => clearInterval(interval);
  }, [filterType]);

  const getEventBadge = (type: string) => {
    if (type.startsWith("memory.")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
          <FileText className="w-3 h-3 text-cyan-400" />
          {type}
        </span>
      );
    }
    if (type.startsWith("sync.")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
          <RefreshCw className="w-3 h-3 text-indigo-400" />
          {type}
        </span>
      );
    }
    if (type.startsWith("conflict.")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <AlertTriangle className="w-3 h-3 text-amber-400" />
          {type}
        </span>
      );
    }
    if (type.startsWith("search.")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <Search className="w-3 h-3 text-emerald-400" />
          {type}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono bg-white/5 text-slate-300 border border-white/10">
        {type}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-3xl p-6 md:p-8 border border-white/10 glow-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 font-semibold">
              Tamper-Evident Audit Trail
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs font-mono text-slate-400">{events.length} Telemetry Events</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Audit & Activity Stream
          </h1>
          <p className="text-xs md:text-sm text-slate-400 font-light mt-1">
            Chronological audit log of memory mutations, selective sync events, and automated consensus traces.
          </p>
        </div>

        {/* Filter by event type */}
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="glass-input rounded-xl px-4 py-2 text-xs text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="">All Events</option>
            <option value="memory.created">Memory Created</option>
            <option value="memory.updated">Memory Updated</option>
            <option value="memory.deleted">Memory Deleted</option>
            <option value="sync.queued">Sync Queued</option>
            <option value="sync.succeeded">Sync Succeeded</option>
            <option value="sync.failed">Sync Failed</option>
            <option value="sync.blocked_private">Sync Blocked (Private)</option>
            <option value="conflict.detected">Conflict Detected</option>
            <option value="conflict.resolved">Conflict Resolved</option>
            <option value="search.completed">Search Completed</option>
          </select>
        </div>
      </div>

      {/* Activity Feed Table */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        {loading ? (
          <div className="py-24 text-center text-slate-400 text-xs font-mono">Loading activity audit log from SQLite...</div>
        ) : events.length === 0 ? (
          <div className="py-24 text-center space-y-2">
            <Activity className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-slate-400 text-xs font-mono">No audit events match your filter.</div>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {events.map((ev) => (
              <div key={ev.id} className="p-6 hover:bg-white/[0.02] transition space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {getEventBadge(ev.event_type)}
                    <span className="text-xs font-mono text-slate-500">
                      ID: {ev.id.slice(0, 8)}...
                    </span>
                    {ev.memory_id && (
                      <span className="text-xs font-mono text-slate-400">
                        Memory: <span className="text-cyan-300">{ev.memory_id.slice(0, 8)}...</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    {new Date(ev.created_at).toLocaleString()}
                  </div>
                </div>

                {/* Event Details JSON */}
                <div className="bg-black/50 rounded-2xl p-4 text-xs font-mono text-slate-300 border border-white/5 overflow-x-auto">
                  <div className="flex items-center justify-between text-slate-500 text-[11px] mb-2 border-b border-white/5 pb-2">
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="w-3 h-3 text-cyan-400" />
                      Actor: {ev.actor_device_id}
                    </span>
                    {ev.details?.text === "[REDACTED_PRIVATE_CONTENT]" && (
                      <span className="text-rose-400 font-medium flex items-center gap-1 bg-rose-500/15 px-2.5 py-0.5 rounded-full text-[10px] border border-rose-500/30">
                        <Lock className="w-3 h-3 text-rose-400" />
                        Private Text Redacted by Policy
                      </span>
                    )}
                  </div>
                  <pre className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {JSON.stringify(ev.details, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
