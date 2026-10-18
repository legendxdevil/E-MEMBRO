"use client";

import React, { useState } from "react";
import {
  Search,
  Clock,
  Sparkles,
  AlertCircle,
  Tag,
  ArrowRight,
  Wifi,
  WifiOff,
  Cpu,
  Sliders,
  CheckCircle2,
  Database
} from "lucide-react";
import { api, SearchResponse } from "../../lib/api";
import { CategoryBadge, PrivacyBadge, StatusBadge } from "../../components/Badges";

export default function SemanticSearchPage() {
  const [query, setQuery] = useState("");
  const [threshold, setThreshold] = useState(0.35);
  const [limit, setLimit] = useState(10);
  const [importantChecked, setImportantChecked] = useState(true);
  const [normalChecked, setNormalChecked] = useState(true);
  const [privateChecked, setPrivateChecked] = useState(true);

  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    const categories: any[] = [];
    if (importantChecked) categories.push("important");
    if (normalChecked) categories.push("normal");
    if (privateChecked) categories.push("private");

    try {
      const res = await api.search({
        query: query.trim(),
        threshold,
        limit,
        filters: categories.length < 3 ? { category: categories } : undefined,
      });
      setResponse(res);
    } catch (err: any) {
      setError(err.message || "Semantic search request failed.");
    } finally {
      setLoading(false);
    }
  };

  const sampleQueries = [
    "Which entrance is closed?",
    "Where is the vault security key stored?",
    "When is the facilities maintenance scheduled?",
    "Gate security perimeter status",
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-6 md:p-8 border border-white/10 glow-border">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 font-semibold">
                FastEmbed • 384d Dense Vector
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-xs font-mono text-emerald-400">Sub-20ms Offline Retrieval</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
              Semantic Search HUD
            </h1>
            <p className="text-xs md:text-sm text-slate-400 font-light mt-1">
              Dense vector embeddings computed directly on edge device memory. Zero external API calls.
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 border border-white/5 font-mono text-xs text-slate-300">
            <Cpu className="w-4 h-4 text-cyan-400" />
            <span>FastEmbed BGE-v1.5</span>
          </div>
        </div>
      </div>

      {/* Futuristic Search HUD Input Box */}
      <div className="glass-panel-elevated rounded-3xl p-6 border border-white/10 shadow-2xl space-y-5 glow-border">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-cyan-400 absolute left-4" />
            <input
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything... e.g. 'Which entrance is closed?'"
              className="w-full glass-input rounded-2xl pl-12 pr-14 py-4 text-sm md:text-base text-slate-100 placeholder:text-slate-500 focus:outline-none transition shadow-inner"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2.5 w-10 h-10 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 text-white flex items-center justify-center transition shadow-glow disabled:opacity-40 cursor-pointer"
              title="Execute Vector Search"
            >
              {loading ? (
                <Sparkles className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Quick Query Sample Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
            <span className="text-slate-500 text-[11px]">QUICK PROMPTS:</span>
            {sampleQueries.map((sq) => (
              <button
                key={sq}
                type="button"
                onClick={() => setQuery(sq)}
                className="px-3 py-1 rounded-xl bg-white/[0.04] border border-white/5 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-300 transition text-[11px] cursor-pointer"
              >
                {sq}
              </button>
            ))}
          </div>

          {/* Search Controls & Scope */}
          <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-slate-500 uppercase tracking-wider text-[11px]">
                Search Scope:
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={importantChecked}
                  onChange={(e) => setImportantChecked(e.target.checked)}
                  className="rounded bg-black/40 border-white/20 text-cyan-500 focus:ring-0"
                />
                Important
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={normalChecked}
                  onChange={(e) => setNormalChecked(e.target.checked)}
                  className="rounded bg-black/40 border-white/20 text-cyan-500 focus:ring-0"
                />
                Normal
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                <input
                  type="checkbox"
                  checked={privateChecked}
                  onChange={(e) => setPrivateChecked(e.target.checked)}
                  className="rounded bg-black/40 border-white/20 text-rose-500 focus:ring-0"
                />
                Private
              </label>
            </div>

            {/* Threshold Slider */}
            <div className="flex items-center gap-3">
              <span className="text-slate-500 uppercase tracking-wider text-[11px]">
                Cosine Threshold:
              </span>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-28 accent-cyan-400 cursor-pointer"
              />
              <span className="text-cyan-400 font-bold w-10 text-right">
                {threshold.toFixed(2)}
              </span>
            </div>
          </div>
        </form>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Header / Metrics */}
      {response && (
        <div className="glass-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-300 border border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-white font-semibold">
              Matched {response.total_results} vector {response.total_results === 1 ? "result" : "results"} for &ldquo;{response.query}&rdquo;
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 text-[11px]">
              <WifiOff className="w-3 h-3" />
              100% Offline Retrieval
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-cyan-300 font-mono text-sm bg-cyan-500/10 px-3 py-1 rounded-xl border border-cyan-500/20">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{response.latency_ms} ms</span>
          </div>
        </div>
      )}

      {/* Search Results List */}
      {response && (
        <div className="space-y-4">
          {response.results.length === 0 ? (
            <div className="glass-panel rounded-3xl p-16 text-center space-y-3 border border-white/10">
              <Database className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-white text-lg font-bold">No vectors match threshold</div>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                No local memories exceeded the configured cosine similarity threshold of {threshold}. Lower the threshold slider or rephrase the natural language query.
              </p>
            </div>
          ) : (
            response.results.map((item, idx) => {
              const matchPct = Math.round(item.score * 100);
              return (
                <div
                  key={item.memory_id}
                  className="glass-panel rounded-3xl p-6 border border-white/10 hover:border-cyan-500/40 transition space-y-4 group"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-500">#{idx + 1}</span>
                      <CategoryBadge category={item.category} />
                      <PrivacyBadge privacy={item.privacy} />
                      <StatusBadge status={item.status} />
                    </div>

                    {/* Cosine Similarity Match Gauge */}
                    <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="text-xs font-bold font-mono">
                        {matchPct}% Match
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">({item.score.toFixed(4)})</span>
                    </div>
                  </div>

                  <p className="text-sm font-sans text-slate-100 leading-relaxed bg-black/40 p-4 rounded-2xl border border-white/5">
                    {item.text}
                  </p>

                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-1 font-mono">
                    <span className="text-[11px] text-slate-500">
                      Indexed: {new Date(item.created_at).toLocaleString()}
                    </span>
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Tag className="w-3 h-3 text-slate-500" />
                        {item.tags.map((t) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/5">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
