import mongoose, { type Connection } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { MemoryStore } from "express-rate-limit";
import { afterAll, beforeAll } from "vitest";
import { MongoRateLimitStore } from "../../src/middleware/mongoRateLimitStore.js";

/** Exercise identical limiter assertions against an isolated real MongoDB and memory. */
export function rateLimitStores() {
  let server: MongoMemoryServer;
  let connection: Connection;
  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    connection = await mongoose.createConnection(server.getUri()).asPromise();
  }, 60_000);
  afterAll(async () => {
    await connection?.close();
    await server?.stop();
  });
  return [
    { name: "memory", create: () => new MemoryStore() },
    {
      name: "mongo",
      create: (name: string) => new MongoRateLimitStore(name, connection),
    },
  ];
}
