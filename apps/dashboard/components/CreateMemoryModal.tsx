"use client";

import React, { useState } from "react";
import { X, AlertCircle } from "lucide-react";
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
      .map((t) => t.trim())
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
    <div className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-paper border border-hairline rounded-3xl w-full max-w-lg shadow-popover overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-hairline flex items-center justify-between">
          <div>
            <h3 className="font-serif text-2xl font-normal text-ink">New Edge Memory</h3>
            <p className="text-xs text-slate-gray mt-0.5">Record and locally embed knowledge on this edge node</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-gray hover:text-ink hover:bg-mist transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-peach/40 border border-peach text-sienna text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-wider text-ash-gray font-normal">
              Memory Text *
            </label>
            <textarea
              required
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g., Gate 3 is closed for maintenance until 14:00 UTC."
              className="w-full bg-paper border border-hairline rounded-2xl p-4 text-sm text-ink placeholder:text-smoke-gray focus:outline-none focus:border-ink transition leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-wider text-ash-gray font-normal">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value as any)}
                className="w-full bg-paper border border-hairline rounded-2xl p-3 text-sm text-ink focus:outline-none focus:border-ink"
              >
                <option value="important">Important (Priority Sync)</option>
                <option value="normal">Normal (Standard Batch)</option>
                <option value="private">Private (Air-Gapped Only)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs uppercase tracking-wider text-ash-gray font-normal">
                Privacy Enforcement
              </label>
              <select
                value={privacy}
                disabled={category === "private"}
                onChange={(e) => setPrivacy(e.target.value as any)}
                className="w-full bg-paper border border-hairline rounded-2xl p-3 text-sm text-ink focus:outline-none focus:border-ink disabled:opacity-50"
              >
                <option value="sync_allowed">Sync Allowed (Cloud eligible)</option>
                <option value="local_only">Local Only (Never leaves device)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs uppercase tracking-wider text-ash-gray font-normal">
              Tags (comma separated)
            </label>
            <input
              type="text"
              value={tagsStr}
              onChange={(e) => setTagsStr(e.target.value)}
              placeholder="gate, security, maintenance"
              className="w-full bg-paper border border-hairline rounded-2xl p-3.5 text-sm text-ink placeholder:text-smoke-gray focus:outline-none focus:border-ink"
            />
          </div>

          <div className="pt-3 border-t border-hairline flex justify-end items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-full text-sm font-normal text-ink border border-hairline hover:bg-mist transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-full text-sm font-normal bg-ink text-paper hover:bg-ink/85 transition disabled:opacity-50"
            >
              {submitting ? "Saving & Indexing..." : "Save Memory"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
