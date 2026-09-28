# Edge Memory Platform --- Complete Functional & Logic Specification

**Project:** AI-Powered Edge Memory & Intelligence Platform\
**Tagline:** *Edge AI that remembers, retrieves, and syncs smartly*\
**Purpose:** Offline-first memory system that stores information
on-device, supports semantic search without internet, selectively syncs
eligible memories to the cloud, and detects conflicting information
across devices.

> **Implementation honesty:** This document defines the intended
> behavior and architecture. Features marked **MVP** are the first build
> target. Features marked **Future Scope** are not assumed to be
> implemented. Verify the current Qdrant Edge SDK/API and platform
> support before implementation, as Edge capabilities may evolve.

------------------------------------------------------------------------

## 1. Product Goals

1.  Store notes/events locally on an edge device.
2.  Search memories by meaning, even while offline.
3.  Classify each memory as **Important**, **Normal**, or **Private**.
4.  Sync eligible memories to the cloud when connectivity is available.
5.  Detect likely contradictory memories across devices.
6.  Preserve prior versions and expose decisions through a transparent
    activity log.
7.  Provide a dashboard for memory, search, sync status, conflicts, and
    device activity.

### Core differentiators

-   **Selective Sync:** Decide what leaves the device, when it leaves,
    and what must never sync.
-   **Semantic Conflict Resolution:** Find related memories, detect
    likely contradictions, apply a transparent policy, and retain
    history.

------------------------------------------------------------------------

## 2. Scope

### MVP (build first)

-   Add, view, edit, archive, and delete memories.
-   Generate embeddings and perform local semantic search.
-   Offline mode and local-first operation.
-   Memory privacy/priority labels: Important, Normal, Private.
-   Persistent sync queue with retry behavior.
-   Cloud sync to Qdrant Server through a backend API.
-   Conflict candidate detection and rule-based resolution.
-   Version history and activity log.
-   Dashboard with memory list, search, sync status, conflict viewer,
    and logs.
-   Basic metrics: local search latency, sync counts, queue size,
    conflict counts.

### Future Scope (design for extension; do not claim as implemented)

-   Advanced privacy tiers and policy-based access control.
-   Memory lifecycle: hot / warm / cold storage and retention policies.
-   Cloud-to-edge prefetch of relevant memories.
-   CRDT-style multi-device synchronization.
-   Mobile app (React Native + Expo).
-   More advanced contradiction detection using a dedicated NLI/LLM
    model.
-   Encryption at rest, key management, authentication/authorization
    hardening, and production-grade security review.

------------------------------------------------------------------------

## 3. Proposed Technology Stack

  -----------------------------------------------------------------------
  Layer                   Technology              Responsibility
  ----------------------- ----------------------- -----------------------
  Dashboard               Next.js + TypeScript    Web UI

  Styling/components      Tailwind CSS +          Responsive interface
                          shadcn/ui               

  Backend API             Python + FastAPI        Validation,
                                                  orchestration, cloud
                                                  API

  Edge vector store       Qdrant Edge             Local vector storage
                                                  and semantic retrieval

  Embeddings              FastEmbed               Convert text into
                                                  vectors

  Cloud vector store      Qdrant Server           Shared cloud memory
                                                  index

  Local metadata / queue  SQLite                  Metadata, sync jobs,
                                                  version references,
                                                  local activity

  Sync and policy engine  Python                  Selective sync,
                                                  retries, reconciliation

  Conflict engine         Python rules + vector   Detect candidates and
                          similarity              apply documented policy

  Containerization        Docker / Docker Compose Repeatable local/cloud
                                                  services

  Future mobile client    React Native + Expo     Mobile interface
  -----------------------------------------------------------------------

**Important architecture note:** Keep the local search path independent
from the cloud. The exact Qdrant Edge SDK integration should be
validated early. If a required operation is unavailable in the chosen
SDK, isolate it behind a storage adapter so the rest of the application
does not depend on a specific API.

------------------------------------------------------------------------

## 4. High-Level Architecture

``` text
                 ┌────────────────────────────┐
                 │ Next.js Dashboard          │
                 │ Memories / Search / Sync   │
                 │ Conflicts / Activity       │
                 └─────────────┬──────────────┘
                               │ HTTP
                 ┌─────────────▼──────────────┐
                 │ FastAPI Application        │
                 │ Validation + Orchestration │
                 └───────┬───────────┬────────┘
                         │           │
                 Local/Edge path     Cloud path
                         │           │
           ┌─────────────▼───┐   ┌───▼────────────────┐
           │ Embedding Model │   │ Sync API / Resolver│
           │ FastEmbed       │   └───┬────────────────┘
           └─────────┬───────┘       │
                     │               ▼
           ┌─────────▼───────┐   ┌────────────────────┐
           │ Qdrant Edge     │   │ Qdrant Server      │
           │ Local vectors   │   │ Shared vectors     │
           └─────────┬───────┘   └─────────┬──────────┘
                     │                     │
           ┌─────────▼───────┐   ┌─────────▼──────────┐
           │ SQLite          │   │ Version / audit    │
           │ Metadata + queue│   │ records            │
           └─────────────────┘   └────────────────────┘
```

### Offline guarantee

When offline, the app should still support local memory creation, local
retrieval, viewing local history, and adding eligible changes to a
durable sync queue. Cloud-only operations should show a clear
offline/pending state instead of failing silently.

------------------------------------------------------------------------

## 5. Core Data Model

Use UUIDs for identifiers and UTC timestamps in ISO-8601 format.

### 5.1 Memory

``` json
{
  "id": "uuid",
  "device_id": "uuid",
  "text": "Gate 3 is closed",
  "embedding_ref": "vector-record-id",
  "category": "important",
  "privacy": "sync_allowed",
  "tags": ["gate", "status"],
  "source": "manual",
  "source_trust": 1,
  "created_at": "ISO-8601 UTC",
  "updated_at": "ISO-8601 UTC",
  "version": 1,
  "status": "active",
  "sync_state": "pending",
  "supersedes": null,
  "conflict_group_id": null
}
```

### 5.2 Enumerations

-   `category`: `important | normal | private`
-   `privacy`: `sync_allowed | local_only`
-   `status`: `active | archived | superseded | deleted`
-   `sync_state`:
    `local_only | pending | syncing | synced | failed | blocked`
-   `source`: `manual | imported | device_event | cloud`
-   `conflict_state`: `candidate | resolved | needs_review | dismissed`

### 5.3 Sync Job

Fields: - `id` - `memory_id` - `operation`:
`create | update | archive | delete` - `priority`:
`high | normal | low` - `status`:
`pending | processing | succeeded | failed | blocked` -
`attempt_count` - `next_attempt_at` - `last_error` - `created_at` -
`updated_at`

### 5.4 Memory Version

Fields: - `id` - `memory_id` - `version_number` - `text_snapshot` -
`category_snapshot` - `source_device_id` - `source_trust` -
`created_at` - `change_reason` - `is_current`

### 5.5 Conflict Record

Fields: - `id` - `memory_a_id` - `memory_b_id` - `conflict_type`:
`contradiction_candidate | concurrent_update | duplicate` - `state` -
`decision`: `a_wins | b_wins | needs_review | dismissed` -
`decision_reason` - `resolved_memory_id` - `created_at` - `resolved_at`

### 5.6 Activity Event

Fields: - `id` - `event_type` - `actor_device_id` - `memory_id`
(nullable) - `sync_job_id` (nullable) - `details` (JSON) - `created_at`

Do not put private memory text into cloud activity logs. For private
records, log only minimal local metadata.

------------------------------------------------------------------------

## 6. Functional Modules

## 6.1 Memory Manager

### Functions

-   `create_memory(text, category, privacy, tags, source)`
-   `get_memory(memory_id)`
-   `list_memories(filters, pagination)`
-   `update_memory(memory_id, changes)`
-   `archive_memory(memory_id)`
-   `delete_memory(memory_id)`
-   `restore_memory(memory_id)` (optional MVP)
-   `get_memory_versions(memory_id)`

### Create-memory logic

1.  Validate text is not empty and is within configured length limits.
2.  Validate category and privacy values.
3.  Generate UUID and timestamps.
4.  Create embedding locally.
5.  Store memory payload/vector in local vector store.
6.  Store metadata and initial version in SQLite.
7.  If category is `private` or privacy is `local_only`, set sync state
    to `blocked` or `local_only` and do not enqueue cloud sync.
8.  Otherwise create a sync job: Important → high priority; Normal →
    normal/low priority.
9.  Add an activity event.
10. Return the saved memory and its local sync state.

### Update-memory logic

1.  Fetch the current memory and verify it exists and is editable.
2.  Save the current state as a version snapshot.
3.  Apply changes and increment version.
4.  Regenerate embedding if text changed.
5.  Update local vector and metadata.
6.  If now private/local-only, cancel or block pending sync jobs and
    mark it as local-only. If it was previously synced, enqueue a cloud
    tombstone/redaction request according to the product's privacy
    policy; do not imply that remote copies can be erased unless the
    server confirms it.
7.  If sync-eligible, enqueue an update job.
8.  Record activity.

### Delete-memory logic

-   Prefer a soft delete/tombstone for sync consistency.
-   Remove from active search results immediately.
-   Preserve the version/audit record according to retention policy.
-   If cloud-synced, enqueue a delete/tombstone operation.
-   Hard deletion and retention cleanup belong to a separately defined
    retention policy.

------------------------------------------------------------------------

## 6.2 Embedding and Semantic Search

### Functions

-   `embed_text(text)`
-   `index_memory(memory)`
-   `remove_from_local_index(memory_id)`
-   `semantic_search(query, filters, limit, threshold)`
-   `keyword_search(query, filters, limit)` (optional fallback)

### Search logic

1.  Validate query.
2.  Generate query embedding on the device.
3.  Search the local vector store only for the offline-first path.
4.  Apply metadata filters such as status, category, tags, and date.
5.  Rank results by vector similarity.
6.  Return memory text, score, and relevant metadata.
7.  Record search latency and result count, without logging sensitive
    query text by default.

### Search behavior

-   Search must not require a cloud connection.
-   If no results exceed the configured threshold, show "No close match
    found" rather than inventing an answer.
-   Make it clear that semantic similarity is not proof that two
    statements are logically equivalent or contradictory.

------------------------------------------------------------------------

## 6.3 Selective Sync Engine (Core Uniqueness #1)

### MVP policy

  -----------------------------------------------------------------------
  Category / Privacy                  Sync behavior
  ----------------------------------- -----------------------------------
  Important + sync allowed            High-priority queue; send as soon
                                      as online

  Normal + sync allowed               Normal-priority queue; batch when
                                      online

  Private or local-only               Never upload memory content

  Deleted synced memory               Send a tombstone/delete operation
                                      when online
  -----------------------------------------------------------------------

### Functions

-   `classify_sync_policy(memory)`
-   `enqueue_sync_job(memory, operation)`
-   `process_sync_queue()`
-   `send_sync_batch(batch)`
-   `retry_failed_job(job_id)`
-   `pause_sync()`
-   `resume_sync()`
-   `get_sync_status()`
-   `cancel_or_block_job(job_id)`

### Queue processing logic

1.  Check connectivity and whether sync is enabled.
2.  If offline, keep jobs pending and exit.
3.  Select eligible jobs, ordering by priority and creation time.
4.  Re-check privacy policy immediately before upload.
5.  Exclude private/local-only records.
6.  Group eligible normal-priority records into a batch; important
    records may use a smaller/urgent batch.
7.  Send batch to the backend over authenticated transport
    (authentication is a production requirement; MVP local demo may use
    a controlled development setup).
8.  On success, mark jobs succeeded and memories synced; record server
    acknowledgements.
9.  On temporary failure, increment attempt count and schedule
    exponential backoff with jitter.
10. On permanent validation/policy failure, mark blocked/failed and show
    the reason.
11. Never silently discard queued jobs.

### Suggested initial retry schedule

Use exponential backoff with jitter, capped at a configurable maximum
(for example, 1s, 2s, 4s, 8s... up to a cap). This is a tunable
implementation choice, not a measured performance claim.

### Idempotency

Every sync job must carry a stable job ID or idempotency key so retrying
a request does not create duplicate cloud records.

------------------------------------------------------------------------

## 6.4 Cloud Sync API

### Suggested endpoints

  ----------------------------------------------------------------------------------
  Method                  Endpoint                           Purpose
  ----------------------- ---------------------------------- -----------------------
  POST                    `/api/v1/sync/batch`               Upload eligible memory
                                                             changes

  GET                     `/api/v1/sync/status`              Return server
                                                             acknowledgement / sync
                                                             status

  GET                     `/api/v1/devices`                  List registered devices

  POST                    `/api/v1/devices/register`         Register a device

  GET                     `/api/v1/memories/{id}/versions`   Retrieve permitted
                                                             version history

  GET                     `/api/v1/conflicts`                List conflict records

  POST                    `/api/v1/conflicts/{id}/resolve`   Submit/confirm a
                                                             resolution

  GET                     `/api/v1/activity`                 Retrieve permitted
                                                             activity events
  ----------------------------------------------------------------------------------

These are proposed application endpoints, not built-in Qdrant endpoints.

### Batch request validation

-   Verify device identity/authentication.
-   Validate schema and supported version.
-   Reject private/local-only memory payloads.
-   Validate idempotency key.
-   Check timestamps and version metadata.
-   Return per-item accepted/rejected status, not only a single
    batch-level result.

------------------------------------------------------------------------

## 6.5 Semantic Conflict Resolution (Core Uniqueness #2)

### MVP: candidate detection + transparent rules

**Important:** Vector similarity can find related memories, but
similarity alone cannot prove contradiction. The first version should
use simple, explainable rules and mark uncertain cases for review.

### Candidate detection

1.  A new cloud memory arrives.
2.  Search for nearby memories using vector similarity.
3.  Filter candidates by relevant entity/topic, such as "Gate 3".
4.  Check whether the pair appears contradictory using a simple domain
    rule or a configured opposing-status list (e.g., `open` vs
    `closed`).
5.  If the system cannot confidently determine a contradiction, create a
    `needs_review` record instead of automatically overwriting a memory.

### MVP resolution policy

For a confirmed conflict: 1. Compare version numbers and timestamps. 2.
Apply configured source-trust policy if timestamps are equal or
unreliable. 3. If the policy yields a clear result, mark the selected
version current. 4. Mark the older version `superseded`; do not silently
delete it. 5. Store both versions and a human-readable decision reason.
6. If tie/uncertainty remains, mark `needs_review`.

### Example

-   Device A: "Gate 3 is open" --- 10:00
-   Device B: "Gate 3 is closed" --- 10:30
-   System: identifies same topic + opposing status; selects the newer
    version under the configured policy; retains the older version as
    superseded and records why.

### Functions

-   `find_conflict_candidates(memory)`
-   `detect_contradiction(memory_a, memory_b)`
-   `compare_trust_and_recency(memory_a, memory_b)`
-   `resolve_conflict(conflict_id, policy)`
-   `mark_superseded(memory_id, winning_memory_id)`
-   `get_conflict_history(memory_id)`

### Safety rules for data integrity

-   Never delete the losing version as part of conflict resolution.
-   Keep the resolution policy visible and configurable.
-   Avoid claiming that the system "understands truth"; it applies a
    policy to stored records.
-   Support manual review for ambiguous or high-impact records.

------------------------------------------------------------------------

## 6.6 Version History

### Functions

-   `create_version_snapshot(memory)`
-   `list_versions(memory_id)`
-   `restore_version(memory_id, version_id)` (optional MVP)
-   `mark_version_current(version_id)`
-   `mark_version_superseded(version_id)`

Every meaningful update or conflict decision should preserve a snapshot
with timestamp, source device, version number, and change reason.

------------------------------------------------------------------------

## 6.7 Device Management

### MVP fields

-   Device ID
-   Display name
-   Device type
-   Last-seen timestamp
-   Sync status
-   App/schema version

### Functions

-   `register_device()`
-   `get_device_status(device_id)`
-   `heartbeat_device()`
-   `list_devices()`
-   `disable_device(device_id)` (future/security-dependent)

Each device maintains its own local memory store and sync queue. Device
identity and authorization need stronger implementation before
production use.

------------------------------------------------------------------------

## 6.8 Activity Log and Observability

### Event types

-   `memory.created`
-   `memory.updated`
-   `memory.archived`
-   `memory.deleted`
-   `search.completed`
-   `sync.queued`
-   `sync.started`
-   `sync.succeeded`
-   `sync.failed`
-   `sync.blocked_private`
-   `conflict.detected`
-   `conflict.resolved`
-   `conflict.needs_review`

### Functions

-   `record_activity(event)`
-   `list_activity(filters, pagination)`
-   `get_metrics(time_range)`

Avoid recording private memory contents, secrets, tokens, or sensitive
query strings in logs.

------------------------------------------------------------------------

## 7. Dashboard Screens and UI Behavior

### 7.1 Overview

Show: - Total active memories - Local-only/private memory count (count
only; no private text) - Pending sync jobs - Last successful sync -
Connected/offline status - Open conflict count - Recent activity

### 7.2 Memory Explorer

-   Search and filter memories.
-   Show category, privacy, updated time, and sync state.
-   Add/edit/archive/delete memory.
-   Clearly mark local-only memories.

### 7.3 Semantic Search

-   Search input and result list.
-   Similarity score (label as a relevance score, not a probability).
-   Offline indicator.
-   Empty/no-match state.
-   Search latency measurement.

### 7.4 Sync Center

-   Online/offline status.
-   Queue list grouped by priority and status.
-   Pause/resume sync.
-   Retry failed jobs.
-   Per-item reason for blocked jobs.
-   Sync history.

### 7.5 Conflict Viewer

-   Show both versions side by side.
-   Display source device, timestamp, and trust metadata.
-   Show detected opposing terms/rule and policy decision.
-   Actions: accept selected version, mark unresolved, dismiss candidate
    (permission-controlled).
-   Preserve audit trail after manual resolution.

### 7.6 Activity Log

-   Chronological events with filters.
-   Show action, time, device, and outcome.
-   Redact private content.

------------------------------------------------------------------------

## 8. API Contract (Illustrative)

### Create memory

`POST /api/v1/memories`

Request:

``` json
{
  "text": "Gate 3 is closed",
  "category": "important",
  "privacy": "sync_allowed",
  "tags": ["gate"]
}
```

Response:

``` json
{
  "id": "uuid",
  "status": "active",
  "sync_state": "pending",
  "message": "Saved locally"
}
```

### Semantic search

`POST /api/v1/search`

Request:

``` json
{
  "query": "Which entrance is closed?",
  "limit": 10,
  "filters": {
    "category": ["important", "normal"]
  }
}
```

Response:

``` json
{
  "offline": true,
  "results": [
    {
      "memory_id": "uuid",
      "text": "Gate 3 is closed",
      "score": 0.82
    }
  ],
  "latency_ms": 12
}
```

> Example score and latency above are illustrative placeholders, not
> measured results.

### Sync batch

`POST /api/v1/sync/batch`

Request:

``` json
{
  "device_id": "uuid",
  "idempotency_key": "uuid",
  "items": [
    {
      "memory_id": "uuid",
      "operation": "create",
      "version": 1,
      "category": "important",
      "privacy": "sync_allowed",
      "text": "Gate 3 is closed",
      "created_at": "ISO-8601 UTC"
    }
  ]
}
```

Response:

``` json
{
  "accepted": ["uuid"],
  "rejected": [],
  "server_time": "ISO-8601 UTC"
}
```

------------------------------------------------------------------------

## 9. Business Rules and Edge Cases

1.  **Offline create:** Save locally; eligible memory becomes pending;
    private memory remains local-only.
2.  **Offline search:** Use local index only.
3.  **Reconnect:** Process eligible queue items in priority order.
4.  **Private label changed after queueing:** Re-check policy before
    upload and block the job.
5.  **Duplicate retry:** Idempotency key prevents duplicate application.
6.  **Same memory edited on two devices:** Create competing versions and
    run conflict policy; retain both snapshots.
7.  **Ambiguous contradiction:** Mark for review, do not auto-select.
8.  **Cloud unavailable:** Keep queue pending and retry with backoff.
9.  **Embedding failure:** Save a recoverable local record with
    `embedding_pending`; retry embedding and make it clear it is not yet
    semantically searchable.
10. **Vector index failure:** Keep metadata/queue state durable and
    provide a repair/re-index operation.
11. **Deleted record reconnects:** Apply tombstone/version rules to
    avoid accidental resurrection.
12. **Clock skew:** Do not trust timestamps alone; record source/device
    metadata and allow manual review.
13. **Schema migration:** Version local database and sync payload
    schemas.
14. **Device removed/lost:** Device revocation and remote access
    controls are future security requirements; do not claim them unless
    implemented.

------------------------------------------------------------------------

## 10. Security and Privacy Requirements

### MVP baseline

-   Private/local-only memory content must never enter sync payloads.
-   Re-check privacy policy immediately before every upload.
-   Do not expose secrets or private memory text in logs.
-   Validate API inputs and limit payload sizes.
-   Keep development credentials out of source control.
-   Use HTTPS for any networked deployment.

### Production hardening / Future Scope

-   User authentication and per-device authorization.
-   Encryption at rest and secure key management.
-   Encrypted backups and defined deletion/retention behavior.
-   Rate limiting, audit controls, and security testing.
-   Threat model for compromised/lost devices.
-   Explicit user consent and controls for cloud sync.

**Privacy limitation:** "Private never syncs" is an application policy.
It is not a claim that the entire system is fully encrypted or
independently security-audited.

------------------------------------------------------------------------

## 11. Performance Metrics and Testing

Measure using a repeatable test dataset and record hardware, dataset
size, model, and test conditions.

### Metrics

-   Local semantic-search latency (p50 / p95)
-   Embedding generation time
-   Memory creation time
-   Sync queue drain time
-   Bytes uploaded per sync
-   Eligible vs blocked memory counts
-   Conflict candidates detected
-   Conflict decisions accepted vs sent to review
-   Error/retry rate
-   Memory/vector storage size

Do not invent benchmark numbers. Report only measurements from actual
tests.

### Test scenarios

1.  Create and search a memory while online.
2.  Disable network and search semantically.
3.  Add Important, Normal, and Private memories offline.
4.  Reconnect and verify only eligible records sync.
5.  Confirm private content is absent from request payloads and cloud
    records.
6.  Simulate network failure and verify retry behavior.
7.  Submit duplicate sync batch and verify idempotency.
8.  Create opposing status memories from two devices and verify conflict
    record/history.
9.  Test ambiguous conflict and ensure it is sent for review.
10. Edit/delete a synced memory and verify version/tombstone behavior.
11. Test empty query, invalid category, oversized input, and malformed
    payload.
12. Restart app while jobs are pending and verify queue persistence.

------------------------------------------------------------------------

## 12. Development Plan

### Phase 1 --- Local memory foundation

-   Project setup and configuration.
-   SQLite schema and migrations.
-   Qdrant Edge storage adapter.
-   FastEmbed integration.
-   Create/list/update/archive memory.
-   Local semantic search.
-   Basic memory UI.

**Exit condition:** Create memories and retrieve them semantically with
the network disabled.

### Phase 2 --- Selective Sync

-   Priority/privacy policy.
-   Durable SQLite sync queue.
-   Connectivity state and retry/backoff.
-   Sync batch API.
-   Qdrant Server integration.
-   Sync Center UI.

**Exit condition:** Important/Normal records sync under policy; Private
records remain local-only; failed jobs retry safely.

### Phase 3 --- Conflict Resolution

-   Similarity-based candidate retrieval.
-   Simple domain contradiction rules.
-   Version snapshots and superseded state.
-   Conflict record and resolution policy.
-   Conflict Viewer UI.

**Exit condition:** Demo two devices with opposing facts; show decision
reason and preserved history; ambiguous cases go to review.

### Phase 4 --- Dashboard and observability

-   Overview metrics.
-   Activity feed.
-   Search filters.
-   Error states and responsive polish.
-   Instrumentation for actual performance measurements.

### Phase 5 --- Reliability and demo preparation

-   Automated tests.
-   Seed demo data.
-   Offline/online toggle for demo (clearly marked as a simulator if it
    does not control actual network connectivity).
-   Record a backup demo video.
-   Document limitations and measured results.

------------------------------------------------------------------------

## 13. Suggested Repository Structure

``` text
edge-memory-platform/
├── apps/
│   └── dashboard/                 # Next.js + TypeScript
│       ├── app/
│       ├── components/
│       ├── lib/
│       └── package.json
├── services/
│   └── api/                       # FastAPI application
│       ├── app/
│       │   ├── main.py
│       │   ├── api/
│       │   ├── schemas/
│       │   ├── services/
│       │   │   ├── memory_service.py
│       │   │   ├── search_service.py
│       │   │   ├── sync_service.py
│       │   │   ├── conflict_service.py
│       │   │   └── activity_service.py
│       │   ├── repositories/
│       │   │   ├── edge_vector_store.py
│       │   │   ├── cloud_vector_store.py
│       │   │   └── sqlite_repository.py
│       │   ├── workers/
│       │   └── config.py
│       ├── tests/
│       └── pyproject.toml
├── infra/
│   ├── docker-compose.yml
│   └── qdrant/
├── docs/
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── TEST_PLAN.md
├── .env.example
├── .gitignore
└── README.md
```

This is a suggested structure; adapt it to the actual SDK packaging and
runtime constraints.

------------------------------------------------------------------------

## 14. Definition of Done (MVP)

-   [ ] App can create, edit, archive, and view memories locally.
-   [ ] Semantic search works without internet.
-   [ ] Memory categories and local-only privacy are enforced.
-   [ ] Sync queue persists across restarts.
-   [ ] Important and Normal sync according to policy.
-   [ ] Private/local-only content is excluded from sync payloads.
-   [ ] Cloud accepts idempotent batches and returns per-item results.
-   [ ] Conflict candidates are detected and logged.
-   [ ] Clear conflicts follow a documented rule; ambiguous ones require
    review.
-   [ ] Previous versions are retained and visible.
-   [ ] Dashboard shows memory, search, sync, conflict, and activity
    views.
-   [ ] Actual performance metrics are measured and documented.
-   [ ] Known limitations and future scope are clearly labeled.

------------------------------------------------------------------------

## 15. Demo Flow (2--3 Minutes)

1.  Add an Important memory, a Normal memory, and a Private memory on
    Device A.
2.  Turn offline mode on.
3.  Search "Which entrance is closed?" and show the matching local
    memory.
4.  Show the pending sync queue and private/local-only status.
5.  Reconnect and show eligible records syncing; verify private content
    is not uploaded.
6.  On Device B, add a conflicting statement about the same gate.
7.  Sync Device B and open the conflict viewer.
8.  Show the selected version, policy reason, and preserved older
    version.
9.  Open activity log and show the recorded operations.
10. Share only benchmark numbers measured during actual testing.

------------------------------------------------------------------------

## 16. Future Scope Details

### A. Advanced privacy tiers

Move beyond a single Private label to configurable policies such as
local-only, encrypted sync, team-shared, and public/shared. Define
consent, permissions, and deletion semantics before implementation.

### B. Memory lifecycle

Classify memories into: - **Hot:** Frequently accessed; optimized for
fast retrieval. - **Warm:** Less frequently accessed; retained in
standard storage. - **Cold:** Archived/older records; retrieved on
demand.

Lifecycle transitions should be based on explicit retention/access
rules, not silently discard information.

### C. Cloud-to-edge prefetch

Use device context, user-selected topics, or recent access patterns to
prefetch permitted memories to the device. Respect storage limits,
privacy policy, and user controls.

### D. CRDT-style multi-device sync

Explore CRDTs or another well-defined merge protocol for concurrent
edits and offline changes. The protocol must define conflict semantics,
deletion/tombstones, metadata consistency, and convergence. This is
separate from the MVP's timestamp/trust-based resolver.

### E. Mobile application

Build a React Native + Expo client with local persistence, offline
search, sync controls, privacy labels, and conflict review. Validate
Qdrant Edge and embedding runtime support on target mobile platforms
before committing to this implementation.

------------------------------------------------------------------------

## 17. Key Design Decisions to Confirm

Before coding, confirm: 1. Is the MVP a desktop/laptop web dashboard
with a local edge service, or a packaged desktop app? 2. Will Device A
and Device B be two separate app instances, containers, or physical
devices for the demo? 3. Which embedding model and vector dimensions are
supported by the selected FastEmbed model and Edge SDK? 4. What exact
fields are permitted in cloud sync? 5. What happens when a previously
synced memory is later marked Private? 6. Which domains/status terms are
supported by the first contradiction rules? 7. When does the system
require human review? 8. What authentication method is required for the
demo versus production?

------------------------------------------------------------------------

**End of specification.**\
Use this document as the functional blueprint. Update the implementation
status as features move from Planned → In Progress → Tested → Done.



---

# 18. Robustness, Rate Limits, HTTP Errors, Metadata, and Privacy Controls

This section extends the MVP specification with explicit API protection, error handling, metadata validation, and privacy safeguards. These are requirements to implement and test—not claims that they are already implemented.

## 18.1 Standard API Error Format

Return a consistent error structure from FastAPI:

```json
{
  "error": {
    "code": "MEMORY_NOT_FOUND",
    "message": "The requested memory was not found.",
    "details": {},
    "request_id": "uuid"
  }
}
```

Rules:
- Never return stack traces, secrets, internal file paths, database credentials, or raw exception messages to clients.
- Include a request/correlation ID in responses and server logs.
- Keep error messages actionable but avoid revealing whether another user's private resource exists.
- Validate and sanitize `details`; do not echo sensitive request bodies.

## 18.2 HTTP Status Codes and Error Logic

| Status | When to use | Client behavior |
|---|---|---|
| `400 Bad Request` | Malformed request or invalid query structure | Show validation guidance; do not retry unchanged |
| `401 Unauthorized` | Missing/invalid authentication | Ask user to authenticate |
| `403 Forbidden` | Authenticated caller lacks permission | Show access-denied state |
| `404 Not Found` | Memory/device/conflict/resource does not exist, or resource is intentionally hidden | Show not-found state; do not retry |
| `409 Conflict` | Version mismatch, duplicate state transition, or unresolved concurrent update | Fetch latest permitted state and offer conflict handling |
| `413 Payload Too Large` | Request exceeds configured size limit | Ask user to reduce payload |
| `415 Unsupported Media Type` | Unsupported content type | Send supported content type |
| `422 Unprocessable Entity` | Schema or field validation failed | Highlight invalid fields; do not retry unchanged |
| `429 Too Many Requests` | Rate limit exceeded | Respect `Retry-After`; retry with backoff |
| `500 Internal Server Error` | Unexpected server failure | Show generic message; retry only safe/idempotent operations |
| `502 Bad Gateway` | Upstream service returned invalid response | Keep sync job pending and retry with backoff |
| `503 Service Unavailable` | Service temporarily unavailable/maintenance | Keep job pending; honor `Retry-After` |
| `504 Gateway Timeout` | Upstream timed out | Retry idempotently with backoff |

### 404 handling
- If a requested memory ID does not exist, return `404 MEMORY_NOT_FOUND`.
- If a device or conflict ID does not exist, return the corresponding `404` code.
- If a sync update references a missing cloud record, do not silently recreate it. Return a clear per-item result such as `SYNC_TARGET_NOT_FOUND`; the client may fetch state or submit a create only after verifying the intended operation.
- For a deleted record, distinguish a known tombstone from a never-existing ID internally; avoid exposing sensitive existence details to unauthorized callers.
- A `404` is generally not retryable unless the application has a documented eventual-consistency case.

## 18.3 Rate Limiting and Abuse Protection

Apply rate limits at the API gateway/middleware and, where needed, at the authenticated user/device level.

### Suggested initial limits (tune after testing)
These are starting configuration values, not universal guarantees:
- Read/list/search endpoints: 60 requests per minute per user/device.
- Memory create/update endpoints: 30 requests per minute per user/device.
- Sync batch endpoint: 10 requests per minute per device, with a maximum item count and byte size per batch.
- Authentication endpoints: stricter limits, plus progressive delays after repeated failures.
- Add a separate concurrent-request limit for expensive embedding/search operations.

### Rate-limit behavior
1. Identify the caller using authenticated user/device identity; do not rely only on a client-supplied device ID.
2. Enforce both request-count and payload-size limits.
3. Return `429 RATE_LIMIT_EXCEEDED` with `Retry-After` and optional limit/reset headers.
4. Client honors `Retry-After`; if absent, use exponential backoff with jitter.
5. Do not retry 429 responses in a tight loop.
6. Apply per-user/device limits so one device does not consume the entire shared quota.
7. Monitor rate-limit events and repeated abuse patterns without logging private memory contents.

## 18.4 Metadata and Payload Validation

Validate metadata on both client and server. Never trust client-provided metadata simply because it came from the app.

### Required validation
- `id`, `device_id`, `memory_id`, and job IDs must be valid UUIDs where required.
- `category`, `privacy`, `status`, `sync_state`, and `source` must match allowed enum values.
- Timestamps must be valid ISO-8601 values; normalize to UTC and handle clock skew explicitly.
- `version` must be a positive integer and must follow the versioning policy.
- `tags` must be an array of strings with per-tag and total-count limits; trim whitespace and reject control characters.
- `text` must be non-empty after trimming and stay within configured character/byte limits.
- `source_trust` must be assigned or bounded by server policy; a client must not be able to grant itself trusted status.
- Unknown fields should be rejected or safely ignored according to a versioned schema policy; document which behavior is used.
- Validate vector dimension, numeric type, and finite values before indexing; reject NaN/Infinity and mismatched dimensions.
- Allowlist filter fields and operators to prevent unsafe or expensive queries.
- Enforce maximum `limit`, pagination size, batch item count, and batch byte size.

### Metadata tags and HTML/meta tags
- Treat user-entered memory text and tags as untrusted plain text.
- Escape text when rendering in the dashboard; do not inject user content as HTML.
- If the app later imports web pages, validate the source URL and sanitize imported HTML. HTML `<meta>` tags are untrusted metadata and must not override authorization, privacy, or sync policy.
- If by “meta tag” the implementation means memory metadata/tags, use the validation rules above; if it means HTML SEO meta tags, those belong to the web dashboard's page metadata and are unrelated to memory-record authorization.

## 18.5 Retry and Circuit-Breaker Policy

Classify failures before retrying:

**Retryable:** network timeout, connection reset, `429`, `502`, `503`, `504`, and selected transient storage errors.  
**Not automatically retryable:** `400`, `401`, `403`, `404`, `413`, `415`, `422`, and policy-blocked private records.

Rules:
- Use exponential backoff with jitter and a maximum delay/attempt policy.
- Honor `Retry-After` for `429` and `503`.
- Keep failed jobs visible and recoverable; never drop them silently.
- After repeated upstream failures, temporarily pause requests using a circuit breaker and probe recovery after a cooldown.
- Make sync writes idempotent using a stable idempotency key.
- Provide a manual “Retry” action for eligible failed jobs.
- Do not retry a non-idempotent operation unless it is protected by idempotency or the server can confirm the prior outcome.

## 18.6 Privacy Enforcement and Data Boundaries

### Required invariants
1. A `private` or `local_only` memory must not be included in cloud sync payloads.
2. Re-evaluate privacy and authorization immediately before each upload—not only when the job is first queued.
3. Cloud API independently rejects records labeled private/local-only.
4. Private memory text must not appear in cloud logs, analytics, error reports, or crash reports.
5. Dashboard APIs must enforce authorization on every memory, device, version, conflict, and activity resource.
6. Use least-privilege service credentials and keep secrets in environment/secret storage, never in source control.
7. Use HTTPS for network communication; configure CORS to allow only trusted dashboard origins.
8. Add request-size limits, input validation, and safe output encoding to reduce abuse and injection risks.
9. Provide clear user controls for enabling sync and explaining which data leaves the device.
10. Define deletion behavior for local data, cloud copies, backups, and version history. Do not promise remote erasure until all relevant stores confirm deletion.

### Privacy transition logic
If a memory changes from sync-allowed to private/local-only:
- Immediately block pending sync jobs.
- Prevent any in-flight retry from sending the record after the policy change.
- If a copy was already uploaded, create a cloud deletion/redaction request where supported and show its status.
- Keep the local memory private regardless of cloud deletion outcome.
- Clearly disclose that previously synced copies may persist until server/backup retention rules complete.

## 18.7 Authentication, Authorization, and Device Trust

### MVP demo
- Keep the demo environment local and controlled.
- Do not expose unauthenticated admin or sync endpoints to the public internet.
- Use a development-only secret from environment variables if authentication is required.

### Production requirements
- User authentication and device registration.
- Per-user and per-device authorization checks.
- Short-lived access tokens and secure refresh-token handling.
- Device revocation and session invalidation.
- Role/permission checks for manual conflict resolution and device management.
- Audit security-sensitive actions without recording private content.

## 18.8 Frontend Error and Empty States

Every dashboard page should handle:
- Loading state
- Empty state
- Offline state
- Permission denied
- Not found
- Validation error
- Rate limited (show retry-after time)
- Server unavailable
- Partial batch failure
- Conflict needs review

Do not display raw backend stack traces. Keep unsaved edits locally when safe and show whether an action was saved, queued, synced, blocked, or failed.

## 18.9 Additional Test Cases

- [ ] Request exceeds rate limit → `429`, `Retry-After`, no tight retry loop.
- [ ] Unknown memory ID → `404 MEMORY_NOT_FOUND`.
- [ ] Unknown device/conflict ID → correct `404` response.
- [ ] Malformed UUID, timestamp, enum, tag, or vector → validation error.
- [ ] Oversized text or sync batch → `413` or documented validation response.
- [ ] Private memory queued then changed to local-only → blocked before upload.
- [ ] Private memory submitted directly to cloud API → rejected.
- [ ] Client attempts to set its own source-trust level → server policy overrides/rejects it.
- [ ] Wrong vector dimension or non-finite vector values → rejected safely.
- [ ] Repeated upstream failure → circuit breaker opens; queue remains durable.
- [ ] `429` / `503` with `Retry-After` → client waits as instructed.
- [ ] Expired/invalid credentials → `401`; insufficient permission → `403`.
- [ ] User content containing HTML/script-like text is rendered safely.
- [ ] Cloud deletion/redaction request failure is visible and does not falsely show “deleted everywhere.”
- [ ] Error responses and logs contain no secrets or private memory text.

---

## 19. Implementation Status Note

The above additions specify intended behavior. They should be tracked as:
- **Planned** until code exists.
- **Implemented** after code is written.
- **Tested** only after the relevant automated/manual tests pass.
- **Done** only when the acceptance criteria are verified.

