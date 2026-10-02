"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  Server,
  X,
  Smartphone,
  Cpu,
  CheckCircle2,
  HardDrive,
  Clock,
  Sparkles
} from "lucide-react";
import { api, Device } from "../../lib/api";

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [deviceType, setDeviceType] = useState("edge_device");
  const [submitting, setSubmitting] = useState(false);

  const loadDevices = async () => {
    try {
      const data = await api.listDevices();
      setDevices(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await api.registerDevice({
        name: name.trim(),
        device_type: deviceType,
      });
      setName("");
      setModalOpen(false);
      loadDevices();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-panel rounded-3xl p-6 md:p-8 border border-white/10 glow-border">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 font-semibold">
              Hardware Cluster Mesh
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs font-mono text-emerald-400">{devices.length} Nodes Registered</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Device Mesh Registry
          </h1>
          <p className="text-xs md:text-sm text-slate-400 font-light mt-1">
            Physical edge hardware nodes, embedded vector stores, and peer synchronization states.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 text-white shadow-glow flex items-center gap-2 transition duration-200 cursor-pointer self-start sm:self-center shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Enroll Node
        </button>
      </div>

      {/* Device Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-24 text-center text-slate-400 text-xs font-mono">
            Scanning cluster registry for physical edge devices...
          </div>
        ) : devices.length === 0 ? (
          <div className="col-span-full py-24 text-center text-slate-400 text-xs font-mono">
            No devices enrolled in this local cluster.
          </div>
        ) : (
          devices.map((dev) => (
            <div
              key={dev.id}
              className="glass-panel rounded-3xl p-6 border border-white/10 hover:border-cyan-500/40 transition flex flex-col justify-between h-full group glow-border"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition">
                    <Server className="w-5 h-5" />
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-300 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-glow-emerald" />
                    {dev.sync_status}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition">{dev.name}</h3>
                  <div className="text-[11px] font-mono text-slate-500 mt-1 truncate">
                    UUID: {dev.id}
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-white/5 space-y-2.5 text-xs font-mono text-slate-400">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Form Factor:</span>
                  <span className="text-slate-200 uppercase">{dev.device_type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Engine Build:</span>
                  <span className="text-cyan-400">v{dev.app_version}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Heartbeat:</span>
                  <span className="text-slate-200">
                    {new Date(dev.last_seen).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Enrolled:</span>
                  <span className="text-slate-200">
                    {new Date(dev.registered_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Register Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="glass-panel-elevated rounded-3xl w-full max-w-md shadow-popover p-6 space-y-5 border border-white/10 glow-border">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white">Enroll Edge Node</h3>
                <p className="text-xs text-slate-400 font-mono">Register physical hardware into local cluster mesh</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 font-medium">Node Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Field Tablet Alpha"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full glass-input rounded-xl p-3.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 font-medium">Device Form Factor</label>
                <select
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  className="w-full glass-input rounded-xl p-3 text-xs text-slate-200 focus:outline-none cursor-pointer"
                >
                  <option value="edge_device">Edge Device (General)</option>
                  <option value="field_laptop">Field Laptop</option>
                  <option value="sensor_pod">Sensor Pod Node</option>
                  <option value="tablet">Rugged Tablet</option>
                </select>
              </div>

              <div className="pt-3 border-t border-white/10 flex justify-end items-center gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 text-white shadow-glow transition disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Enrolling..." : "Enroll Device"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
