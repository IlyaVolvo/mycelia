import { test } from "node:test";
import assert from "node:assert/strict";

import { normalizeTaxonomyFilter } from "../src/domain/filter-semantics.js";

const closure = [
  { ancestorId: "species", descendantId: "chanterelle" },
  { ancestorId: "species", descendantId: "boletus" },
  { ancestorId: "boletus", descendantId: "porcini" },
  { ancestorId: "species", descendantId: "porcini" }
];

test("deduplicates parent+child selection to parent canonical form", () => {
  const normalized = normalizeTaxonomyFilter({
    includeNodeIds: ["species", "chanterelle", "species"],
    excludeNodeIds: [],
    closureEdges: closure
  });

  assert.deepEqual(normalized.canonicalIncludeNodeIds, ["species"]);
  assert.deepEqual(
    new Set(normalized.effectiveIncludeNodeIds),
    new Set(["species", "chanterelle", "boletus", "porcini"])
  );
});

test("keeps leaf selection when parent is not selected", () => {
  const normalized = normalizeTaxonomyFilter({
    includeNodeIds: ["porcini"],
    excludeNodeIds: [],
    closureEdges: closure
  });

  assert.deepEqual(normalized.canonicalIncludeNodeIds, ["porcini"]);
  assert.deepEqual(normalized.effectiveIncludeNodeIds, ["porcini"]);
});

test("applies the same canonicalization and expansion rules to exclude nodes", () => {
  const normalized = normalizeTaxonomyFilter({
    includeNodeIds: [],
    excludeNodeIds: ["species", "boletus"],
    closureEdges: closure
  });

  assert.deepEqual(normalized.canonicalExcludeNodeIds, ["species"]);
  assert.deepEqual(
    new Set(normalized.effectiveExcludeNodeIds),
    new Set(["species", "chanterelle", "boletus", "porcini"])
  );
});
