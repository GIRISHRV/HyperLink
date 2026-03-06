import { ExpressPeerServer } from "peer";
import express from "express";
import cors from "cors";
import http from "http";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const PORT = parseInt(process.env.PORT || "9000");
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",").map(s => s.trim()) || [
  "http://localhost:3000",
  "https://hyperlink.vercel.app",
];

const app = express();

// Rate limiting — FINDING-016 fix
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,            // max 200 requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});

const healthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,             // health checks once per second at most
  standardHeaders: true,
  legacyHeaders: false,
});

// Create HTTP server
const server = http.createServer(app);

// CORS configuration
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);

      // Check against allowed origins
      if (ALLOWED_ORIGINS.some((allowed) => origin === allowed || origin.startsWith(allowed))) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Apply general rate limit to all routes
app.use(generalLimiter);

app.get("/health", healthLimiter, (_req, res) => {
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

import jwt from "jsonwebtoken";

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || "";

// Initialize PeerServer middleware
const peerServer = ExpressPeerServer(server, {
  path: "/myapp",
  allow_discovery: true,
});

// Auth Middleware for Task 3
app.use((req, res, next) => {
  // Allow discovery and other requests only if authenticated
  // PeerJS initial requests: /myapp/id, /myapp/peerid/offer, etc.

  // Public routes
  if (req.path === "/health" || req.path === "/") {
    return next();
  }

  // Skip auth if no secret is provided (for local dev if not configured)
  if (!SUPABASE_JWT_SECRET) {
    console.warn("[AUTH] SUPABASE_JWT_SECRET not found, skipping verification (INSECURE)");
    return next();
  }

  const token = (req.headers["authorization"]?.toString().split(" ")[1]) || (req.query.token as string);

  if (!token) {
    console.log(`[AUTH] Rejected request from ${req.ip}: No token provided`);
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = jwt.verify(token, SUPABASE_JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch (err) {
    console.log(`[AUTH] Rejected request from ${req.ip}: Invalid token`);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
});

// Mount PeerServer
app.use("/", peerServer);

// Track connected peer count with a simple counter
let connectedPeers = 0;

// PeerServer event handlers
peerServer.on("connection", (client) => {
  connectedPeers++;
  // eslint-disable-next-line no-console
  console.log(`[CONNECT] Peer connected: ${client.getId()} | Total: ${connectedPeers}`);
});

peerServer.on("disconnect", (client) => {
  connectedPeers = Math.max(0, connectedPeers - 1);
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
