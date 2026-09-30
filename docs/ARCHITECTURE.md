# E-MEMBRO — Architecture Specification

## 1. Overview & Vision
The **E-MEMBRO** platform is an offline-first AI memory and intelligence platform designed to store notes, context, and operational data directly on edge devices (field tablets, laptops, IoT gateways). It provides **local semantic search** without internet connectivity, performs **selective cloud synchronization** based on privacy and priority policies, and intelligently detects and resolves **semantic contradictions** across multiple devices.

---

## 2. Core Architecture Differentiators

### A. Selective Sync Engine (Core Uniqueness #1)
Rather than blindly syncing all data or relying on all-or-nothing cloud storage:
- **Important**: Enqueued in high-priority durable queue; synchronized immediately upon network availability.
- **Normal**: Enqueued in standard priority queue; batched for efficient bandwidth utilization.
- **Private**: Automatically tagged `local_only`; strictly barred from entering cloud sync batches.
- **Pre-Upload Privacy Gate**: Re-evaluates privacy status immediately before transmission. If a memory was transitioned from public to private while queued, the upload is blocked and preserved locally.

### B. Semantic Conflict Resolution Engine (Core Uniqueness #2)
Multi-device edge environments inevitably experience competing observations:
1. **Candidate Retrieval**: Uses dense vector cosine similarity against cloud memory index to find topical neighbors (e.g., statements concerning "Gate 3").
2. **Contradiction Rule Analysis**: Dissects candidate statements using explicit opposing status pairs (`open` vs `closed`, `up` vs `down`, `active` vs `inactive`, `locked` vs `unlocked`) and negation patterns.
3. **Transparent Resolution Policy**:
   - Compares verifiable UTC timestamps: Newer timestamp wins authority.
   - Tied timestamps evaluate server-assigned device trust levels.
   - Ambiguous or tie cases transition to `needs_review` state without silent data loss.
4. **Non-Destructive History**: The superseded memory is never deleted; its status transitions to `superseded` and links to the winning record.

---

## 3. Component Architecture & Data Flow

```text
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Web Dashboard                    │
│   (Overview, Memory Explorer, Semantic Search, Sync Center, │
│        Conflict Viewer, Device Manager, Activity Logs)      │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON REST API
┌──────────────────────────────▼──────────────────────────────┐
│                    FastAPI Edge Service                     │
│    (Rate Limiting, Request Validation, Error Handler)       │
├──────────────────────────────┬──────────────────────────────┤
│       Local Edge Path        │          Cloud Path          │
│   ┌──────────────────────┐   │   ┌──────────────────────┐   │
│   │ FastEmbed ONNX Model │   │   │ Cloud Sync Resolver  │   │
│   │ (bge-small-en-v1.5)  │   │   │  & Conflict Engine   │   │
│   └──────────┬───────────┘   │   └──────────┬───────────┘   │
│              ▼               │              ▼               │
│   ┌──────────────────────┐   │   ┌──────────────────────┐   │
│   │  Qdrant Edge Vector  │   │   │ Qdrant Server Cloud  │   │
│   │ (Local Embedded Rust)│   │   │ (Shared Memory Index)│   │
│   └──────────┬───────────┘   │   └──────────┬───────────┘   │
│              ▼               │              ▼               │
│   ┌──────────────────────┐   │   ┌──────────────────────┐   │
│   │   SQLite Database    │   │   │ Cloud Audit Records  │   │
│   │ (Metadata & Queues)  │   │   │   & Tombstones       │   │
│   └──────────────────────┘   │   └──────────────────────┘   │
└──────────────────────────────┴──────────────────────────────┘
```

---

## 4. Storage Engine Details

### 1. SQLite Edge Repository
- **File**: `data/edge_memory.db`
- **Configuration**: `PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA synchronous = NORMAL;`
- **Tables**:
  - `memories`: Core metadata, sync states, status, version number, categories.
  - `memory_versions`: Immutable historical snapshots with diff tracking.
  - `sync_jobs`: Persistent durable queue with backoff schedules and idempotency keys.
  - `conflict_records`: Audited conflict candidate pairs, detection reasons, and resolution states.
  - `activity_events`: Privacy-redacted event log.
  - `devices`: Device registry and heartbeat records.
  - `sync_acknowledgements`: Idempotency registry for deduplication.

### 2. Qdrant Edge Vector Store (Embedded Mode)
- **Path**: `data/qdrant_edge`
- **Collection**: `edge_memories`
- **Configuration**: 384-dimensional dense vectors with Cosine distance metric.
- **Embedded Engine**: Powered by Qdrant's embedded Rust core, enabling 100% on-device search with zero network hops.

### 3. FastEmbed ONNX Engine
- **Model**: `BAAI/bge-small-en-v1.5`
- **Execution**: OnnxRuntime CPU execution with local caching in `.cache/huggingface/hub/`.
- **Validation**: Strict finite float checks (rejecting NaN, +/- Infinity) and dimension verification.

---

## 5. Offline-First Guarantee & Circuit Breaker
- When disconnected or simulating offline mode, local creation, editing, deletion (tombstoning), and semantic search operate without latency degradation.
- The selective sync engine preserves queue jobs durably.
- Repeated upstream failures increment failure counts; 3 consecutive errors trip the **Circuit Breaker** into an OPEN state for 30 seconds to prevent thundering herd retries.
