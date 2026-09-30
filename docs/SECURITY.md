# E-MEMBRO — Security & Privacy Architecture

## 1. Core Threat Model & Privacy Invariants

### Invariant 1: Private Memory Never Syncs
- Any memory labeled `category: private` or `privacy: local_only` is blocked at multiple enforcement gates:
  1. **Creation Gate**: Setting `category: private` immediately locks `privacy` to `local_only` and assigns `sync_state: local_only`. No sync job is inserted into the queue.
  2. **Pre-Transmission Gate**: The sync worker re-evaluates database state immediately before building the cloud payload. If a memory was transitioned from public to private while queued, the pending job is permanently marked `blocked`.
  3. **Cloud Rejection Gate**: The `/api/v1/sync/batch` endpoint inspects every incoming payload and immediately rejects any item marked private or local-only.

### Invariant 2: Zero Private Leakage in Logs & Auditing
- The `activity_events` table and API response redact all private memory text to `[REDACTED_PRIVATE_CONTENT]`.
- No raw exceptions, secrets, internal file paths, or credentials are exposed in API error payloads.

### Invariant 3: Client Cannot Self-Grant Trust
- Memory records contain `source_trust` bounded between 0 and 10. Client applications cannot unilaterally elevate trust levels to override conflict arbitration rules.

---

## 2. API Protection & Rate Limiting

Rate limiting is enforced per caller identifier (`client_ip` + `x-device-id`):
- **Read & Search Operations**: 60 requests / minute
- **Create & Update Operations**: 30 requests / minute
- **Sync Batch Operations**: 10 requests / minute

When rate limits are exceeded:
- Responds with `HTTP 429 Too Many Requests`.
- Attaches standard `Retry-After: <seconds>` header.
- Client applications respect backoff headers and avoid polling loops.

---

## 3. Input Validation & Injection Prevention
- **Payload Limits**: Text is validated to length [1, 10000] and stripped of control characters.
- **Vectors**: Validated to exact 384 dimensions; reject NaN and Infinity.
- **Frontend Safe Encoding**: React JSX outputs text encoded as plain strings, preventing XSS injection.
- **UUID Validation**: Identifiers must conform to standard RFC 4122.

---

## 4. Production Hardening vs MVP Boundaries
- **MVP State**: Controlled local network/demo environment with CORS restrictions and development secrets.
- **Production Scope (Future Roadmap)**:
  - Mutual TLS (mTLS) for edge-to-cloud device authentication.
  - Hardware-backed secure enclave key storage (TPM / Apple Secure Enclave).
  - SQLite database encryption via SQLCipher (encryption at rest).
