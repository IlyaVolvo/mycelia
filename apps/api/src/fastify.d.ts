import "fastify";

import type { SqlClient } from "./db.js";

declare module "fastify" {
  interface FastifyInstance {
    sql: SqlClient;
  }
}
