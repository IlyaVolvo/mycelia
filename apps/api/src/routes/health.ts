import type { FastifyPluginAsync } from "fastify";

const healthRoute: FastifyPluginAsync = async (app) => {
  app.get("/health", async () => {
    const db = (await app.sql`select now()::text as now`) as { now: string }[];
    return {
      ok: true,
      dbTime: db[0]?.now ?? null
    };
  });
};

export default healthRoute;
