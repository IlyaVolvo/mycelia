import dotenv from "dotenv";
import { z } from "zod";
dotenv.config();
const envSchema = z.object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.coerce.number().int().positive().default(8080),
    DATABASE_URL: z.string().url().default("postgres://user:pass@localhost:5432/mycelia"),
    CORS_ORIGIN: z.string().default("*")
});
const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
    console.error("Invalid environment configuration", parsed.error.flatten().fieldErrors);
    process.exit(1);
}
export const config = parsed.data;
