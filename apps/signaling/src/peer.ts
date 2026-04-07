/**
 * PeerServer setup — peer connection lifecycle, event handlers, peer counter.
 * Kept separate from app.ts so the HTTP layer and P2P layer are independently testable.
 */
import { ExpressPeerServer } from "peer";
import type { Application } from "express";
import type { Server } from "http";
import { logger } from "./logger.js";

export function createPeerServer(
  server: Server,
  app: Application,
  onPeerCountChange?: (count: number) => void
) {
  const peerServer = ExpressPeerServer(server, {
    path: "/myapp",
    allow_discovery: true,
  });

  let connectedPeers = 0;

  peerServer.on("connection", (client) => {
    connectedPeers++;
    logger.info({ peerId: client.getId(), total: connectedPeers }, "[PEER] Connected");
    // AUDIT FIX: Event-driven peer count update instead of polling
    onPeerCountChange?.(connectedPeers);
  });

  peerServer.on("disconnect", (client) => {
    connectedPeers = Math.max(0, connectedPeers - 1);
    logger.info({ peerId: client.getId(), total: connectedPeers }, "[PEER] Disconnected");
    // AUDIT FIX: Event-driven peer count update instead of polling
    onPeerCountChange?.(connectedPeers);
  });

  peerServer.on("error", (error) => {
    logger.error({ err: error }, "[PEER] PeerServer error");
  });

  // Mount PeerServer onto the Express app
  app.use("/", peerServer);

  // Expose a getter so the health endpoint can read the live count
  return {
    peerServer,
    getPeerCount: () => connectedPeers,
  };
}
