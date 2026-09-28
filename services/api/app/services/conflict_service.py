import re
from datetime import datetime, timezone
from typing import Optional, Any
from app.config import settings
from app.schemas.enums import (
    ConflictType,
    ConflictState,
    ConflictDecision,
    MemoryStatus,
    ActivityEventType,
)
from app.repositories.sqlite_repository import SQLiteRepository
from app.repositories.cloud_vector_store import CloudVectorStoreAdapter, QdrantCloudVectorStore
from app.services.embedding_service import EmbeddingService

OPPOSING_STATUS_PAIRS = [
    ("open", "closed"),
    ("up", "down"),
    ("active", "inactive"),
    ("enabled", "disabled"),
    ("true", "false"),
    ("yes", "no"),
    ("allowed", "blocked"),
    ("locked", "unlocked"),
    ("empty", "full"),
    ("pass", "fail"),
    ("started", "stopped"),
    ("online", "offline"),
    ("connected", "disconnected"),
    ("on", "off"),
    ("running", "halted"),
    ("safe", "unsafe")
]

class ConflictService:
    def __init__(
        self,
        db_repo: Optional[SQLiteRepository] = None,
        cloud_vector_store: Optional[CloudVectorStoreAdapter] = None,
        embedding_service: Optional[EmbeddingService] = None
    ):
        self.db = db_repo or SQLiteRepository()
        self.cloud_vector = cloud_vector_store or QdrantCloudVectorStore()
        self.embedding = embedding_service or EmbeddingService.get_instance()

    def find_conflict_candidates(self, memory: dict[str, Any], similarity_threshold: float = 0.65) -> list[dict[str, Any]]:
        """
        Uses vector similarity in the shared memory store to identify candidates
        that refer to the same entity or topic.
        """
        try:
            vector = self.embedding.embed_text(memory["text"])
        except Exception:
            return []

        # Exclude self
        matches = self.cloud_vector.search(
            query_vector=vector,
            limit=10,
            score_threshold=similarity_threshold
        )

        candidates = []
        for m in matches:
            if m["id"] == memory["id"]:
                continue
            cand_mem = self.db.get_memory(m["id"])
            if cand_mem and cand_mem["status"] != MemoryStatus.DELETED.value:
                candidates.append({
                    "candidate_memory": cand_mem,
                    "similarity_score": m["score"]
                })
        return candidates

    def detect_contradiction(self, text_a: str, text_b: str) -> tuple[bool, Optional[str], Optional[ConflictType]]:
        """
        Evaluates two memory texts to determine if they represent:
        - A duplicate
        - A clear contradiction (via opposing status pair or negation)
        - An ambiguous candidate requiring human review
        """
        clean_a = text_a.lower().strip()
        clean_b = text_b.lower().strip()

        # 1. Duplicate Check
        if clean_a == clean_b:
            return True, "Identical content detected across devices", ConflictType.DUPLICATE

        words_a = set(re.findall(r'\b\w+\b', clean_a))
        words_b = set(re.findall(r'\b\w+\b', clean_b))

        # Check Opposing Status Pairs
        for term1, term2 in OPPOSING_STATUS_PAIRS:
            if (term1 in words_a and term2 in words_b) or (term2 in words_a and term1 in words_b):
                # Opposing status found
                matched_pair = f"'{term1}' vs '{term2}'"
                return True, f"Opposing status condition detected: {matched_pair}", ConflictType.CONTRADICTION_CANDIDATE

        # Check Negation Patterns (e.g., "is open" vs "is not open")
        negations = {"not", "never", "no", "isnt", "isn't", "cannot", "can't"}
        has_neg_a = bool(words_a & negations)
        has_neg_b = bool(words_b & negations)
        if has_neg_a != has_neg_b:
            overlap = words_a & words_b - negations
            if len(overlap) >= 2:
                return True, "Negation contradiction detected with shared subject keywords", ConflictType.CONTRADICTION_CANDIDATE

        # If semantic overlap is high but no explicit status rule matched
        common_words = words_a & words_b
        if len(common_words) >= 3 and len(words_a ^ words_b) > 0:
            return False, "High topical overlap but ambiguous semantic contrast", ConflictType.CONCURRENT_UPDATE

        return False, None, None

    def process_incoming_cloud_memory(self, incoming_mem: dict[str, Any]) -> list[dict[str, Any]]:
        """
        Called when a memory arrives via sync batch.
        Checks for conflicts with existing memories, creates conflict records,
        and applies the MVP resolution policy.
        """
        candidates = self.find_conflict_candidates(incoming_mem)
        detected_conflicts = []

        for cand in candidates:
            existing_mem = cand["candidate_memory"]
            score = cand["similarity_score"]

            is_contradiction, reason, c_type = self.detect_contradiction(
                existing_mem["text"],
                incoming_mem["text"]
            )

            if not is_contradiction and c_type != ConflictType.CONCURRENT_UPDATE:
                continue

            conflict_type = c_type or ConflictType.CONTRADICTION_CANDIDATE

            # Apply MVP Resolution Policy
            decision, decision_reason, resolved_id = self._apply_resolution_policy(
                existing_mem=existing_mem,
                incoming_mem=incoming_mem,
                conflict_type=conflict_type,
                detection_reason=reason or "Detected semantic overlap"
            )

            conflict_state = ConflictState.RESOLVED.value if decision != ConflictDecision.NEEDS_REVIEW else ConflictState.NEEDS_REVIEW.value

            conflict_record = self.db.create_conflict_record(
                memory_a_id=existing_mem["id"],
                memory_b_id=incoming_mem["id"],
                conflict_type=conflict_type.value,
                state=conflict_state,
                decision=decision.value,
                decision_reason=decision_reason,
                resolved_memory_id=resolved_id
            )

            # Record Activity
            ev_type = ActivityEventType.CONFLICT_RESOLVED.value if conflict_state == ConflictState.RESOLVED.value else ActivityEventType.CONFLICT_NEEDS_REVIEW.value
            self.db.record_activity(
                event_type=ev_type,
                actor_device_id=incoming_mem.get("device_id", settings.DEVICE_ID),
                memory_id=incoming_mem["id"],
                details={
                    "conflict_id": conflict_record["id"],
                    "conflict_type": conflict_type.value,
                    "existing_id": existing_mem["id"],
                    "incoming_id": incoming_mem["id"],
                    "decision": decision.value,
                    "reason": decision_reason
                }
            )

            detected_conflicts.append(conflict_record)

        return detected_conflicts

    def _apply_resolution_policy(
        self,
        existing_mem: dict[str, Any],
        incoming_mem: dict[str, Any],
        conflict_type: ConflictType,
        detection_reason: str
    ) -> tuple[ConflictDecision, str, Optional[str]]:
        """
        Transparent rule-based policy:
        1. If duplicate: mark B as superseded duplicate, A stays current.
        2. If contradiction:
           a. Compare timestamps. Newer wins.
           b. If timestamps identical: compare source_trust. Higher trust wins.
           c. If tie and ambiguous: require human review.
        3. Never silently delete losing version; mark losing version as 'superseded'.
        """
        if conflict_type == ConflictType.DUPLICATE:
            # Memory A already exists, incoming B is duplicate
            self.db.update_memory(incoming_mem["id"], {
                "status": MemoryStatus.SUPERSEDED.value,
                "supersedes": existing_mem["id"]
            })
            return (
                ConflictDecision.A_WINS,
                f"Duplicate detected. Kept existing record {existing_mem['id']}; marked incoming record superseded.",
                existing_mem["id"]
            )

        if conflict_type == ConflictType.CONTRADICTION_CANDIDATE:
            time_a = existing_mem["created_at"]
            time_b = incoming_mem["created_at"]

            if time_b > time_a:
                # Incoming memory is more recent -> B wins!
                self.db.update_memory(existing_mem["id"], {
                    "status": MemoryStatus.SUPERSEDED.value,
                    "supersedes": incoming_mem["id"]
                })
                self.db.update_memory(incoming_mem["id"], {
                    "status": MemoryStatus.ACTIVE.value
                })
                reason = (
                    f"{detection_reason}. Policy: Newer timestamp wins. "
                    f"Incoming version ({incoming_mem.get('device_id', 'Device B')}, {time_b}) "
                    f"superseded older version ({existing_mem.get('device_id', 'Device A')}, {time_a})."
                )
                return ConflictDecision.B_WINS, reason, incoming_mem["id"]

            elif time_a > time_b:
                # Existing memory is more recent -> A wins!
                self.db.update_memory(incoming_mem["id"], {
                    "status": MemoryStatus.SUPERSEDED.value,
                    "supersedes": existing_mem["id"]
                })
                self.db.update_memory(existing_mem["id"], {
                    "status": MemoryStatus.ACTIVE.value
                })
                reason = (
                    f"{detection_reason}. Policy: Newer timestamp wins. "
                    f"Existing version ({existing_mem.get('device_id', 'Device A')}, {time_a}) "
                    f"superseded incoming version ({incoming_mem.get('device_id', 'Device B')}, {time_b})."
                )
                return ConflictDecision.A_WINS, reason, existing_mem["id"]

            else:
                # Timestamp tie -> Check source trust
                trust_a = existing_mem.get("source_trust", 1)
                trust_b = incoming_mem.get("source_trust", 1)
                if trust_b > trust_a:
                    self.db.update_memory(existing_mem["id"], {
                        "status": MemoryStatus.SUPERSEDED.value,
                        "supersedes": incoming_mem["id"]
                    })
                    reason = f"{detection_reason}. Timestamps tied; higher source trust ({trust_b} vs {trust_a}) awarded to incoming version."
                    return ConflictDecision.B_WINS, reason, incoming_mem["id"]
                elif trust_a > trust_b:
                    self.db.update_memory(incoming_mem["id"], {
                        "status": MemoryStatus.SUPERSEDED.value,
                        "supersedes": existing_mem["id"]
                    })
                    reason = f"{detection_reason}. Timestamps tied; higher source trust ({trust_a} vs {trust_b}) awarded to existing version."
                    return ConflictDecision.A_WINS, reason, existing_mem["id"]

        # Ambiguous cases: Flag for manual human review
        reason = f"{detection_reason}. Policy could not determine a definitive winner automatically; flagged for manual review."
        return ConflictDecision.NEEDS_REVIEW, reason, None

    def resolve_manual(self, conflict_id: str, decision: ConflictDecision, decision_reason: str, resolved_memory_id: Optional[str] = None) -> dict[str, Any]:
        conflict = self.db.get_conflict_record(conflict_id)
        if not conflict:
            raise ValueError(f"Conflict with ID '{conflict_id}' does not exist.")

        mem_a_id = conflict["memory_a_id"]
        mem_b_id = conflict["memory_b_id"]

        winning_id = resolved_memory_id
        if decision == ConflictDecision.A_WINS:
            winning_id = mem_a_id
            self.db.update_memory(mem_a_id, {"status": MemoryStatus.ACTIVE.value})
            self.db.update_memory(mem_b_id, {"status": MemoryStatus.SUPERSEDED.value, "supersedes": mem_a_id})
        elif decision == ConflictDecision.B_WINS:
            winning_id = mem_b_id
            self.db.update_memory(mem_b_id, {"status": MemoryStatus.ACTIVE.value})
            self.db.update_memory(mem_a_id, {"status": MemoryStatus.SUPERSEDED.value, "supersedes": mem_b_id})

        resolved = self.db.resolve_conflict(
            conflict_id=conflict_id,
            decision=decision.value,
            decision_reason=decision_reason,
            resolved_memory_id=winning_id
        )

        self.db.record_activity(
            event_type=ActivityEventType.CONFLICT_RESOLVED.value,
            actor_device_id=settings.DEVICE_ID,
            details={
                "conflict_id": conflict_id,
                "manual_resolution": True,
                "decision": decision.value,
                "reason": decision_reason,
                "winner_id": winning_id
            }
        )

        return resolved # type: ignore
