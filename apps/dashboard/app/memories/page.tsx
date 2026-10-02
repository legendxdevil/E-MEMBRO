"use client";

import React, { useEffect, useState } from "react";
import {
  Brain,
  Plus,
  Search,
  History,
  Archive,
  Trash2,
  RotateCcw,
  Edit2,
  Clock,
  Smartphone,
  Tag,
  X,
  Layers,
  Sparkles,
  Filter
} from "lucide-react";
import { api, Memory } from "../../lib/api";
import { CategoryBadge, PrivacyBadge, SyncStateBadge, StatusBadge } from "../../components/Badges";
import VersionModal from "../../components/VersionModal";
import CreateMemoryModal from "../../components/CreateMemoryModal";

export default function MemoryExplorerPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [privacyFilter, setPrivacyFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedMemoryIdForVersion, setSelectedMemoryIdForVersion] = useState<string | null>(null);

  // Edit State
  const [editingMemory, setEditingMemory] = useState<Memory | null>(null);
  const [editText, setEditText] = useState("");
  const [editCategory, setEditCategory] = useState<string>("");
  const [editPrivacy, setEditPrivacy] = useState<string>("");
  const [editReason, setEditReason] = useState("");

  const loadMemories = async () => {
    setLoading(true);
    try {
      const data = await api.listMemories({
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        privacy: privacyFilter || undefined,
        q: searchQuery || undefined,
        page,
        page_size: pageSize,
      });
      setMemories(data.memories || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error("Failed to load memories:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemories();
  }, [categoryFilter, statusFilter, privacyFilter, page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadMemories();
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Archive this memory?")) return;
    try {
      await api.archiveMemory(id);
      loadMemories();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      await api.restoreMemory(id);
      loadMemories();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this memory? A tombstone will be recorded to maintain cluster sync consistency.")) return;
    try {
      await api.deleteMemory(id);
      loadMemories();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const startEdit = (mem: Memory) => {
    setEditingMemory(mem);
    setEditText(mem.text);
    setEditCategory(mem.category);
    setEditPrivacy(mem.privacy);
    setEditReason("Updated via Dashboard");
  };

  const submitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMemory) return;
    try {
      await api.updateMemory(editingMemory.id, {
        text: editText,
        category: editCategory,
        privacy: editPrivacy,
        change_reason: editReason || "User update",
      });
      setEditingMemory(null);
      loadMemories();
    } catch (e: any) {
      alert(e.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-3xl p-6 md:p-8 border border-white/10 glow-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 font-semibold">
              SQLite + Vector Index
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs font-mono text-slate-400">{total} Total Items</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Memory Explorer
          </h1>
          <p className="text-xs md:text-sm text-slate-400 font-light mt-1">
            Browse, manage, and inspect version snapshots stored on the local hardware node.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-glow flex items-center gap-2 transition duration-200 cursor-pointer self-start sm:self-center shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Create Memory
        </button>
      </div>

      {/* Filter and Search Bar: Glassmorphic Panel */}
      <div className="glass-panel rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-white/10 shadow-subtle">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search local memory text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full glass-input rounded-xl pl-10 pr-4 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="glass-input rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="">All Categories</option>
            <option value="important">Important</option>
            <option value="normal">Normal</option>
            <option value="private">Private</option>
          </select>

          {/* Privacy Filter */}
          <select
            value={privacyFilter}
            onChange={(e) => {
              setPrivacyFilter(e.target.value);
              setPage(1);
            }}
            className="glass-input rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="">All Privacy</option>
            <option value="sync_allowed">Sync Allowed</option>
            <option value="local_only">Local Only</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="glass-input rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="superseded">Superseded</option>
            <option value="deleted">Tombstones</option>
          </select>
        </div>
      </div>

      {/* Memory List Surface */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        {loading ? (
          <div className="py-24 text-center text-slate-400 text-xs font-mono flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            Loading memories from local SQLite database...
          </div>
        ) : memories.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <Brain className="w-10 h-10 text-slate-600 mx-auto" />
            <div className="text-white text-lg font-bold">No memories found</div>
            <div className="text-xs text-slate-400">Create a memory or adjust the search and filter options above.</div>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {memories.map((mem) => (
              <div key={mem.id} className="p-6 hover:bg-white/[0.02] transition group">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={mem.category} />
                      <PrivacyBadge privacy={mem.privacy} />
                      <StatusBadge status={mem.status} />
                      <SyncStateBadge syncState={mem.sync_state} />
                      <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        v{mem.version}
                      </span>
                    </div>

                    <p className="text-sm text-slate-100 font-sans leading-relaxed">
                      {mem.text}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1 font-mono">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(mem.created_at).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <Smartphone className="w-3.5 h-3.5 text-slate-500" />
                        Device: {mem.device_id ? mem.device_id.slice(0, 10) + "..." : "Local Node"}
                      </span>
                      {mem.tags && mem.tags.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3 h-3 text-slate-500" />
                          {mem.tags.map((t) => (
                            <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-300 border border-white/5">
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 self-end sm:self-start shrink-0">
                    <button
                      onClick={() => setSelectedMemoryIdForVersion(mem.id)}
                      title="View Version History"
                      className="p-2 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 transition cursor-pointer"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    {mem.status === "active" && (
                      <>
                        <button
                          onClick={() => startEdit(mem)}
                          title="Edit Memory"
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-white/10 border border-transparent hover:border-white/10 transition cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleArchive(mem.id)}
                          title="Archive Memory"
                          className="p-2 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 border border-transparent hover:border-amber-500/20 transition cursor-pointer"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(mem.id)}
                          title="Delete (Tombstone)"
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {mem.status === "archived" && (
                      <button
                        onClick={() => handleRestore(mem.id)}
                        title="Restore to Active"
                        className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 border border-transparent hover:border-emerald-500/20 transition cursor-pointer"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination footer */}
        <div className="p-4 border-t border-white/5 bg-black/30 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>Total: {total} records</span>
          <div className="flex items-center gap-3">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 transition disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>
            <span className="text-white">Page {page}</span>
            <button
              disabled={page * pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 transition disabled:opacity-40 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Edit Memory Modal */}
      {editingMemory && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-panel-elevated rounded-3xl w-full max-w-lg shadow-popover p-6 space-y-5 border border-white/10 glow-border">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Edit Memory</h3>
                <p className="text-xs text-slate-400 font-mono">Generates revision snapshot v{editingMemory.version + 1}</p>
              </div>
              <button
                onClick={() => setEditingMemory(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submitEdit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 font-medium">Memory Text</label>
                <textarea
                  required
                  rows={4}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full glass-input rounded-2xl p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none leading-relaxed resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 font-medium">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full glass-input rounded-xl p-3 text-xs text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="important">Important</option>
                    <option value="normal">Normal</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 font-medium">Privacy</label>
                  <select
                    value={editPrivacy}
                    disabled={editCategory === "private"}
                    onChange={(e) => setEditPrivacy(e.target.value)}
                    className="w-full glass-input rounded-xl p-3 text-xs text-slate-200 focus:outline-none disabled:opacity-40 cursor-pointer"
                  >
                    <option value="sync_allowed">Sync Allowed</option>
                    <option value="local_only">Local Only</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 font-medium">Reason for Update</label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Added maintenance timeframe"
                  className="w-full glass-input rounded-xl p-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingMemory(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 text-white shadow-glow transition cursor-pointer"
                >
                  Save Revision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version Modal */}
      {selectedMemoryIdForVersion && (
        <VersionModal
          memoryId={selectedMemoryIdForVersion}
          isOpen={true}
          onClose={() => setSelectedMemoryIdForVersion(null)}
        />
      )}

      {/* Create Memory Modal */}
      <CreateMemoryModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => loadMemories()}
      />
    </div>
  );
}
