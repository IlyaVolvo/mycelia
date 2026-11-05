import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

import {
  normalizeTaxonomyFilter,
  type TaxonomyClosureEdge
} from "../domain/filter-semantics.js";

const groupParamsSchema = z.object({
  groupId: z.string().uuid()
});

const filterParamsSchema = groupParamsSchema.extend({
  filterId: z.string().uuid()
});

const closureEdgeSchema = z.object({
  ancestorId: z.string().uuid(),
  descendantId: z.string().uuid()
});

const previewSchema = z.object({
  includeNodeIds: z.array(z.string().uuid()).default([]),
  excludeNodeIds: z.array(z.string().uuid()).default([]),
  dateFrom: z.string().date().nullable().optional(),
  dateTo: z.string().date().nullable().optional(),
  closureEdges: z.array(closureEdgeSchema).default([])
});

const saveFilterSchema = z.object({
  createdByUserId: z.string().uuid(),
  name: z.string().min(1).max(120),
  criteria: z.object({
    includeNodeIds: z.array(z.string().uuid()).default([]),
    excludeNodeIds: z.array(z.string().uuid()).default([]),
    dateFrom: z.string().date().nullable().optional(),
    dateTo: z.string().date().nullable().optional()
  })
});

const patchFilterSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    criteria: saveFilterSchema.shape.criteria.optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

const filtersRoute: FastifyPluginAsync = async (app) => {
  app.post("/v1/groups/:groupId/filters/preview", async (request) => {
    const params = groupParamsSchema.parse(request.params);
    const body = previewSchema.parse(request.body);

    let closureEdges = body.closureEdges as TaxonomyClosureEdge[];

    if (closureEdges.length === 0) {
      const candidateIds = Array.from(new Set([...body.includeNodeIds, ...body.excludeNodeIds]));
      if (candidateIds.length > 0) {
        const edgeRows = (await app.sql`
          select
            ancestor_id::text as ancestor_id,
            descendant_id::text as descendant_id
          from taxonomy_closure
          where group_id = ${params.groupId}::uuid
            and (ancestor_id = any(${candidateIds}::uuid[]) or descendant_id = any(${candidateIds}::uuid[]))
        `) as { ancestor_id: string; descendant_id: string }[];

        closureEdges = edgeRows.map((row) => ({
          ancestorId: row.ancestor_id,
          descendantId: row.descendant_id
        }));
      }
    }

    const normalized = normalizeTaxonomyFilter({
      includeNodeIds: body.includeNodeIds,
      excludeNodeIds: body.excludeNodeIds,
      closureEdges
    });

    const countRows = (await app.sql`
      with included_places as (
        select distinct ptt.place_id
        from place_taxonomy_tags ptt
        join places p on p.id = ptt.place_id
        where p.group_id = ${params.groupId}::uuid
          and p.deleted_at is null
          and ptt.deleted_at is null
          and (
            cardinality(${normalized.effectiveIncludeNodeIds}::uuid[]) = 0
            or ptt.taxonomy_node_id = any(${normalized.effectiveIncludeNodeIds}::uuid[])
          )
      ),
      excluded_places as (
        select distinct ptt.place_id
        from place_taxonomy_tags ptt
        where ptt.deleted_at is null
          and cardinality(${normalized.effectiveExcludeNodeIds}::uuid[]) > 0
          and ptt.taxonomy_node_id = any(${normalized.effectiveExcludeNodeIds}::uuid[])
      )
      select count(*)::int as count
      from included_places ip
      where not exists (
        select 1
        from excluded_places ep
        where ep.place_id = ip.place_id
      )
    `) as { count: number }[];

    const sampleRows = (await app.sql`
      with included_places as (
        select distinct ptt.place_id
        from place_taxonomy_tags ptt
        join places p on p.id = ptt.place_id
        where p.group_id = ${params.groupId}::uuid
          and p.deleted_at is null
          and ptt.deleted_at is null
          and (
            cardinality(${normalized.effectiveIncludeNodeIds}::uuid[]) = 0
            or ptt.taxonomy_node_id = any(${normalized.effectiveIncludeNodeIds}::uuid[])
          )
      ),
      excluded_places as (
        select distinct ptt.place_id
        from place_taxonomy_tags ptt
        where ptt.deleted_at is null
          and cardinality(${normalized.effectiveExcludeNodeIds}::uuid[]) > 0
          and ptt.taxonomy_node_id = any(${normalized.effectiveExcludeNodeIds}::uuid[])
      )
      select ip.place_id::text as id
      from included_places ip
      where not exists (
        select 1
        from excluded_places ep
        where ep.place_id = ip.place_id
      )
      limit 20
    `) as { id: string }[];

    return {
      normalized: {
        includeNodeIds: normalized.canonicalIncludeNodeIds,
        excludeNodeIds: normalized.canonicalExcludeNodeIds
      },
      effective: {
        includeNodeIds: normalized.effectiveIncludeNodeIds,
        excludeNodeIds: normalized.effectiveExcludeNodeIds
      },
      count: countRows[0]?.count ?? 0,
      samplePlaceIds: sampleRows.map((row) => row.id)
    };
  });

  app.get("/v1/groups/:groupId/filters", async (request) => {
    const params = groupParamsSchema.parse(request.params);

    const rows = (await app.sql`
      select
        id::text,
        name,
        criteria_json,
        created_by_user_id::text,
        created_at,
        updated_at
      from saved_filters
      where group_id = ${params.groupId}::uuid
        and deleted_at is null
      order by updated_at desc
    `) as {
      id: string;
      name: string;
      criteria_json: unknown;
      created_by_user_id: string;
      created_at: string;
      updated_at: string;
    }[];

    return {
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        criteria: row.criteria_json,
        createdByUserId: row.created_by_user_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    };
  });

  app.post("/v1/groups/:groupId/filters", async (request, reply) => {
    const params = groupParamsSchema.parse(request.params);
    const body = saveFilterSchema.parse(request.body);

    const inserted = (await app.sql`
      insert into saved_filters (
        group_id,
        name,
        criteria_json,
        created_by_user_id
      )
      values (
        ${params.groupId}::uuid,
        ${body.name},
        ${JSON.stringify(body.criteria)}::jsonb,
        ${body.createdByUserId}::uuid
      )
      returning id::text
    `) as { id: string }[];

    return reply.code(201).send({ id: inserted[0]?.id });
  });

  app.patch("/v1/groups/:groupId/filters/:filterId", async (request, reply) => {
    const params = filterParamsSchema.parse(request.params);
    const body = patchFilterSchema.parse(request.body);

    const updated = (await app.sql`
      update saved_filters
      set
        name = coalesce(${body.name ?? null}, name),
        criteria_json = coalesce(${body.criteria ? JSON.stringify(body.criteria) : null}::jsonb, criteria_json),
        updated_at = now()
      where id = ${params.filterId}::uuid
        and group_id = ${params.groupId}::uuid
        and deleted_at is null
      returning id::text
    `) as { id: string }[];

    if (updated.length === 0) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Saved filter not found" });
    }

    return { id: updated[0].id };
  });

  app.delete("/v1/groups/:groupId/filters/:filterId", async (request, reply) => {
    const params = filterParamsSchema.parse(request.params);

    const deleted = (await app.sql`
      update saved_filters
      set deleted_at = now(), updated_at = now()
      where id = ${params.filterId}::uuid
        and group_id = ${params.groupId}::uuid
        and deleted_at is null
      returning id::text
    `) as { id: string }[];

    if (deleted.length === 0) {
      return reply.code(404).send({ code: "NOT_FOUND", message: "Saved filter not found" });
    }

    return reply.code(204).send();
  });
};

export default filtersRoute;
