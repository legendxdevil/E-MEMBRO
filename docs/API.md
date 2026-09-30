# E-MEMBRO — API Reference Manual

Base URL: `http://localhost:8000/api/v1`

All API endpoints return consistent JSON responses and include an `X-Request-ID` correlation header and `X-Response-Time-MS` latency timing header.

---

## Standard Error Response Format
All errors (4xx, 5xx) follow the standardized contract:

```json
{
  "error": {
    "code": "MEMORY_NOT_FOUND",
    "message": "The requested memory was not found.",
    "details": {},
    "request_id": "7f8b9d88-5182-4ba0-a0aa-a388e0b23023"
  }
}
```

---

## 1. Memory Management Endpoints

### Create Memory
- **Method**: `POST /api/v1/memories`
- **Rate Limit**: 30 req/min
- **Request Body**:
  ```json
  {
    "text": "Gate 3 is closed.",
    "category": "important",
    "privacy": "sync_allowed",
    "tags": ["gate", "security"],
    "source": "manual",
    "source_trust": 2
  }
  ```
- **Response**: `201 Created`
  ```json
  {
    "id": "62e2bc64-168a-4933-911f-508b9e078ec9",
    "device_id": "00000000-0000-0000-0000-000000000001",
    "text": "Gate 3 is closed.",
    "category": "important",
    "privacy": "sync_allowed",
    "tags": ["gate", "security"],
    "version": 1,
    "status": "active",
    "sync_state": "pending",
    "created_at": "2026-09-28T15:05:25.000000Z",
    "updated_at": "2026-09-28T15:05:25.000000Z"
  }
  ```

### List Memories
- **Method**: `GET /api/v1/memories`
- **Rate Limit**: 60 req/min
- **Query Parameters**: `category`, `status`, `privacy`, `sync_state`, `q`, `page`, `page_size`
- **Response**: `200 OK`

### Get Memory
- **Method**: `GET /api/v1/memories/{id}`
- **Response**: `200 OK` or `404 MEMORY_NOT_FOUND`

### Update Memory
- **Method**: `PATCH /api/v1/memories/{id}`
- **Request Body**:
  ```json
  {
    "text": "Gate 3 is closed for maintenance until 14:00 UTC.",
    "change_reason": "Added maintenance timeframe"
  }
  ```
- **Response**: `200 OK` (increments version to 2, saves snapshot)

### Archive Memory
- **Method**: `POST /api/v1/memories/{id}/archive`
- **Response**: `200 OK`

### Delete Memory (Tombstone)
- **Method**: `DELETE /api/v1/memories/{id}`
- **Response**: `200 OK` (records tombstone for synchronization consistency)

### Get Version History
- **Method**: `GET /api/v1/memories/{id}/versions`
- **Response**: `200 OK` (list of version snapshots)

---

## 2. Semantic Search Endpoints

### Search Local Memories
- **Method**: `POST /api/v1/search`
- **Rate Limit**: 60 req/min
- **Request Body**:
  ```json
  {
    "query": "Which entrance is closed?",
    "limit": 5,
    "threshold": 0.35,
    "filters": {
      "category": ["important", "normal"]
    }
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "offline": true,
    "query": "Which entrance is closed?",
    "total_results": 1,
    "results": [
      {
        "memory_id": "62e2bc64-168a-4933-911f-508b9e078ec9",
        "text": "Gate 3 is closed.",
        "score": 0.8082,
        "category": "important",
        "privacy": "sync_allowed",
        "status": "active"
      }
    ],
    "latency_ms": 10.51
  }
  ```

---

## 3. Selective Sync Endpoints

### Upload Sync Batch (Cloud Path)
- **Method**: `POST /api/v1/sync/batch`
- **Rate Limit**: 10 req/min
- **Request Body**:
  ```json
  {
    "device_id": "00000000-0000-0000-0000-000000000001",
    "idempotency_key": "batch-1727535925-1",
    "items": [
      {
        "memory_id": "62e2bc64-168a-4933-911f-508b9e078ec9",
        "operation": "create",
        "version": 1,
        "category": "important",
        "privacy": "sync_allowed",
        "text": "Gate 3 is closed.",
        "created_at": "2026-09-28T15:05:25.000000Z",
        "updated_at": "2026-09-28T15:05:25.000000Z"
      }
    ]
  }
  ```

### Get Sync Status
- **Method**: `GET /api/v1/sync/status`
- **Response**: `200 OK` (circuit breaker state, offline state, pending count)

### Process Sync Queue
- **Method**: `POST /api/v1/sync/process`
- **Response**: `200 OK` (drains queue in priority order)

### Toggle Offline Simulation
- **Method**: `POST /api/v1/sync/offline-simulation`
- **Request Body**: `{"offline": true}`

### Retry Failed Job
- **Method**: `POST /api/v1/sync/jobs/{job_id}/retry`

---

## 4. Conflict Resolution Endpoints

### List Conflicts
- **Method**: `GET /api/v1/conflicts`
- **Query Parameters**: `state` (`needs_review`, `resolved`, `candidate`)

### Resolve Conflict Manually
- **Method**: `POST /api/v1/conflicts/{id}/resolve`
- **Request Body**:
  ```json
  {
    "decision": "a_wins",
    "decision_reason": "Operator confirmed physical status of Gate 3."
  }
  ```

---

## 5. Device Registry Endpoints
- `POST /api/v1/devices/register`
- `GET /api/v1/devices`
- `GET /api/v1/devices/{id}`
- `POST /api/v1/devices/{id}/heartbeat`

---

## 6. Observability & Demo Endpoints
- `GET /api/v1/activity`: Chronological audit log with private text redaction.
- `GET /api/v1/metrics`: System telemetry (latencies, counts, queues).
- `POST /api/v1/seed/demo`: Executes reproducible multi-device demonstration scenario.
