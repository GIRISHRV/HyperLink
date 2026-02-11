import { ExpressPeerServer } from "peer";
import express from "express";
import cors from "cors";
import http from "http";

const PORT = parseInt(process.env.PORT || "9000");
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || [
  "http://localhost:3000",
  "https://hyperlink.vercel.app",
  "*",
];

const app = express();

// Create HTTP server
const server = http.createServer(app);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      // Check against allowed origins
      if (ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed) || allowed === "*")) {
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

// Root endpoint handling
app.get("/", (_req, res) => {
  res.send("HyperLink Signaling Server is running 🚀");
});

// Initialize PeerServer middleware
const peerServer = ExpressPeerServer(server, {
  path: "/myapp", // This becomes /peerjs/myapp when mounted on /peerjs, or relative to mount point
  allow_discovery: true,
});

// Mount PeerServer
// Note: Client connects to host/myapp
// We mount at root so path matches
app.use("/", peerServer);

// Track connected peers
let connectedPeers = 0;

// PeerServer event handlers
peerServer.on("connection", (client) => {
  connectedPeers++;
  // eslint-disable-next-line no-console
  console.log(`[CONNECT] Peer connected: ${client.getId()} | Total: ${connectedPeers}`);
});

peerServer.on("disconnect", (client) => {
  if (connectedPeers > 0) connectedPeers--;
  // eslint-disable-next-line no-console
  console.log(`[DISCONNECT] Peer disconnected: ${client.getId()} | Total: ${connectedPeers}`);
});

peerServer.on("error", (error) => {
  // eslint-disable-next-line no-console
  console.error(`[ERROR] PeerServer error:`, error);
});

// Start server
server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 HyperLink Signaling Server running on port ${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`   Health: http://localhost:${PORT}/health`);
  // eslint-disable-next-line no-console
  console.log(`   Allowed Origins: ${ALLOWED_ORIGINS.join(", ")}`);
});

// Graceful shutdown
const shutdown = () => {
  // eslint-disable-next-line no-console
  console.log("Signal received: closing server");
  server.close(() => {
    // eslint-disable-next-line no-console
    console.log("Server closed");
    process.exit(0);
  });
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
