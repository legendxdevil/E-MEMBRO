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
  X
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
      setMemories(data.memories);
      setTotal(data.total);
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
    if (!confirm("Delete this memory? A tombstone will be recorded to maintain sync consistency.")) return;
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
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-ash-gray font-normal mb-1">
            Data Ledger
          </div>
          <h1 className="font-serif text-3xl lg:text-4xl font-normal tracking-tight text-ink">
            Memory <span className="italic">Explorer</span>
          </h1>
          <p className="text-sm text-slate-gray mt-1 max-w-xl">
            Inspect, version, and curate knowledge records stored in edge SQLite and embedded Qdrant.
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="px-5 py-2.5 rounded-full text-xs font-normal bg-ink text-paper hover:bg-ink/85 flex items-center gap-2 transition shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Memory
        </button>
      </div>

      {/* Filter and Search Bar: White Floating Artifact Style */}
      <div className="bg-paper border border-hairline rounded-3xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-subtle">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-gray absolute left-4 top-3" />
            <input
              type="text"
              placeholder="Search local memory text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-mist rounded-full pl-10 pr-4 py-2 text-sm text-ink placeholder:text-smoke-gray focus:outline-none focus:ring-1 focus:ring-ink transition"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2 rounded-full text-xs font-normal bg-ink text-paper hover:bg-ink/85 transition"
          >
            Search
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            className="bg-mist rounded-full px-4 py-2 text-xs text-ink focus:outline-none cursor-pointer"
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
            className="bg-mist rounded-full px-4 py-2 text-xs text-ink focus:outline-none cursor-pointer"
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
            className="bg-mist rounded-full px-4 py-2 text-xs text-ink focus:outline-none cursor-pointer"
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
      <div className="bg-paper border border-hairline rounded-3xl overflow-hidden shadow-artifact">
        {loading ? (
          <div className="py-24 text-center text-slate-gray text-xs">Loading memories from local store...</div>
        ) : memories.length === 0 ? (
          <div className="py-24 text-center space-y-3">
            <Brain className="w-8 h-8 text-ash-gray mx-auto" />
            <div className="text-ink font-serif text-xl">No memories found</div>
            <div className="text-xs text-slate-gray">Create a memory or adjust filter settings.</div>
          </div>
        ) : (
          <div className="divide-y divide-hairline">
            {memories.map((mem) => (
              <div key={mem.id} className="p-6 hover:bg-fog/60 transition group">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <CategoryBadge category={mem.category} />
                      <PrivacyBadge privacy={mem.privacy} />
                      <StatusBadge status={mem.status} />
                      <SyncStateBadge syncState={mem.sync_state} />
                      <span className="text-[11px] text-ash-gray ml-1">
                        v{mem.version}
                      </span>
                    </div>

                    <p className="text-sm font-sans text-ink leading-relaxed pt-1">
                      {mem.text}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-gray pt-1">
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-ash-gray" />
                        {new Date(mem.created_at).toLocaleString()}
                      </span>
                      <span className="flex items-center gap-1.5 text-[11px]">
                        <Smartphone className="w-3.5 h-3.5 text-ash-gray" />
                        Device: {mem.device_id.slice(0, 8)}...
                      </span>
                      {mem.tags.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Tag className="w-3 h-3 text-ash-gray" />
                          {mem.tags.map((t) => (
                            <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-mist text-slate-gray">
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
                      className="p-2 rounded-full text-slate-gray hover:text-ink hover:bg-mist transition"
                    >
                      <History className="w-4 h-4" />
                    </button>
                    {mem.status === "active" && (
                      <>
                        <button
                          onClick={() => startEdit(mem)}
                          title="Edit Memory"
                          className="p-2 rounded-full text-slate-gray hover:text-ink hover:bg-mist transition"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleArchive(mem.id)}
                          title="Archive Memory"
                          className="p-2 rounded-full text-slate-gray hover:text-sienna hover:bg-peach/30 transition"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(mem.id)}
                          title="Delete (Tombstone)"
                          className="p-2 rounded-full text-slate-gray hover:text-sienna hover:bg-peach/30 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {mem.status === "archived" && (
                      <button
                        onClick={() => handleRestore(mem.id)}
                        title="Restore to Active"
                        className="p-2 rounded-full text-slate-gray hover:text-emerald-600 hover:bg-emerald-50 transition"
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
        <div className="p-5 border-t border-hairline bg-fog/30 flex items-center justify-between text-xs text-slate-gray">
          <span>Total: {total} records</span>
          <div className="flex items-center gap-3">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-4 py-1.5 rounded-full border border-hairline bg-paper text-ink hover:bg-mist transition disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-ink">Page {page}</span>
            <button
              disabled={page * pageSize >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-4 py-1.5 rounded-full border border-hairline bg-paper text-ink hover:bg-mist transition disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Edit Memory Modal */}
      {editingMemory && (
        <div className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper border border-hairline rounded-3xl w-full max-w-lg shadow-popover p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div>
                <h3 className="font-serif text-2xl font-normal text-ink">Edit Memory</h3>
                <p className="text-xs text-slate-gray mt-0.5">Creating revision snapshot v{editingMemory.version + 1}</p>
              </div>
              <button
                onClick={() => setEditingMemory(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-gray hover:text-ink hover:bg-mist transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submitEdit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs uppercase tracking-wider text-ash-gray font-normal">Text</label>
                <textarea
                  rows={4}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full bg-paper border border-hairline rounded-2xl p-4 text-sm text-ink placeholder:text-smoke-gray focus:outline-none focus:border-ink transition leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider text-ash-gray font-normal">Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-paper border border-hairline rounded-2xl p-3 text-xs text-ink focus:outline-none focus:border-ink"
                  >
                    <option value="important">Important</option>
                    <option value="normal">Normal</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs uppercase tracking-wider text-ash-gray font-normal">Privacy</label>
                  <select
                    value={editPrivacy}
                    disabled={editCategory === "private"}
                    onChange={(e) => setEditPrivacy(e.target.value)}
                    className="w-full bg-paper border border-hairline rounded-2xl p-3 text-xs text-ink focus:outline-none focus:border-ink disabled:opacity-50"
                  >
                    <option value="sync_allowed">Sync Allowed</option>
                    <option value="local_only">Local Only</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs uppercase tracking-wider text-ash-gray font-normal">Change Reason</label>
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Corrected gate timing"
                  className="w-full bg-paper border border-hairline rounded-2xl p-3.5 text-xs text-ink placeholder:text-smoke-gray focus:outline-none focus:border-ink"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setEditingMemory(null)}
                  className="px-5 py-2.5 text-xs font-normal text-ink border border-hairline rounded-full hover:bg-mist transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-normal bg-ink text-paper rounded-full hover:bg-ink/85 transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {selectedMemoryIdForVersion && (
        <VersionModal
          memoryId={selectedMemoryIdForVersion}
          isOpen={!!selectedMemoryIdForVersion}
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
