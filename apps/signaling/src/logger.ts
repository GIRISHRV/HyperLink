import pino from "pino";

/**
 * Server-side structured logger for the signaling server.
 * Uses pino with pretty-printing in dev, JSON in production.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
});
