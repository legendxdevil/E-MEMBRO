"use client";

import React, { useState } from "react";
import { X, AlertCircle, Shield, Brain, Sparkles, Tag, Plus } from "lucide-react";
import { api } from "../lib/api";

interface CreateMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateMemoryModal({ isOpen, onClose, onSuccess }: CreateMemoryModalProps) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState<"important" | "normal" | "private">("normal");
  const [privacy, setPrivacy] = useState<"sync_allowed" | "local_only">("sync_allowed");
  const [tagsStr, setTagsStr] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCategoryChange = (cat: "important" | "normal" | "private") => {
    setCategory(cat);
    if (cat === "private") {
      setPrivacy("local_only");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      setError("Memory text cannot be empty.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const tags = tagsStr
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    try {
      await api.createMemory({
        text: text.trim(),
        category,
        privacy,
        tags,
      });
      setText("");
      setTagsStr("");
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create memory.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="glass-panel-elevated rounded-3xl w-full max-w-lg shadow-popover overflow-hidden border border-white/10 glow-border">
        {/* Modal Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-glow">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white tracking-tight">Record Edge Memory</h3>
              <p className="text-xs text-slate-400 font-mono">Real-time local vector embedding & storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 font-medium">
              Memory Content *
            </label>
            <textarea
              required
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Gate 3 is closed for maintenance until 14:00 UTC."
              className="w-full glass-input rounded-2xl p-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition leading-relaxed resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 font-medium">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as any)}
                className="w-full glass-input rounded-2xl p-3 text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="important">Important (Immediate Sync)</option>
                <option value="normal">Normal (Batch Sync)</option>
                <option value="private">Private (Air-Gapped Only)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 font-medium">
                Privacy Enforcement
              </label>
              <select
                value={privacy}
                disabled={category === "private"}
                onChange={(e) => setPrivacy(e.target.value as any)}
                className="w-full glass-input rounded-2xl p-3 text-xs text-slate-200 focus:outline-none disabled:opacity-40 cursor-pointer"
              >
                <option value="sync_allowed">Sync Allowed (Cloud eligible)</option>
                <option value="local_only">Local Only (Never leaves edge)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 font-medium flex items-center justify-between">
              <span>Tags (comma separated)</span>
              <span className="text-[10px] text-slate-500 lowercase">e.g. gate, security</span>
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="perimeter, gate-3, scheduled"
                className="w-full glass-input rounded-2xl pl-10 pr-4 py-3 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex justify-end items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white flex items-center gap-2 transition duration-200 shadow-glow disabled:opacity-50 cursor-pointer active:scale-95"
            >
              {submitting ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  Embedding Vector...
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  Save & Embed Memory
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
