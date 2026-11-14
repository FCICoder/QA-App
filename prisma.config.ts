import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Read from .env. `prisma generate` doesn't need a connection, so an empty value is fine there.
    url: process.env.DATABASE_URL ?? "",
  },
});
