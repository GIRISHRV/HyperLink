/**
 * Entry point — wires together app.ts + peer.ts + HTTP server and starts listening.
 * All business logic lives in: app.ts (Express), peer.ts (PeerJS), logger.ts (pino).
 */
import http from "http";
import dotenv from "dotenv";
import { createApp, ALLOWED_ORIGINS } from "./app.js";
import { createPeerServer } from "./peer.js";
import { logger } from "./logger.js";

dotenv.config();

const PORT = parseInt(process.env.PORT || "9000");

// Shared counter box — lets app.ts read the live peer count via closure
// without a circular import between app.ts ↔ peer.ts.
const peerCountBox = { value: 0 };

const app = createApp(() => peerCountBox.value);
const server = http.createServer(app);

// AUDIT FIX: Event-driven peer count updates instead of polling
// Boot PeerServer with callback that updates the box on connect/disconnect
createPeerServer(server, app, (count) => {
  peerCountBox.value = count;
});

// Graceful shutdown
const shutdown = () => {
  logger.info("Signal received: closing server");
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// Only bind port when run directly — not when imported by tests
const isMain = process.argv[1]?.endsWith("index.ts") || process.argv[1]?.endsWith("index.js");
if (isMain) {
  server.listen(PORT, () => {
    logger.info(`🚀 HyperLink Signaling Server running on port ${PORT}`);
    logger.info(`   Health: http://localhost:${PORT}/health`);
    logger.info(`   Allowed Origins: ${ALLOWED_ORIGINS.join(", ")}`);
  });
}

export { app, server, ALLOWED_ORIGINS };
