# Plan: derive all generated types from the bundled `VIEW_DEFINITIONS`, and add container types

> Status: **proposed / not started.** Design note captured from a discussion in
> the `feat/expand-implemented-views` work. Pick this up as a follow-up; it is a
> larger change than the `resolveViews` fix that prompted it.

## TL;DR

Today codegen emits **two parallel representations** of a data model:

1. a **value** — `VIEW_DEFINITIONS` (an `as const`-typed array of view
   definitions) plus `__VIEWS` / `__DATA_MODEL` constants, and
2. **types** — a per-view alias `space__externalId__version`, plus `__Schema`,
   `Schema`, and `DirectReference<T>`, all built with the TypeScript compiler
   API in [`packages/codegen/src/index.ts`](../packages/codegen/src/index.ts).

The consumer wires them together **by hand**:

```ts
import { __Schema, VIEW_DEFINITIONS } from 'data_models/dm_example@2';
const helpers = createHelpers<__Schema>(VIEW_DEFINITIONS);
```

`__Schema` (a type) and `VIEW_DEFINITIONS` (a value) are derived from the same
source but connected manually, so they can drift. They also encode the same
information twice.

**Proposal:** stop emitting the view/schema *types* from codegen. Emit
essentially only the `as const` `VIEW_DEFINITIONS` (+ `__DATA_MODEL`). Derive all
type-level machinery — `Schema`, per-view property types, view-reference
resolution — from `typeof VIEW_DEFINITIONS` using **library types** shipped in
`@omnysecurity/cognite-helpers`. This removes drift, removes the dangling-
reference class of bug entirely, and unifies three hand-written copies of the
same inference into one.

There is a **hard gate before committing: TypeScript performance.** See
[Performance gate](#performance-gate).

Separately (and enabled by the same insight), **container types can be derived
from the mapped view properties** — no container fetch required for the *type
generation* use case.

## Background / why this came up

- The `resolveViews` fix (shipped in the `feat/expand-implemented-views` PR)
  addressed a concrete bug: a view that `implements` another view emits
  `T = Child & Base`, but if `Base` was not listed on the data model, codegen
  never generated the `Base` type, producing a dangling reference. `resolveViews`
  fetches the transitive `implements` closure so `Base` is always present.
- While fixing it, we noticed the emitted intersection is *the source of* that
  bug class. If types were derived from the `as const` data (which CDF already
  flattens — a view's `properties` map already contains inherited properties),
  there would be no emitted alias to dangle.
- **PR #36 (`feat: instance builder`)** independently proves the direction: its
  `createInstanceBuilder(viewDefinitions)` derives **everything** at the type
  level directly from the `as const` shape — `PropertyValue<TProp>`,
  `UpsertProperties<TProps>`, `AllViewReferences<TViews>`,
  `UnambiguousViewReference<TViews>` — and uses **none** of codegen's emitted
  aliases or `__Schema`. It re-implements, in the type system, exactly what
  codegen does with the compiler API. That is the maintenance smell this plan
  removes.

## Key insight: `VIEW_DEFINITIONS` is complete for type generation

For generating **types** (as opposed to storage/authoring artifacts),
`VIEW_DEFINITIONS` contains everything needed:

- **Property types, nullability, list-ness, enums** — all present per view
  property.
- **Inherited properties** — CDF flattens implemented-view properties into each
  view's own `properties` map (the container back-reference points at the
  ancestor's container). This is why today's codegen filters by container to
  decide "own vs inherited". Derivation gets inheritance for free from the data.
- **Direct/connection sources** — each carries `{ space, externalId, version }`,
  enough to resolve to another view's derived type (or `unknown` when the target
  is outside the bundle — same degradation as the current fix).

### Container types can be derived too

Each mapped view property carries `containerPropertyIdentifier` — the **original
property name in the container** (the name is preserved even when the view
renames the property). That is the join key: container property → view rename.

The naive objection is "views are a lossy projection of containers" — a view may
map only 3 of a container's 10 properties, and container-level constraints /
indexes never appear in views. **But for type generation that loss is correct
scoping, not a defect:**

- A container property that **no** view in this model maps is not part of this
  model's surface — code using this model cannot read or write it through these
  views anyway. Excluding it (and deprecated/removed properties) is desirable.
- A **required** (non-nullable, non-defaulted) property that the model actually
  uses is, by definition, mapped by some view — so it is visible. If a required
  container property is unmapped, the model cannot create valid instances through
  its own views regardless; that is a source-modeling issue, not something
  codegen should paper over.
- **Constraints and indexes do not affect the shape of a type.** A uniqueness
  constraint or btree index adds/removes/retypes no field. Today's codegen
  already ignores them (it only reads `view.properties`). So deriving container
  types from mapped view properties is **no worse than today** on this axis.

**Conclusion:** for *type generation*, no container fetch is needed. Container
types are a grouping/renaming of properties already present in
`VIEW_DEFINITIONS`, joined via `containerPropertyIdentifier`. A container fetch
(`client.containers.retrieve`) would only be required for a *different* feature —
emitting container **authoring** payloads or validating constraints — which is
out of scope for these packages today.

## Performance gate

Emitting a materialized `__Schema` today is a deliberate performance choice
(the `icy-impalas-double` changeset: *"statically resolve unambiguous view
references for better TypeScript performance"*). A flat, materialized
`{ "sp__X__v": {...} }` map is indexed with a single property access; the
compiler does not re-derive it on every hover/check.

PR #36's style is the cautionary counter-example: `AllViewReferences<TViews>` and
`ViewsMatchingRef<TViews, TRef>` are **tuple-recursive** (`[First, ...Rest]`)
conditional types, re-evaluated per lookup — roughly O(views × lookups) of
instantiation, recomputed every check. On large models this is where tsc gets
slow and hits instantiation-depth limits.

**The middle path — derive, but materialize with a non-recursive mapped type:**

```ts
// non-recursive: O(n) mapped type over an object, no [First, ...Rest] recursion
type Schema<TDefs extends readonly ViewLike[]> = {
  [K in ViewIdOf<TDefs[number]>]: ViewProps<ViewById<TDefs, K>>;
};
```

A mapped type over an object/union is far cheaper than tuple recursion and still
produces a flat, fast-to-index result. The goal is: **derived (no drift, no
dangling) AND materialized (fast), without the per-lookup recursion tax.**

### The experiment that decides the architecture

Before committing, benchmark on the **largest real model** with
`tsc --extendedDiagnostics` (compare *Instantiations* and *Check time*) across
three variants:

1. **Today** — emitted per-view aliases + emitted `__Schema`.
2. **Derived, materialized** — `Schema<typeof VIEW_DEFINITIONS>` via a
   non-recursive mapped type (this proposal).
3. **Derived, recursive** — PR #36-style tuple recursion (expected worst; useful
   as an upper bound).

If variant 2's instantiation count and check time are within an acceptable delta
of variant 1, the derive direction wins outright.

## Proposed end state

- **codegen output** shrinks to roughly:
  - `VIEW_DEFINITIONS` (`as const`, via the existing `_Mutable` wrapper),
  - `__DATA_MODEL`,
  - (optionally) `__VIEWS` if still used at runtime.
  - The AST-type-emission path — per-view aliases, `__Schema`, `Schema`,
    `DirectReference` — is **deleted**. Most of
    [`packages/codegen/src/index.ts`](../packages/codegen/src/index.ts) goes
    away.
- **`@omnysecurity/cognite-helpers`** gains the derivation library types, used by
  both `createHelpers` and PR #36's instance-builder (one shared implementation
  instead of three):
  - `Schema<TDefs>` — replaces the emitted `__Schema` (materialized mapped type).
  - `ViewProps<TView>` — per-view read/write property shape (enum → key union,
    primitives → TS types, list → array, direct → `DirectReference<...>`).
  - `ContainerTypes<TDefs>` — container-grouped property types, joined on
    `containerPropertyIdentifier` (the new container-types feature).
  - View-reference resolution (`UnambiguousViewReference`, `ResolveViewKey`,
    `ResolveView`) — already exists in
    [`helpers.ts`](../packages/helpers/src/helpers.ts); reconcile with PR #36's
    `AllViewReferences` / `ViewsMatchingRef` into one set.
- **consumer call site** simplifies — no manual type argument:
  ```ts
  import { VIEW_DEFINITIONS } from 'data_models/dm_example@2';
  const helpers = createHelpers(VIEW_DEFINITIONS); // Schema inferred from the const
  ```

## Migration / sequencing

1. **Prototype + benchmark** (the gate above). If perf fails, stop — keep
   emitting materialized types, but still consider deriving them *at codegen
   time* from the same source to kill drift.
2. **Land the derivation library types** in `@omnysecurity/cognite-helpers`
   behind the new `Schema<typeof VIEW_DEFINITIONS>` entry point. Reconcile with
   PR #36 so the instance-builder consumes the shared types.
3. **Make `createHelpers` infer `TSchema`** from the passed definitions
   (`createHelpers(VIEW_DEFINITIONS)`), keeping the explicit-generic form working
   for one release for backwards compatibility.
4. **Add container-type derivation** (`ContainerTypes<TDefs>`), joined on
   `containerPropertyIdentifier`. This also naturally types inherited
   direct-relations, closing the `// TODO: Direct relation-types are not exported`
   gap in [`index.ts`](../packages/codegen/src/index.ts).
5. **Slim codegen output** — stop emitting the view/schema type aliases; emit
   only `VIEW_DEFINITIONS` + `__DATA_MODEL`. Update snapshots, README, and the
   consumer examples.
6. **Changeset** — `minor` for both `@omnysecurity/cognite-codegen` and
   `@omnysecurity/cognite-codegen-cli`; `minor` for
   `@omnysecurity/cognite-helpers` (new derivation types). If the consumer call
   site changes in a non-backwards-compatible way, that is a **major** for the
   affected package(s) — prefer keeping the old form working to avoid it.

## Notes / gotchas

- **`resolveViews` is still needed** under the derived architecture: you must
  ensure the bundled `VIEW_DEFINITIONS` contains the implemented views'
  *definitions* so their properties are inferable. It just stops feeding an
  emitted intersection.
- **Enums** must derive to the key union (`keyof values & string`) — see the
  existing handling in codegen and in PR #36's `PropertyValue`.
- **Direct relations to views outside the bundle** should derive to
  `DirectReference<unknown>`, matching the degradation added in the
  `resolveViews` fix.
- **Ambiguous view references** (same `externalId` across spaces/versions) are
  already handled by helpers' `UnambiguousViewReference`; preserve that behavior
  in the unified types.
- **Related code to touch:** [`packages/codegen/src/index.ts`](../packages/codegen/src/index.ts),
  [`packages/helpers/src/helpers.ts`](../packages/helpers/src/helpers.ts),
  [`packages/helpers/src/filter.ts`](../packages/helpers/src/filter.ts),
  PR #36's `packages/helpers/src/instance-builder.ts`, and both READMEs.
```
