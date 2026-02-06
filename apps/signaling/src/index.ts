import { PeerServer } from "peer";
import express from "express";
import cors from "cors";

const PORT = parseInt(process.env.PORT || "9000");
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:3000",
  "https://hyperlink.vercel.app",
];

const app = express();

// CORS configuration for frontend
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      if (ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    service: "HyperLink Signaling Server",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    peers: connectedPeers,
  });
});

// Initialize PeerServer
const peerServer = PeerServer({
  port: PORT,
  path: "/myapp",
  allow_discovery: true,
});

// Track connected peers
let connectedPeers = 0;

// PeerServer event handlers
peerServer.on("connection", (client) => {
  connectedPeers++;
  console.log(`[CONNECT] Peer connected: ${client.getId()} | Total: ${connectedPeers}`);
});

peerServer.on("disconnect", (client) => {
  if (connectedPeers > 0) connectedPeers--;
  console.log(`[DISCONNECT] Peer disconnected: ${client.getId()} | Total: ${connectedPeers}`);
});

peerServer.on("error", (error) => {
  console.error(`[ERROR] PeerServer error:`, error);
});

// Express server for health checks
const server = app.listen(PORT + 1, () => {
  console.log(`🚀 HyperLink Signaling Server`);
  console.log(`   WebSocket: ws://localhost:${PORT}/myapp`);
  console.log(`   Health: http://localhost:${PORT + 1}/health`);
  console.log(`   Allowed Origins: ${ALLOWED_ORIGINS.join(", ")}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing servers");
  server.close(() => {
    console.log("Express server closed");
  });
  // PeerServer doesn't have a close method, it will be killed by the process
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("SIGINT signal received: closing servers");
  server.close(() => {
    console.log("Express server closed");
  });
  process.exit(0);
});
