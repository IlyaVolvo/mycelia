import { z } from "zod";
const createGroupSchema = z.object({
    name: z.string().min(2).max(80),
    createdByUserId: z.string().uuid()
});
const createPlaceSchema = z.object({
    groupId: z.string().uuid(),
    createdByUserId: z.string().uuid(),
    name: z.string().min(1).max(120),
    description: z.string().max(4000).optional(),
    observedDate: z.string().date().optional(),
    sourceType: z.enum(["gps", "tap", "exif", "import"]).default("tap"),
    latitude: z.number().gte(-90).lte(90),
    longitude: z.number().gte(-180).lte(180)
});
const getNearbySchema = z.object({
    groupId: z.string().uuid(),
    latitude: z.coerce.number().gte(-90).lte(90),
    longitude: z.coerce.number().gte(-180).lte(180),
    radiusMeters: z.coerce.number().int().positive().max(10000).default(1000)
});
const placesRoute = async (app) => {
    app.post("/v1/groups", async (request, reply) => {
        const body = createGroupSchema.parse(request.body);
        const created = (await app.sql `
      insert into groups (name, created_by_user_id)
      values (${body.name}, ${body.createdByUserId}::uuid)
      returning id::text
    `);
        const groupId = created[0].id;
        await app.sql `
      insert into group_memberships (group_id, user_id, role)
      values (${groupId}::uuid, ${body.createdByUserId}::uuid, 'owner')
      on conflict do nothing
    `;
        return reply.code(201).send({ id: groupId });
    });
    app.post("/v1/places", async (request, reply) => {
        const body = createPlaceSchema.parse(request.body);
        const inserted = (await app.sql `
      insert into places (
        group_id,
        name,
        description,
        observed_date,
        latitude,
        longitude,
        source_type,
        created_by_user_id
      )
      values (
        ${body.groupId}::uuid,
        ${body.name},
        ${body.description ?? null},
        ${body.observedDate ?? null}::date,
        ${body.latitude},
        ${body.longitude},
        ${body.sourceType},
        ${body.createdByUserId}::uuid
      )
      returning id::text
    `);
        return reply.code(201).send({ id: inserted[0].id });
    });
    app.get("/v1/places/nearby", async (request) => {
        const query = getNearbySchema.parse(request.query);
        const rows = (await app.sql `
      select
        p.id::text,
        p.name,
        p.description,
        p.latitude,
        p.longitude,
        p.source_type,
        p.observed_date::text,
        ST_Distance(
          p.geom,
          ST_SetSRID(ST_MakePoint(${query.longitude}, ${query.latitude}), 4326)::geography
        ) as distance_meters
      from places p
      where p.group_id = ${query.groupId}::uuid
        and p.deleted_at is null
        and ST_DWithin(
          p.geom,
          ST_SetSRID(ST_MakePoint(${query.longitude}, ${query.latitude}), 4326)::geography,
          ${query.radiusMeters}
        )
      order by distance_meters asc
      limit 300
    `);
        return { items: rows };
    });
};
export default placesRoute;
