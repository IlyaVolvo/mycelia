export type TaxonomyClosureEdge = {
  ancestorId: string;
  descendantId: string;
};

export type NormalizeTaxonomyFilterInput = {
  includeNodeIds: string[];
  excludeNodeIds: string[];
  closureEdges: TaxonomyClosureEdge[];
};

export type NormalizeTaxonomyFilterOutput = {
  canonicalIncludeNodeIds: string[];
  canonicalExcludeNodeIds: string[];
  effectiveIncludeNodeIds: string[];
  effectiveExcludeNodeIds: string[];
};

const dedupe = (ids: string[]) => Array.from(new Set(ids));

const buildAncestorIndex = (edges: TaxonomyClosureEdge[]) => {
  const ancestorsByDescendant = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (edge.ancestorId === edge.descendantId) {
      continue;
    }

    const set = ancestorsByDescendant.get(edge.descendantId) ?? new Set<string>();
    set.add(edge.ancestorId);
    ancestorsByDescendant.set(edge.descendantId, set);
  }
  return ancestorsByDescendant;
};

const buildDescendantIndex = (edges: TaxonomyClosureEdge[]) => {
  const descendantsByAncestor = new Map<string, Set<string>>();
  for (const edge of edges) {
    if (edge.ancestorId === edge.descendantId) {
      continue;
    }

    const set = descendantsByAncestor.get(edge.ancestorId) ?? new Set<string>();
    set.add(edge.descendantId);
    descendantsByAncestor.set(edge.ancestorId, set);
  }
  return descendantsByAncestor;
};

const canonicalizeSelection = (
  selectedIds: string[],
  ancestorsByDescendant: Map<string, Set<string>>
) => {
  const unique = dedupe(selectedIds);
  const selectedSet = new Set(unique);

  return unique.filter((id) => {
    const ancestors = ancestorsByDescendant.get(id);
    if (!ancestors) {
      return true;
    }

    for (const ancestor of ancestors) {
      if (selectedSet.has(ancestor)) {
        return false;
      }
    }

    return true;
  });
};

const expandWithDescendants = (
  canonicalIds: string[],
  descendantsByAncestor: Map<string, Set<string>>
) => {
  const expanded = new Set<string>(canonicalIds);

  for (const id of canonicalIds) {
    const descendants = descendantsByAncestor.get(id);
    if (!descendants) {
      continue;
    }
    for (const descendant of descendants) {
      expanded.add(descendant);
    }
  }

  return Array.from(expanded);
};

export const normalizeTaxonomyFilter = (
  input: NormalizeTaxonomyFilterInput
): NormalizeTaxonomyFilterOutput => {
  const ancestorsByDescendant = buildAncestorIndex(input.closureEdges);
  const descendantsByAncestor = buildDescendantIndex(input.closureEdges);

  const canonicalIncludeNodeIds = canonicalizeSelection(input.includeNodeIds, ancestorsByDescendant);
  const canonicalExcludeNodeIds = canonicalizeSelection(input.excludeNodeIds, ancestorsByDescendant);

  const effectiveIncludeNodeIds = expandWithDescendants(canonicalIncludeNodeIds, descendantsByAncestor);
  const effectiveExcludeNodeIds = expandWithDescendants(canonicalExcludeNodeIds, descendantsByAncestor);

  return {
    canonicalIncludeNodeIds,
    canonicalExcludeNodeIds,
    effectiveIncludeNodeIds,
    effectiveExcludeNodeIds
  };
};
