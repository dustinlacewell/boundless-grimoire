# Architecture-First Development

Decompose before implementing. One class per file, ~200 lines max.

- Start with headers/interfaces first
- Composition over inheritance
- Orchestrators delegate, don't implement

## Adding Features

1. Does this belong in an existing component? If it's already large, split first.
2. Can this be a standalone utility class? (smoothing, ownership, batching = separate)
3. Keep Module/Widget focused on UI, delegate logic to managers.
