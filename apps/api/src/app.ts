import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import sensible from "@fastify/sensible";
import Fastify, { type FastifyInstance } from "fastify";
import { ZodError } from "zod";

import { config } from "./config.js";
import { sql as defaultSql, type SqlClient } from "./db.js";
import facetsRoute from "./routes/facets.js";
import filtersRoute from "./routes/filters.js";
import healthRoute from "./routes/health.js";
import placesRoute from "./routes/places.js";
import taxonomyRoute from "./routes/taxonomy.js";

type AppOptions = {
  sql?: SqlClient;
  logger?: boolean;
};

export const createApp = async (options?: AppOptions): Promise<FastifyInstance> => {
  const app = Fastify({ logger: options?.logger ?? true });

  app.decorate("sql", options?.sql ?? defaultSql);

  await app.register(cors, { origin: config.CORS_ORIGIN === "*" ? true : config.CORS_ORIGIN });
  await app.register(helmet);
  await app.register(sensible);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.code(400).send({
        code: "VALIDATION_ERROR",
        message: "Invalid request payload",
        details: error.flatten().fieldErrors
      });
    }

    app.log.error(error);
    return reply.code(500).send({
      code: "INTERNAL_ERROR",
      message: "Unexpected server error"
    });
  });

  await app.register(healthRoute);
  await app.register(placesRoute);
  await app.register(taxonomyRoute);
  await app.register(filtersRoute);
  await app.register(facetsRoute);

  return app;
};
