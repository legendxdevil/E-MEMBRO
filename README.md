# E-MEMBRO

> **AI-Powered Edge Memory & Intelligence Platform**  
> *Edge AI that remembers, retrieves, and syncs smartly*

An **offline-first AI memory system** that stores memories locally on edge devices, computes dense vector embeddings on-device, performs semantic retrieval without internet connectivity, selectively synchronizes eligible memories to the cloud based on strict privacy rules, and detects/resolves contradictory memories across devices.

---

## Key Differentiators

1. **Selective Sync Engine (Core Uniqueness #1)**:
   - **Important**: High-priority queue, synced immediately upon connectivity.
   - **Normal**: Standard priority queue, batched efficiently.
   - **Private**: Strictly local-only, barred from cloud payloads with pre-upload privacy gates.
2. **Semantic Conflict Resolution (Core Uniqueness #2)**:
   - Identifies same-topic memories across devices using dense vector similarity.
   - Detects contradictions using opposing status pairs (`open` vs `closed`, `up` vs `down`, etc.).
   - Applies transparent resolution policy (newer timestamp wins authority; ties evaluate trust).
   - Preserves complete version history—the superseded memory is never deleted.
3. **100% Offline Local Operation**:
   - Local semantic search runs completely offline in ~**10.5 ms**.
   - Cloud connectivity is never required for memory creation, retrieval, or updates.

---

## Technology Stack

| Layer | Technology | Function |
|---|---|---|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, Lucide Icons | Responsive AI Infrastructure Dashboard |
| **Backend API** | Python 3.11/3.13, FastAPI, Pydantic v2 | REST API, validation, error handling |
| **Local Vector DB** | Qdrant Edge (Embedded Rust Core) | 100% local vector storage & cosine retrieval |
| **Local Embeddings** | FastEmbed (`BAAI/bge-small-en-v1.5`) | 384-dimensional dense vectors on CPU via ONNX |
| **Metadata & Queue** | SQLite (WAL mode, foreign keys) | Durable sync queue, version history, audit logs |
| **Cloud Vector DB** | Qdrant Cloud (Cluster hosted on GCP) | Shared cloud memory index |
| **Containerization** | Docker, Docker Compose | Repeatable multi-container deployment |
| **Testing** | Pytest, FastAPI TestClient | 20 automated tests passing |

---

## Quickstart & Local Setup

### 1. Prerequisites
- Python 3.11+
- Node.js 18+ & npm
- Qdrant Cloud Account & Cluster (hosted on GCP)
- Docker & Docker Compose (optional for containerized deployment)

### 2. Configure Qdrant Cloud & Environment
Create a cluster on [Qdrant Cloud](https://cloud.qdrant.io/) (select GCP as cloud provider). Retrieve your cluster endpoint URL and API key, copy `.env.example` to `.env`, and fill in the values:

```bash
cp .env.example .env
```

Ensure `.env` contains:
```env
QDRANT_CLOUD_URL=https://your-cluster-id.gcp.cloud.qdrant.io:6333
QDRANT_CLOUD_API_KEY=your-api-key-here
```

### 3. Run Locally (Fastest)

#### Backend (FastAPI Edge Service)
```bash
# In the project root
python -m pip install -r services/api/requirements.txt
python -m uvicorn app.main:app --app-dir services/api --reload --port 8000
```
- API will be accessible at: `http://localhost:8000`
- Interactive Swagger Docs: `http://localhost:8000/docs`
- On boot, the server automatically checks connectivity to your Qdrant Cloud cluster and logs the result.

#### Frontend (Next.js Dashboard)
```bash
cd apps/dashboard
npm install
npm run dev
```
- Dashboard will be accessible at: `http://localhost:3000`

---

## Run with Docker Compose

To launch the containerized Edge API and Dashboard:

```bash
docker-compose up --build
```
- Web Dashboard: `http://localhost:3000`
- Edge API: `http://localhost:8000`
- API connects directly to your Qdrant Cloud GCP cluster using `.env`.

---

## Running Automated Tests

Run the full pytest suite (20 automated tests covering memories, search, sync, conflicts, security, and errors):

```bash
python -m pytest -v
```

---

## Running the Master Demo Script

A standalone demonstration script exercises the full end-to-end lifecycle autonomously:

```bash
python scripts/demo_scenario.py
```

### Measured Benchmark Output:
```text
======================================================================
BENCHMARK & PERFORMANCE MEASUREMENTS
======================================================================
  • Total Active Memories:        3
  • Important Memories:           1
  • Normal Memories:              1
  • Private (Local-Only):         1
  • Superseded (History):         2
  • Succeeded Sync Operations:    4
  • Resolved Conflicts:           3
  • Local Search Latency (p50):   10.51 ms
  • Memory Creation Time:         18.73 ms
======================================================================
Master Demo Completed with 100% Success!
```

---

## Dashboard Pages & Features

1. **Overview Dashboard** (`/`): Real-time metrics for active, important, private memories, sync queue status, and search latency.
2. **Memory Explorer** (`/memories`): Filterable memory explorer with CRUD actions, tombstone deletion, and version history drawer.
3. **Semantic Search** (`/search`): Natural language query interface with relevance score percentage, threshold slider, and offline mode indicator.
4. **Sync Center** (`/sync`): Durable SQLite queue management, offline simulation toggle, pause/resume sync, retry failed jobs.
5. **Conflict Viewer** (`/conflicts`): Side-by-side comparison of contradictory memories across devices, detected contradiction rule, and manual resolution controls.
6. **Device Registry** (`/devices`): Registered edge devices, heartbeats, and node registration modal.
7. **Activity Log** (`/activity`): Immutable audit feed with verified redaction of private memory content.
8. **Settings** (`/settings`): Runtime configuration, network simulation toggles, and one-click demo data seeder.

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `8000` | Edge API port |
| `DEVICE_ID` | `00000000-0000-0000-0000-000000000001` | Edge Node UUID |
| `SQLITE_DB_PATH` | `data/edge_memory.db` | Local SQLite database file |
| `EDGE_QDRANT_PATH` | `data/qdrant_edge` | Local embedded Qdrant storage |
| `QDRANT_CLOUD_URL` | *(Required from .env)* | Qdrant Cloud cluster endpoint (e.g. `https://your-cluster-id.gcp.cloud.qdrant.io:6333`) |
| `QDRANT_CLOUD_API_KEY` | *(Required from .env)* | Qdrant Cloud API access key |
| `RATE_LIMIT_READ` | `60` | Max read/search requests per minute |
| `RATE_LIMIT_WRITE` | `30` | Max create/update requests per minute |
| `RATE_LIMIT_SYNC` | `10` | Max sync batch requests per minute |

---

## Documentation Links

- [Architecture Specification](file:///c:/Users/nandk/Desktop/Project/edge%20memory/docs/ARCHITECTURE.md)
- [API Reference Manual](file:///c:/Users/nandk/Desktop/Project/edge%20memory/docs/API.md)
- [Security & Privacy Architecture](file:///c:/Users/nandk/Desktop/Project/edge%20memory/docs/SECURITY.md)
- [Test Plan & Benchmark Report](file:///c:/Users/nandk/Desktop/Project/edge%20memory/docs/TEST_PLAN.md)
- [Implementation Status](file:///c:/Users/nandk/Desktop/Project/edge%20memory/docs/IMPLEMENTATION_STATUS.md)
