"use client";

import React, { useEffect, useState } from "react";
import {
  Plus,
  Server,
  X
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
      setDevices(data);
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
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-ash-gray font-normal mb-1">
            Hardware Topology
          </div>
          <h1 className="font-serif text-3xl lg:text-4xl font-normal tracking-tight text-ink">
            Device <span className="italic">Registry</span>
          </h1>
          <p className="text-sm text-slate-gray mt-1 max-w-xl">
            Physical edge nodes, local embedded vector stores, and peer synchronization state.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="px-5 py-2.5 rounded-full text-xs font-normal bg-ink text-paper hover:bg-ink/85 flex items-center gap-2 transition shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          Register Node
        </button>
      </div>

      {/* Device Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-24 text-center text-slate-gray text-xs">
            Loading registered edge nodes...
          </div>
        ) : devices.length === 0 ? (
          <div className="col-span-full py-24 text-center text-slate-gray text-xs">
            No devices registered.
          </div>
        ) : (
          devices.map((dev) => (
            <div
              key={dev.id}
              className="bg-paper border border-hairline hover:border-slate-gray/30 rounded-3xl p-6 shadow-artifact flex flex-col justify-between h-full transition"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-full bg-mist flex items-center justify-center text-ink">
                    <Server className="w-4 h-4 text-slate-gray" />
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {dev.sync_status}
                  </span>
                </div>

                <div>
                  <h3 className="font-serif text-xl font-normal text-ink">{dev.name}</h3>
                  <div className="text-xs text-ash-gray mt-0.5 truncate">
                    ID: {dev.id}
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-hairline space-y-2 text-xs text-slate-gray">
                <div className="flex justify-between">
                  <span className="text-ash-gray">Form Factor:</span>
                  <span className="text-ink font-normal">{dev.device_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ash-gray">Engine Version:</span>
                  <span className="text-ink font-normal">v{dev.app_version}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ash-gray">Last Seen:</span>
                  <span className="text-ink font-normal">
                    {new Date(dev.last_seen).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ash-gray">Registered:</span>
                  <span className="text-ink font-normal">
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
        <div className="fixed inset-0 z-50 bg-ink/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-paper border border-hairline rounded-3xl w-full max-w-md shadow-popover p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-hairline pb-4">
              <div>
                <h3 className="font-serif text-2xl font-normal text-ink">Register Edge Node</h3>
                <p className="text-xs text-slate-gray mt-0.5">Enroll a physical hardware client into cluster registry</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-gray hover:text-ink hover:bg-mist transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs uppercase tracking-wider text-ash-gray font-normal">Node Display Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Field Tablet Alpha"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-paper border border-hairline rounded-2xl p-3.5 text-sm text-ink placeholder:text-smoke-gray focus:outline-none focus:border-ink"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs uppercase tracking-wider text-ash-gray font-normal">Device Form Factor</label>
                <select
                  value={deviceType}
                  onChange={(e) => setDeviceType(e.target.value)}
                  className="w-full bg-paper border border-hairline rounded-2xl p-3 text-xs text-ink focus:outline-none focus:border-ink cursor-pointer"
                >
                  <option value="edge_device">Edge Device (General)</option>
                  <option value="field_laptop">Field Laptop</option>
                  <option value="mobile_terminal">Mobile Terminal</option>
                  <option value="gateway_hub">Gateway Hub</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-hairline">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2 rounded-full text-xs font-normal text-ink border border-hairline hover:bg-mist transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 rounded-full text-xs font-normal bg-ink text-paper hover:bg-ink/85 transition"
                >
                  {submitting ? "Registering..." : "Register Node"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
