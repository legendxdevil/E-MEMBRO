/**
 * E-MEMBRO Dashboard API Client
 * Connects to the local Edge Memory Platform backend.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" ? "" : "http://localhost:8000");

// Types & Interfaces
export interface Memory {
  id: string;
  device_id: string;
  text: string;
  embedding_ref?: string | null;
  category: "important" | "normal" | "private" | string;
  privacy: "sync_allowed" | "local_only" | string;
  tags: string[];
  source: string;
  source_trust: number;
  created_at: string;
  updated_at: string;
  version: number;
  status: "active" | "archived" | "superseded" | "deleted" | string;
  sync_state: "local_only" | "pending" | "synced" | "conflict" | "blocked" | string;
  supersedes?: string | null;
  conflict_group_id?: string | null;
}

export interface MemoryListResponse {
  memories: Memory[];
  total: number;
  page: number;
  page_size: number;
}

export interface MemoryVersion {
  id: string;
  memory_id: string;
  version_number: number;
  text_snapshot: string;
  category_snapshot: string;
  privacy_snapshot: string;
  source_device_id: string;
  source_trust: number;
  created_at: string;
  change_reason: string;
  is_current: boolean;
}

export interface SearchResultItem {
  memory_id: string;
  text: string;
  score: number;
  category: string;
  privacy: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  status: string;
}

export interface SearchResponse {
  offline: boolean;
  query: string;
  total_results: number;
  results: SearchResultItem[];
  latency_ms: number;
}

export interface SyncStatus {
  is_online: boolean;
  sync_enabled: boolean;
  offline_simulation: boolean;
  circuit_breaker_open: boolean;
  pending_jobs_count: number;
  failed_jobs_count: number;
  succeeded_jobs_count: number;
  blocked_private_count: number;
  last_sync_time?: string | null;
  active_device_id: string;
}

export interface SyncJob {
  id: string;
  memory_id: string;
  operation: string;
  priority: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "blocked" | string;
  attempt_count: number;
  next_attempt_at?: string | null;
  last_error?: string | null;
  idempotency_key: string;
  created_at: string;
  updated_at: string;
}

export interface ConflictRecord {
  id: string;
  memory_a_id: string;
  memory_b_id: string;
  conflict_type: string;
  state: "needs_review" | "resolved" | "candidate" | string;
  decision: "none" | "a_wins" | "b_wins" | "merged" | string;
  decision_reason: string;
  resolved_memory_id?: string | null;
  created_at: string;
  resolved_at?: string | null;
  memory_a?: Memory | null;
  memory_b?: Memory | null;
}

export interface Device {
  id: string;
  name: string;
  device_type: string;
  last_seen: string;
  sync_status: string;
  registered_at: string;
  is_revoked: boolean;
  app_version: string;
}

export interface ActivityEvent {
  id: string;
  event_type: string;
  actor_device_id: string;
  memory_id?: string | null;
  sync_job_id?: string | null;
  details: Record<string, any>;
  created_at: string;
}

export interface Metrics {
  total_active_memories: number;
  important_memories_count: number;
  normal_memories_count: number;
  private_memories_count: number;
  archived_memories_count: number;
  superseded_memories_count: number;
  pending_sync_jobs: number;
  failed_sync_jobs: number;
  total_sync_completed: number;
  open_conflicts_count: number;
  resolved_conflicts_count: number;
  last_search_latency_ms: number;
  average_search_latency_ms: number;
  total_searches_performed: number;
  is_online: boolean;
  offline_simulation: boolean;
}

export interface HealthInfo {
  status: string;
  app: string;
  version: string;
  offline_simulation?: boolean;
  edge_device_id?: string;
}

// Helper fetch wrapper
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status} ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson.error?.message) {
        errorMessage = errorJson.error.message;
      } else if (errorJson.detail) {
        errorMessage =
          typeof errorJson.detail === "string"
            ? errorJson.detail
            : JSON.stringify(errorJson.detail);
      }
    } catch {
      // response wasn't JSON
    }
    throw new Error(errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // --- Metrics & Activity ---
  getMetrics: (): Promise<Metrics> => request<Metrics>("/api/v1/metrics"),

  listActivity: (eventType?: string, limit = 100): Promise<ActivityEvent[]> => {
    const params = new URLSearchParams();
    if (eventType) params.set("event_type", eventType);
    if (limit) params.set("limit", limit.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<ActivityEvent[]>(`/api/v1/activity${query}`);
  },

  // --- Memories ---
  listMemories: (params?: {
    category?: string;
    status?: string;
    privacy?: string;
    sync_state?: string;
    q?: string;
    page?: number;
    page_size?: number;
  }): Promise<MemoryListResponse> => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set("category", params.category);
    if (params?.status) searchParams.set("status", params.status);
    if (params?.privacy) searchParams.set("privacy", params.privacy);
    if (params?.sync_state) searchParams.set("sync_state", params.sync_state);
    if (params?.q) searchParams.set("q", params.q);
    if (params?.page) searchParams.set("page", params.page.toString());
    if (params?.page_size) searchParams.set("page_size", params.page_size.toString());
    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return request<MemoryListResponse>(`/api/v1/memories${query}`);
  },

  getMemory: (id: string): Promise<Memory> => request<Memory>(`/api/v1/memories/${id}`),

  createMemory: (data: {
    text: string;
    category?: string;
    privacy?: string;
    tags?: string[];
    source?: string;
    source_trust?: number;
  }): Promise<Memory> =>
    request<Memory>("/api/v1/memories", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateMemory: (
    id: string,
    data: {
      text?: string;
      category?: string;
      privacy?: string;
      tags?: string[];
      change_reason?: string;
    }
  ): Promise<Memory> =>
    request<Memory>(`/api/v1/memories/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  archiveMemory: (id: string): Promise<Memory> =>
    request<Memory>(`/api/v1/memories/${id}/archive`, {
      method: "POST",
    }),

  restoreMemory: (id: string): Promise<Memory> =>
    request<Memory>(`/api/v1/memories/${id}/restore`, {
      method: "POST",
    }),

  deleteMemory: (id: string): Promise<{ success: boolean; message?: string }> =>
    request<{ success: boolean; message?: string }>(`/api/v1/memories/${id}`, {
      method: "DELETE",
    }),

  getMemoryVersions: (id: string): Promise<MemoryVersion[]> =>
    request<MemoryVersion[]>(`/api/v1/memories/${id}/versions`),

  // --- Semantic Search ---
  search: (data: {
    query: string;
    limit?: number;
    threshold?: number;
    filters?: {
      category?: string[];
      status?: string[];
      tags?: string[];
      from_date?: string;
      to_date?: string;
    };
  }): Promise<SearchResponse> =>
    request<SearchResponse>("/api/v1/search", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // --- Selective Sync ---
  getSyncStatus: (): Promise<SyncStatus> => request<SyncStatus>("/api/v1/sync/status"),

  listSyncJobs: (status?: string, limit = 100): Promise<SyncJob[]> => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (limit) params.set("limit", limit.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<SyncJob[]>(`/api/v1/sync/jobs${query}`);
  },

  processSyncQueue: (): Promise<{ message?: string; [key: string]: any }> =>
    request<{ message?: string; [key: string]: any }>("/api/v1/sync/process", {
      method: "POST",
    }),

  toggleOfflineSimulation: (offline: boolean): Promise<{ offline_simulation: boolean; message: string }> =>
    request<{ offline_simulation: boolean; message: string }>("/api/v1/sync/offline-simulation", {
      method: "POST",
      body: JSON.stringify({ offline }),
    }),

  toggleSync: (enabled: boolean): Promise<{ sync_enabled: boolean; message: string }> =>
    request<{ sync_enabled: boolean; message: string }>("/api/v1/sync/toggle", {
      method: "POST",
      body: JSON.stringify({ enabled }),
    }),

  retrySyncJob: (jobId: string): Promise<{ success: boolean; message: string }> =>
    request<{ success: boolean; message: string }>(`/api/v1/sync/jobs/${jobId}/retry`, {
      method: "POST",
    }),

  // --- Conflicts ---
  listConflicts: (state?: string): Promise<ConflictRecord[]> => {
    const query = state ? `?state=${encodeURIComponent(state)}` : "";
    return request<ConflictRecord[]>(`/api/v1/conflicts${query}`);
  },

  getConflict: (id: string): Promise<ConflictRecord> =>
    request<ConflictRecord>(`/api/v1/conflicts/${id}`),

  resolveConflict: (
    id: string,
    data: {
      decision: string;
      decision_reason: string;
      resolved_memory_id?: string;
    }
  ): Promise<ConflictRecord> =>
    request<ConflictRecord>(`/api/v1/conflicts/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // --- Devices ---
  listDevices: (): Promise<Device[]> => request<Device[]>("/api/v1/devices"),

  getDevice: (id: string): Promise<Device> => request<Device>(`/api/v1/devices/${id}`),

  registerDevice: (data: {
    name: string;
    device_type?: string;
    app_version?: string;
    id?: string;
  }): Promise<Device> =>
    request<Device>("/api/v1/devices/register", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // --- Demo Seeding & Health ---
  seedDemo: (): Promise<any> =>
    request<any>("/api/v1/seed/demo", {
      method: "POST",
    }),

  getHealth: (): Promise<HealthInfo> => request<HealthInfo>("/health"),
};
