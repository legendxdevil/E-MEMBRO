"use client";

import React, { useEffect, useState } from "react";
import {
  Activity,
  Clock,
  Lock,
  FileText,
  RefreshCw,
  AlertTriangle,
  Search
} from "lucide-react";
import { api, ActivityEvent } from "../../lib/api";

export default function ActivityLogPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("");

  const loadActivity = async () => {
    try {
      const data = await api.listActivity(filterType || undefined, 100);
      setEvents(data);
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
        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-normal bg-mist text-ink">
          <FileText className="w-3 h-3 text-slate-gray" />
          {type}
        </span>
      );
    }
    if (type.startsWith("sync.")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-normal bg-fog border border-hairline text-slate-gray">
          <RefreshCw className="w-3 h-3 text-slate-gray" />
          {type}
        </span>
      );
    }
    if (type.startsWith("conflict.")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-medium bg-peach text-sienna">
          <AlertTriangle className="w-3 h-3 text-sienna" />
          {type}
        </span>
      );
    }
    if (type.startsWith("search.")) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-normal bg-mist text-ink">
          <Search className="w-3 h-3 text-slate-gray" />
          {type}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs bg-fog text-slate-gray border border-hairline">
        {type}
      </span>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-ash-gray font-normal mb-1">
            Audit Stream
          </div>
          <h1 className="font-serif text-3xl lg:text-4xl font-normal tracking-tight text-ink">
            Audit & <span className="italic">Activity Log</span>
          </h1>
          <p className="text-sm text-slate-gray mt-1 max-w-xl">
            Chronological record of mutations, sync dispatches, and deterministic consensus traces.
          </p>
        </div>

        {/* Filter by event type */}
        <div className="flex items-center gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-mist rounded-full px-4 py-2 text-xs text-ink focus:outline-none cursor-pointer"
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
      <div className="bg-paper border border-hairline rounded-3xl overflow-hidden shadow-artifact">
        {loading ? (
          <div className="py-24 text-center text-slate-gray text-xs">Loading activity audit log...</div>
        ) : events.length === 0 ? (
          <div className="py-24 text-center space-y-2">
            <Activity className="w-8 h-8 text-ash-gray mx-auto" />
            <div className="text-slate-gray text-xs">No audit events match your filter.</div>
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {events.map((ev) => (
              <div key={ev.id} className="p-6 hover:bg-fog/50 transition space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    {getEventBadge(ev.event_type)}
                    <span className="text-xs text-ash-gray">
                      ID: {ev.id.slice(0, 8)}...
                    </span>
                    {ev.memory_id && (
                      <span className="text-xs text-slate-gray">
                        Memory: <span className="text-ink font-mono">{ev.memory_id.slice(0, 8)}...</span>
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-gray flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-ash-gray" />
                    {new Date(ev.created_at).toLocaleString()}
                  </div>
                </div>

                {/* Event Details JSON */}
                <div className="bg-fog rounded-2xl p-4 text-xs font-mono text-ink border border-hairline overflow-x-auto">
                  <div className="flex items-center justify-between text-slate-gray text-[11px] mb-2 border-b border-hairline pb-1.5">
                    <span>Actor: {ev.actor_device_id}</span>
                    {ev.details?.text === "[REDACTED_PRIVATE_CONTENT]" && (
                      <span className="text-sienna font-medium flex items-center gap-1 bg-peach px-2 py-0.5 rounded-full text-[10px]">
                        <Lock className="w-3 h-3 text-sienna" />
                        Private Text Redacted by Policy
                      </span>
                    )}
                  </div>
                  <pre className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
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
