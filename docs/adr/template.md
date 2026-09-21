# ADR-NNNN — Short decision title

- **Status**: Proposed | Accepted | Superseded by ADR-NNNN | Deprecated
- **Date**: YYYY-MM-DD
- **Deciders**: who holds the decision
- **Affects**: layers, subsystems, and paths touched

## Context

The forces at play: the requirement, the constraint, the spec mandate, and what the
repository does today. State measured facts (paths, model names, versions) rather
than intentions. Reference the source of any external requirement.

## Decision

The single choice made, in one or two sentences, in the imperative voice.

Then the mechanical detail: interfaces, fields, config keys, and the invariants that
must hold. Anything a reviewer could check the implementation against.

## Consequences

### Positive

- Capability or property gained.

### Negative / accepted trade-offs

- Cost, limitation, or debt knowingly accepted. Every ADR must carry at least one.

## Alternatives considered

| Option | Why not chosen |
|---|---|
| Alternative A | Reason, tied to a constraint above. |

## Swap point

The seam that keeps this decision reversible: the interface, config flag, or module
boundary behind which a different implementation can be dropped without touching
callers. Name the file or contract that owns the seam.

## References

- `path/to/file` — what it establishes
- Related ADR or external specification