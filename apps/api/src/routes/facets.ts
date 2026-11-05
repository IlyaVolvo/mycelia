import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const groupParamsSchema = z.object({
  groupId: z.string().uuid()
});

const placeParamsSchema = groupParamsSchema.extend({
  placeId: z.string().uuid()
});

const captureFacetItemSchema = z.object({
  key: z.string().min(1).max(80),
  value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  source: z.enum(["device", "server_enrichment", "import"]).default("device")
});

const captureSchema = z.object({
  items: z.array(captureFacetItemSchema).min(1)
});

const facetsRoute: FastifyPluginAsync = async (app) => {
  app.get("/v1/system/facets/definitions", async () => {
    const rows = (await app.sql`
      select
        key,
        value_type,
        unit,
        enum_values,
        is_user_editable,
        is_active
      from system_facet_definitions
      where is_active = true
      order by key asc
    `) as {
      key: string;
      value_type: string;
      unit: string | null;
      enum_values: unknown;
      is_user_editable: boolean;
      is_active: boolean;
    }[];

    return {
      items: rows.map((row) => ({
        key: row.key,
        valueType: row.value_type,
        unit: row.unit,
        enumValues: row.enum_values,
        isUserEditable: row.is_user_editable,
        isActive: row.is_active
      }))
    };
  });

  app.get("/v1/groups/:groupId/places/:placeId/facets", async (request) => {
    const params = placeParamsSchema.parse(request.params);

    const placeRows = (await app.sql`
      select id::text
      from places
      where id = ${params.placeId}::uuid
        and group_id = ${params.groupId}::uuid
        and deleted_at is null
    `) as { id: string }[];

    if (placeRows.length === 0) {
      return {
        items: [],
        missing: []
      };
    }

    const rows = (await app.sql`
      select
        d.key,
        d.value_type,
        d.unit,
        v.value_json,
        v.captured_at,
        v.source
      from system_facet_definitions d
      left join place_system_facet_values v
        on v.facet_definition_id = d.id
       and v.place_id = ${params.placeId}::uuid
      where d.is_active = true
      order by d.key asc
    `) as {
      key: string;
      value_type: string;
      unit: string | null;
      value_json: unknown | null;
      captured_at: string | null;
      source: string | null;
    }[];

    const items = rows
      .filter((row) => row.value_json !== null)
      .map((row) => ({
        key: row.key,
        valueType: row.value_type,
        unit: row.unit,
        value: row.value_json,
        capturedAt: row.captured_at,
        source: row.source
      }));

    const missing = rows.filter((row) => row.value_json === null).map((row) => row.key);

    return {
      items,
      missing
    };
  });

  app.post("/v1/groups/:groupId/places/:placeId/facets/system-capture", async (request, reply) => {
    const params = placeParamsSchema.parse(request.params);
    const body = captureSchema.parse(request.body);

    const placeRows = (await app.sql`
      select id::text
      from places
      where id = ${params.placeId}::uuid
        and group_id = ${params.groupId}::uuid
        and deleted_at is null
    `) as { id: string }[];

    if (placeRows.length === 0) {
      return reply.code(404).send({
        code: "NOT_FOUND",
        message: "Place not found in group"
      });
    }

    for (const item of body.items) {
      const definitions = (await app.sql`
        select id::text, is_active, is_user_editable
        from system_facet_definitions
        where key = ${item.key}
      `) as { id: string; is_active: boolean; is_user_editable: boolean }[];

      if (definitions.length === 0 || !definitions[0].is_active) {
        continue;
      }

      await app.sql`
        insert into place_system_facet_values (
          place_id,
          facet_definition_id,
          value_json,
          captured_at,
          source,
          updated_at
        )
        values (
          ${params.placeId}::uuid,
          ${definitions[0].id}::uuid,
          ${JSON.stringify(item.value)}::jsonb,
          now(),
          ${item.source},
          now()
        )
        on conflict (place_id, facet_definition_id)
        do update set
          value_json = excluded.value_json,
          captured_at = excluded.captured_at,
          source = excluded.source,
          updated_at = now()
      `;
    }

    return reply.code(202).send({
      accepted: true
    });
  });
};

export default facetsRoute;
