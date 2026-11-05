import assert from "node:assert/strict";
import test from "node:test";

import type { SqlClient } from "../src/db.js";
import { createApp } from "../src/app.js";

const makeMockSql = (): SqlClient => {
  const fn: SqlClient = async (strings, ...values) => {
    const text = strings.join("$");

    if (text.includes("from users u") && text.includes("join group_memberships")) {
      const clerkUserId = values[1]?.toString();
      if (clerkUserId === "clerk-owner") {
        return [
          {
            user_id: "99999999-9999-4999-8999-999999999999",
            role: "owner"
          }
        ];
      }

      if (clerkUserId === "clerk-viewer") {
        return [
          {
            user_id: "88888888-8888-4888-8888-888888888888",
            role: "viewer"
          }
        ];
      }

      return [];
    }

    if (text.includes("from system_facet_definitions") && text.includes("where is_active = true")) {
      return [
        {
          key: "observed_date",
          value_type: "date",
          unit: null,
          enum_values: null,
          is_user_editable: false,
          is_active: true
        },
        {
          key: "temperature_c",
          value_type: "number",
          unit: "celsius",
          enum_values: null,
          is_user_editable: false,
          is_active: true
        }
      ];
    }

    if (text.includes("select count(*)::int as count")) {
      return [{ count: 0 }];
    }

    if (text.includes("select ip.place_id::text as id")) {
      return [];
    }

    if (text.includes("select id::text, parent_id::text") && text.includes("from taxonomy_nodes")) {
      return [{ id: "22222222-2222-4222-8222-222222222222", parent_id: null }];
    }

    if (text.includes("insert into taxonomy_nodes") && text.includes("returning id::text")) {
      return [{ id: "11111111-1111-4111-8111-111111111111" }];
    }

    if (text.includes("update taxonomy_nodes") && text.includes("returning id::text")) {
      return [{ id: "33333333-3333-4333-8333-333333333333" }];
    }

    if (text.includes("select descendant_id::text as id") && text.includes("from taxonomy_closure")) {
      return [{ id: "33333333-3333-4333-8333-333333333333" }];
    }

    void values;
    return [];
  };

  return fn;
};

test("POST /v1/groups/:groupId/filters/preview applies parent-child dedup semantics", async () => {
  const app = await createApp({ sql: makeMockSql(), logger: false });

  const res = await app.inject({
    method: "POST",
    url: "/v1/groups/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/filters/preview",
    payload: {
      includeNodeIds: [
        "11111111-1111-4111-8111-111111111111",
        "22222222-2222-4222-8222-222222222222"
      ],
      excludeNodeIds: [],
      closureEdges: [
        {
          ancestorId: "11111111-1111-4111-8111-111111111111",
          descendantId: "22222222-2222-4222-8222-222222222222"
        }
      ]
    }
  });

  assert.equal(res.statusCode, 200);
  const body = res.json() as {
    normalized: { includeNodeIds: string[] };
    effective: { includeNodeIds: string[] };
  };

  assert.deepEqual(body.normalized.includeNodeIds, ["11111111-1111-4111-8111-111111111111"]);
  assert.deepEqual(
    new Set(body.effective.includeNodeIds),
    new Set(["11111111-1111-4111-8111-111111111111", "22222222-2222-4222-8222-222222222222"])
  );

  await app.close();
});

test("POST /v1/groups/:groupId/taxonomy/nodes rejects viewer membership", async () => {
  const app = await createApp({ sql: makeMockSql(), logger: false });

  const res = await app.inject({
    method: "POST",
    url: "/v1/groups/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/taxonomy/nodes",
    headers: {
      "x-clerk-user-id": "clerk-viewer"
    },
    payload: {
      name: "chanterelle",
      category: "species"
    }
  });

  assert.equal(res.statusCode, 403);
  const body = res.json() as { code: string };
  assert.equal(body.code, "FORBIDDEN");

  await app.close();
});

test("POST /v1/groups/:groupId/taxonomy/nodes creates node for owner membership", async () => {
  const app = await createApp({ sql: makeMockSql(), logger: false });

  const res = await app.inject({
    method: "POST",
    url: "/v1/groups/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/taxonomy/nodes",
    headers: {
      "x-clerk-user-id": "clerk-owner"
    },
    payload: {
      name: "chanterelle",
      category: "species",
      parentId: "22222222-2222-4222-8222-222222222222"
    }
  });

  assert.equal(res.statusCode, 201);
  const body = res.json() as { id: string };
  assert.equal(body.id, "11111111-1111-4111-8111-111111111111");

  await app.close();
});

test("PATCH /v1/groups/:groupId/taxonomy/nodes/:nodeId updates node for owner membership", async () => {
  const app = await createApp({ sql: makeMockSql(), logger: false });

  const res = await app.inject({
    method: "PATCH",
    url: "/v1/groups/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/taxonomy/nodes/33333333-3333-4333-8333-333333333333",
    headers: {
      "x-clerk-user-id": "clerk-owner"
    },
    payload: {
      name: "updated"
    }
  });

  assert.equal(res.statusCode, 200);
  const body = res.json() as { id: string };
  assert.equal(body.id, "33333333-3333-4333-8333-333333333333");

  await app.close();
});

test("DELETE /v1/groups/:groupId/taxonomy/nodes/:nodeId deletes node for owner membership", async () => {
  const app = await createApp({ sql: makeMockSql(), logger: false });

  const res = await app.inject({
    method: "DELETE",
    url: "/v1/groups/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/taxonomy/nodes/33333333-3333-4333-8333-333333333333",
    headers: {
      "x-clerk-user-id": "clerk-owner"
    }
  });

  assert.equal(res.statusCode, 204);

  await app.close();
});

test("GET /v1/system/facets/definitions returns active definitions", async () => {
  const app = await createApp({ sql: makeMockSql(), logger: false });

  const res = await app.inject({
    method: "GET",
    url: "/v1/system/facets/definitions"
  });

  assert.equal(res.statusCode, 200);
  const body = res.json() as { items: Array<{ key: string }> };
  assert.deepEqual(body.items.map((item) => item.key), ["observed_date", "temperature_c"]);

  await app.close();
});
