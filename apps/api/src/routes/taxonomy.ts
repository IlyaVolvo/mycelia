import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";

const paramsSchema = z.object({
  groupId: z.string().uuid()
});

const nodeParamsSchema = paramsSchema.extend({
  nodeId: z.string().uuid()
});

const placeTagParamsSchema = paramsSchema.extend({
  placeId: z.string().uuid(),
  nodeId: z.string().uuid()
});

const placeParamsSchema = paramsSchema.extend({
  placeId: z.string().uuid()
});

const listQuerySchema = z.object({
  view: z.string().default("default"),
  maxDepth: z.coerce.number().int().positive().max(10).default(2)
});

const createNodeSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.enum(["species", "terrain", "condition", "season"]),
  parentId: z.string().uuid().nullable().optional(),
  iconKey: z.string().min(1).max(120).optional(),
  color: z.string().max(20).optional()
});

const updateNodeSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    iconKey: z.string().min(1).max(120).optional(),
    color: z.string().max(20).optional()
  })
  .refine((value) => Object.keys(value).length > 0, "At least one field must be provided");

const normalizeName = (value: string) => value.trim().toLowerCase();

type Membership = {
  userId: string;
  role: "owner" | "editor" | "viewer";
};

const isMutationRole = (role: Membership["role"]) => role === "owner" || role === "editor";

const resolveGroupMembership = async (
  app: FastifyInstance,
  groupId: string,
  clerkUserIdHeader: unknown
): Promise<Membership | null> => {
  const clerkUserId = Array.isArray(clerkUserIdHeader)
    ? clerkUserIdHeader[0]?.toString()
    : clerkUserIdHeader?.toString();

  if (!clerkUserId) {
    return null;
  }

  const rows = (await app.sql`
    select
      u.id::text as user_id,
      gm.role::text as role
    from users u
    join group_memberships gm on gm.user_id = u.id
    where gm.group_id = ${groupId}::uuid
      and u.clerk_user_id = ${clerkUserId}
    limit 1
  `) as { user_id: string; role: "owner" | "editor" | "viewer" }[];

  if (rows.length === 0) {
    return null;
  }

  return {
    userId: rows[0].user_id,
    role: rows[0].role
  };
};

const taxonomyRoute: FastifyPluginAsync = async (app) => {
  app.get("/v1/groups/:groupId/taxonomy", async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    const query = listQuerySchema.parse(request.query);
    const membership = await resolveGroupMembership(app, params.groupId, request.headers["x-clerk-user-id"]);

    if (!membership) {
      return reply.code(403).send({
        code: "FORBIDDEN",
        message: "User is not a group member"
      });
    }

    const rows = (await app.sql`
      with recursive tree as (
        select
          n.id,
          n.parent_id,
          n.name,
          n.category,
          n.icon_key,
          n.color,
          0::int as depth
        from taxonomy_nodes n
        where n.group_id = ${params.groupId}::uuid
          and n.parent_id is null
          and n.deleted_at is null

        union all

        select
          c.id,
          c.parent_id,
          c.name,
          c.category,
          c.icon_key,
          c.color,
          (tree.depth + 1)::int as depth
        from taxonomy_nodes c
        join tree on c.parent_id = tree.id
        where c.group_id = ${params.groupId}::uuid
          and c.deleted_at is null
          and tree.depth < ${query.maxDepth - 1}
      )
      select
        t.id::text as id,
        t.parent_id::text as parent_id,
        t.name,
        t.category,
        t.icon_key,
        t.color,
        t.depth,
        exists(
          select 1
          from taxonomy_nodes child
          where child.parent_id = t.id
            and child.deleted_at is null
        ) as has_children
      from tree t
      order by t.depth asc, t.name asc
    `) as {
      id: string;
      parent_id: string | null;
      name: string;
      category: string;
      icon_key: string;
      color: string | null;
      depth: number;
      has_children: boolean;
    }[];

    return {
      groupId: params.groupId,
      view: query.view,
      maxDepth: query.maxDepth,
      items: rows.map((row) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        parentId: row.parent_id,
        depth: row.depth,
        iconKey: row.icon_key,
        color: row.color,
        hasChildren: row.has_children
      })),
      cursor: null
    };
  });

  app.post("/v1/groups/:groupId/taxonomy/nodes", async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    const membership = await resolveGroupMembership(app, params.groupId, request.headers["x-clerk-user-id"]);

    if (!membership || !isMutationRole(membership.role)) {
      return reply.code(403).send({ code: "FORBIDDEN", message: "Insufficient role for taxonomy mutation" });
    }
    const body = createNodeSchema.parse(request.body);

    if (body.parentId) {
      const parentRows = (await app.sql`
        select id::text, parent_id::text
        from taxonomy_nodes
        where id = ${body.parentId}::uuid
          and group_id = ${params.groupId}::uuid
          and deleted_at is null
      `) as { id: string; parent_id: string | null }[];

      if (parentRows.length === 0) {
        return reply.code(404).send({
          code: "NOT_FOUND",
          message: "Parent taxonomy node not found in group"
        });
      }

      if (parentRows[0].parent_id !== null) {
        return reply.code(400).send({
          code: "VALIDATION_ERROR",
          message: "Default taxonomy create endpoint supports up to level-2 only"
        });
      }
    }

    const iconKey = body.iconKey ?? `${body.category}-default`;
    const normalizedName = normalizeName(body.name);

    const inserted = (await app.sql`
      insert into taxonomy_nodes (
        group_id,
        parent_id,
        name,
        normalized_name,
        category,
        icon_key,
        color,
        created_by_user_id
      )
      values (
        ${params.groupId}::uuid,
        ${body.parentId ?? null}::uuid,
        ${body.name.trim()},
        ${normalizedName},
        ${body.category},
        ${iconKey},
        ${body.color ?? null},
        ${membership.userId}::uuid
      )
      returning id::text
    `) as { id: string }[];

    const nodeId = inserted[0]?.id;

    await app.sql`
      insert into taxonomy_closure (group_id, ancestor_id, descendant_id, depth)
      values (${params.groupId}::uuid, ${nodeId}::uuid, ${nodeId}::uuid, 0)
      on conflict do nothing
    `;

    if (body.parentId) {
      await app.sql`
        insert into taxonomy_closure (group_id, ancestor_id, descendant_id, depth)
        select
          ${params.groupId}::uuid,
          ancestor_id,
          ${nodeId}::uuid,
          depth + 1
        from taxonomy_closure
        where descendant_id = ${body.parentId}::uuid
        on conflict do nothing
      `;
    }

    return reply.code(201).send({ id: nodeId });
  });

  app.post("/v1/groups/:groupId/taxonomy/nodes/advanced", async (request, reply) => {
    const params = paramsSchema.parse(request.params);
    const membership = await resolveGroupMembership(app, params.groupId, request.headers["x-clerk-user-id"]);

    if (!membership || !isMutationRole(membership.role)) {
      return reply.code(403).send({ code: "FORBIDDEN", message: "Insufficient role for taxonomy mutation" });
    }
    const body = createNodeSchema.parse(request.body);

    if (body.parentId) {
      const parentRows = (await app.sql`
        select id::text
        from taxonomy_nodes
        where id = ${body.parentId}::uuid
          and group_id = ${params.groupId}::uuid
          and deleted_at is null
      `) as { id: string }[];

      if (parentRows.length === 0) {
        return reply.code(404).send({
          code: "NOT_FOUND",
          message: "Parent taxonomy node not found in group"
        });
      }
    }

    const iconKey = body.iconKey ?? `${body.category}-default`;
    const normalizedName = normalizeName(body.name);

    const inserted = (await app.sql`
      insert into taxonomy_nodes (
        group_id,
        parent_id,
        name,
        normalized_name,
        category,
        icon_key,
        color,
        created_by_user_id
      )
      values (
        ${params.groupId}::uuid,
        ${body.parentId ?? null}::uuid,
        ${body.name.trim()},
        ${normalizedName},
        ${body.category},
        ${iconKey},
        ${body.color ?? null},
        ${membership.userId}::uuid
      )
      returning id::text
    `) as { id: string }[];

    const nodeId = inserted[0]?.id;

    await app.sql`
      insert into taxonomy_closure (group_id, ancestor_id, descendant_id, depth)
      values (${params.groupId}::uuid, ${nodeId}::uuid, ${nodeId}::uuid, 0)
      on conflict do nothing
    `;

    if (body.parentId) {
      await app.sql`
        insert into taxonomy_closure (group_id, ancestor_id, descendant_id, depth)
        select
          ${params.groupId}::uuid,
          ancestor_id,
          ${nodeId}::uuid,
          depth + 1
        from taxonomy_closure
        where descendant_id = ${body.parentId}::uuid
        on conflict do nothing
      `;
    }

    return reply.code(201).send({ id: nodeId });
  });

  app.patch("/v1/groups/:groupId/taxonomy/nodes/:nodeId", async (request, reply) => {
    const params = nodeParamsSchema.parse(request.params);
    const membership = await resolveGroupMembership(app, params.groupId, request.headers["x-clerk-user-id"]);

    if (!membership || !isMutationRole(membership.role)) {
      return reply.code(403).send({ code: "FORBIDDEN", message: "Insufficient role for taxonomy mutation" });
    }
    const body = updateNodeSchema.parse(request.body);

    const updated = (await app.sql`
      update taxonomy_nodes
      set
        name = coalesce(${body.name ?? null}, name),
        normalized_name = case
          when ${body.name ?? null} is null then normalized_name
          else ${body.name ? normalizeName(body.name) : null}
        end,
        icon_key = coalesce(${body.iconKey ?? null}, icon_key),
        color = coalesce(${body.color ?? null}, color),
        updated_at = now(),
        version = version + 1
      where id = ${params.nodeId}::uuid
        and group_id = ${params.groupId}::uuid
        and deleted_at is null
      returning id::text
    `) as { id: string }[];

    if (updated.length === 0) {
      return reply.code(404).send({
        code: "NOT_FOUND",
        message: "Taxonomy node not found"
      });
    }

    return { id: updated[0].id };
  });

  app.delete("/v1/groups/:groupId/taxonomy/nodes/:nodeId", async (request, reply) => {
    const params = nodeParamsSchema.parse(request.params);
    const membership = await resolveGroupMembership(app, params.groupId, request.headers["x-clerk-user-id"]);

    if (!membership || !isMutationRole(membership.role)) {
      return reply.code(403).send({ code: "FORBIDDEN", message: "Insufficient role for taxonomy mutation" });
    }

    const descendants = (await app.sql`
      select descendant_id::text as id
      from taxonomy_closure
      where ancestor_id = ${params.nodeId}::uuid
    `) as { id: string }[];

    if (descendants.length === 0) {
      return reply.code(404).send({
        code: "NOT_FOUND",
        message: "Taxonomy node not found"
      });
    }

    await app.sql`
      update taxonomy_nodes
      set deleted_at = now(), updated_at = now(), version = version + 1
      where group_id = ${params.groupId}::uuid
        and id in (select descendant_id from taxonomy_closure where ancestor_id = ${params.nodeId}::uuid)
        and deleted_at is null
    `;

    await app.sql`
      update place_taxonomy_tags
      set deleted_at = now(), version = version + 1
      where taxonomy_node_id in (
        select descendant_id from taxonomy_closure where ancestor_id = ${params.nodeId}::uuid
      )
        and deleted_at is null
    `;

    return reply.code(204).send();
  });

  app.post("/v1/groups/:groupId/places/:placeId/taxonomy/:nodeId", async (request, reply) => {
    const params = placeTagParamsSchema.parse(request.params);
    const membership = await resolveGroupMembership(app, params.groupId, request.headers["x-clerk-user-id"]);

    if (!membership || !isMutationRole(membership.role)) {
      return reply.code(403).send({ code: "FORBIDDEN", message: "Insufficient role for taxonomy mutation" });
    }

    await app.sql`
      insert into place_taxonomy_tags (place_id, taxonomy_node_id)
      select ${params.placeId}::uuid, ${params.nodeId}::uuid
      where exists (
        select 1
        from places p
        where p.id = ${params.placeId}::uuid
          and p.group_id = ${params.groupId}::uuid
          and p.deleted_at is null
      )
      and exists (
        select 1
        from taxonomy_nodes tn
        where tn.id = ${params.nodeId}::uuid
          and tn.group_id = ${params.groupId}::uuid
          and tn.deleted_at is null
      )
      on conflict (place_id, taxonomy_node_id)
      do update set deleted_at = null, version = place_taxonomy_tags.version + 1
    `;

    return reply.code(204).send();
  });

  app.delete("/v1/groups/:groupId/places/:placeId/taxonomy/:nodeId", async (request, reply) => {
    const params = placeTagParamsSchema.parse(request.params);
    const membership = await resolveGroupMembership(app, params.groupId, request.headers["x-clerk-user-id"]);

    if (!membership || !isMutationRole(membership.role)) {
      return reply.code(403).send({ code: "FORBIDDEN", message: "Insufficient role for taxonomy mutation" });
    }

    await app.sql`
      update place_taxonomy_tags
      set deleted_at = now(), version = version + 1
      where place_id = ${params.placeId}::uuid
        and taxonomy_node_id = ${params.nodeId}::uuid
        and deleted_at is null
    `;

    return reply.code(204).send();
  });

  app.get("/v1/groups/:groupId/places/:placeId/taxonomy", async (request, reply) => {
    const params = placeParamsSchema.parse(request.params);
    const membership = await resolveGroupMembership(app, params.groupId, request.headers["x-clerk-user-id"]);

    if (!membership) {
      return reply.code(403).send({
        code: "FORBIDDEN",
        message: "User is not a group member"
      });
    }

    const rows = (await app.sql`
      select
        n.id::text as node_id,
        n.name,
        n.category,
        array_remove(array_agg(a.name order by tc.depth desc), null) as path
      from place_taxonomy_tags ptt
      join taxonomy_nodes n on n.id = ptt.taxonomy_node_id
      left join taxonomy_closure tc on tc.descendant_id = n.id
      left join taxonomy_nodes a on a.id = tc.ancestor_id
      where ptt.place_id = ${params.placeId}::uuid
        and ptt.deleted_at is null
        and n.deleted_at is null
        and n.group_id = ${params.groupId}::uuid
      group by n.id, n.name, n.category
      order by n.name asc
    `) as { node_id: string; name: string; category: string; path: string[] | null }[];

    return {
      items: rows.map((row) => ({
        nodeId: row.node_id,
        name: row.name,
        category: row.category,
        path: row.path ?? [row.name]
      }))
    };
  });
};

export default taxonomyRoute;
