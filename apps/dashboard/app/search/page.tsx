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
  WifiOff
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
    "What server is deployed in rack B?"
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b border-hairline pb-6">
        <div className="text-xs uppercase tracking-wider text-ash-gray font-normal mb-1">
          Vector Engine
        </div>
        <h1 className="font-serif text-3xl lg:text-4xl font-normal tracking-tight text-ink">
          Semantic <span className="italic">Search</span>
        </h1>
        <p className="text-sm text-slate-gray mt-1 max-w-xl">
          Cosine vector retrieval computed entirely on local CPU memory using FastEmbed and embedded Qdrant.
        </p>
      </div>

      {/* AI Composer Input Box (Steep Specification) */}
      <div className="bg-paper border border-hairline rounded-3xl p-6 shadow-artifact space-y-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-ash-gray absolute left-4" />
            <input
              type="text"
              required
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask anything... e.g. 'Which entrance is closed?'"
              className="w-full bg-mist/60 border border-transparent focus:border-hairline focus:bg-paper rounded-full pl-12 pr-14 py-3.5 text-base text-ink placeholder:text-smoke-gray focus:outline-none transition shadow-sm"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 w-10 h-10 rounded-full bg-ink text-paper hover:bg-ink/85 flex items-center justify-center transition disabled:opacity-40"
              title="Execute Vector Search"
            >
              <ArrowRight className="w-4 h-4 text-paper" />
            </button>
          </div>

          {/* Quick Query Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-gray">
            <span className="text-ash-gray">Suggested:</span>
            {sampleQueries.map((sq) => (
              <button
                key={sq}
                type="button"
                onClick={() => setQuery(sq)}
                className="px-3.5 py-1 rounded-full bg-fog border border-hairline hover:bg-mist text-slate-gray hover:text-ink transition"
              >
                {sq}
              </button>
            ))}
          </div>

          {/* Search Controls & Scope */}
          <div className="pt-4 border-t border-hairline flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-4">
              <span className="text-ash-gray uppercase tracking-wider text-[11px]">
                Scope:
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer text-ink font-normal">
                <input
                  type="checkbox"
                  checked={importantChecked}
                  onChange={(e) => setImportantChecked(e.target.checked)}
                  className="rounded text-ink focus:ring-0 accent-ink"
                />
                Important
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-ink font-normal">
                <input
                  type="checkbox"
                  checked={normalChecked}
                  onChange={(e) => setNormalChecked(e.target.checked)}
                  className="rounded text-ink focus:ring-0 accent-ink"
                />
                Normal
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-ink font-normal">
                <input
                  type="checkbox"
                  checked={privateChecked}
                  onChange={(e) => setPrivateChecked(e.target.checked)}
                  className="rounded text-ink focus:ring-0 accent-ink"
                />
                Private
              </label>
            </div>

            {/* Threshold Slider */}
            <div className="flex items-center gap-3">
              <span className="text-ash-gray uppercase tracking-wider text-[11px]">
                Min Relevance:
              </span>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-24 accent-ink cursor-pointer"
              />
              <span className="text-ink font-mono text-xs w-8">
                {threshold.toFixed(2)}
              </span>
            </div>
          </div>
        </form>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-peach/40 border border-peach text-sienna text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Header / Metrics */}
      {response && (
        <div className="bg-fog border border-hairline rounded-2xl p-4 flex items-center justify-between text-xs text-slate-gray">
          <div className="flex items-center gap-3">
            <span className="text-ink font-medium">
              Found {response.total_results} matches for &ldquo;{response.query}&rdquo;
            </span>
            {response.offline ? (
              <span className="flex items-center gap-1 text-sienna bg-peach px-2.5 py-0.5 rounded-full text-[11px] font-medium">
                <WifiOff className="w-3 h-3" />
                Offline Local Vector Search
              </span>
            ) : (
              <span className="flex items-center gap-1 text-ink bg-mist px-2.5 py-0.5 rounded-full text-[11px]">
                <Wifi className="w-3 h-3" />
                Edge Query Engine
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-ink font-serif text-sm">
            <Clock className="w-3.5 h-3.5 text-slate-gray" />
            <span>{response.latency_ms} ms</span>
          </div>
        </div>
      )}

      {/* Search Results List */}
      {response && (
        <div className="space-y-4">
          {response.results.length === 0 ? (
            <div className="bg-paper border border-hairline rounded-3xl p-16 text-center space-y-3 shadow-artifact">
              <Search className="w-8 h-8 text-ash-gray mx-auto" />
              <div className="text-ink font-serif text-xl">No close match found</div>
              <p className="text-xs text-slate-gray max-w-md mx-auto leading-relaxed">
                No local memories exceeded the configured similarity threshold of {threshold}. Try adjusting the query or lowering the minimum relevance slider.
              </p>
            </div>
          ) : (
            response.results.map((item, idx) => (
              <div
                key={item.memory_id}
                className="bg-paper border border-hairline rounded-3xl p-6 shadow-artifact hover:border-slate-gray/30 transition space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ash-gray font-normal">#{idx + 1}</span>
                    <CategoryBadge category={item.category} />
                    <PrivacyBadge privacy={item.privacy} />
                    <StatusBadge status={item.status} />
                  </div>

                  {/* Relevance Score Pill (Peach Accent) */}
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-peach text-sienna">
                    <Sparkles className="w-3.5 h-3.5 text-sienna" />
                    <span className="text-xs font-medium">
                      {(item.score * 100).toFixed(1)}% match
                    </span>
                    <span className="text-[10px] text-sienna/70">({item.score})</span>
                  </div>
                </div>

                <p className="text-sm font-sans text-ink leading-relaxed bg-fog p-4 rounded-2xl border border-hairline">
                  {item.text}
                </p>

                <div className="flex flex-wrap items-center justify-between text-xs text-slate-gray pt-1">
                  <span>
                    Indexed: {new Date(item.created_at).toLocaleString()}
                  </span>
                  {item.tags.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <Tag className="w-3 h-3 text-ash-gray" />
                      {item.tags.map((t) => (
                        <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-mist text-slate-gray">
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
