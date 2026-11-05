import { neon } from "@neondatabase/serverless";

import { config } from "./config.js";

export type SqlClient = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<unknown[]>;

export const sql = neon(config.DATABASE_URL) as unknown as SqlClient;
