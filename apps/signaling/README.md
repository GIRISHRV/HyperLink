# HyperLink Signaling Server

WebRTC signaling server for HyperLink P2P file transfer application.

## Overview

This server facilitates peer discovery and connection establishment using PeerJS. It handles WebSocket connections for real-time signaling between peers, enabling direct browser-to-browser file transfers.

## Features

- **WebRTC Signaling**: PeerJS-based peer discovery and connection management
- **JWT Authentication**: Validates Supabase JWT tokens for secure access
- **Rate Limiting**: Protects against abuse (200 req/min general, 60 req/min health)
- **CORS Protection**: Configurable allowed origins
- **Health Monitoring**: Real-time server status and peer count
- **Graceful Shutdown**: Handles SIGTERM/SIGINT signals

## Quick Start

### Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Start development server with hot reload
npm run dev
```

Server runs on `http://localhost:9000`

### Production

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# Server Configuration
PORT=9000

# Authentication
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# CORS Configuration (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,https://hyperlink.vercel.app
```

### Getting Supabase JWT Secret

1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the "JWT Secret" value
4. Paste it as `SUPABASE_JWT_SECRET` in your `.env.local`

## API Documentation

### Interactive Documentation

View the full API documentation using Swagger UI:

1. **Online**: Visit [Swagger Editor](https://editor.swagger.io/)
2. **Import**: Copy the contents of `openapi.yaml`
3. **Explore**: Interactive API documentation with request/response examples

### Quick Reference

#### Public Endpoints

- `GET /` - Root endpoint (server status message)
- `GET /health` - Health check with uptime and peer count

#### Protected Endpoints (Require JWT)

All `/myapp/*` endpoints require authentication via:

- **Header**: `Authorization: Bearer <jwt-token>`
- **Query**: `?token=<jwt-token>`

**PeerJS Protocol Endpoints:**

- `POST /myapp/{peerId}/id` - Register a new peer
- `GET /myapp/{peerId}` - Get peer information
- `GET /myapp/{peerId}/connections` - List active connections

### Authentication

All protected endpoints require a valid Supabase JWT token:

```bash
# Using Authorization header
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:9000/myapp/peer-123

# Using query parameter
curl "http://localhost:9000/myapp/peer-123?token=YOUR_JWT_TOKEN"
```

### Rate Limits

- **General endpoints**: 200 requests per minute per IP
- **Health endpoint**: 60 requests per minute per IP

Rate limit headers are included in responses:

- `RateLimit-Limit`: Maximum requests allowed
- `RateLimit-Remaining`: Requests remaining in window
- `RateLimit-Reset`: Time when limit resets

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Browser A     │         │  Signaling       │         │   Browser B     │
│   (Sender)      │◄───────►│  Server          │◄───────►│   (Receiver)    │
└─────────────────┘         └──────────────────┘         └─────────────────┘
        │                            │                            │
        │    1. Register Peer A      │                            │
        ├───────────────────────────►│                            │
        │                            │    2. Register Peer B      │
        │                            │◄───────────────────────────┤
        │                            │                            │
        │    3. Connect to Peer B    │                            │
        ├───────────────────────────►│                            │
        │                            │    4. Relay SDP Offer      │
        │                            ├───────────────────────────►│
        │                            │                            │
        │    5. Relay SDP Answer     │◄───────────────────────────┤
        │◄───────────────────────────┤                            │
        │                            │                            │
        │    6. Exchange ICE Candidates (via server)              │
        │◄──────────────────────────────────────────────────────►│
        │                            │                            │
        │    7. Direct P2P Data Channel Established               │
        │◄═══════════════════════════════════════════════════════►│
        │         (Server no longer involved)                     │
```

## Deployment

### Railway (Recommended)

1. **Connect Repository**:
   - Go to [Railway](https://railway.app)
   - Create new project from GitHub repo
   - Select `apps/signaling` as root directory

2. **Configure Environment**:
   - Add environment variables in Railway dashboard
   - Set `PORT` (Railway provides this automatically)
   - Set `SUPABASE_JWT_SECRET`
   - Set `ALLOWED_ORIGINS`

3. **Deploy**:
   - Railway auto-deploys on push to `main` branch
   - Custom domain available in project settings

### Docker

```bash
# Build image
docker build -t hyperlink-signaling -f apps/signaling/Dockerfile .

# Run container
docker run -p 9000:9000 \
  -e SUPABASE_JWT_SECRET=your-secret \
  -e ALLOWED_ORIGINS=http://localhost:3000 \
  hyperlink-signaling
```

### Manual Deployment

```bash
# Build
npm run build

# Start with PM2 (process manager)
pm2 start dist/index.js --name hyperlink-signaling

# Or use systemd service
sudo systemctl start hyperlink-signaling
```

## Monitoring

### Health Check

```bash
curl http://localhost:9000/health
```

Response:

```json
{
  "status": "healthy",
  "service": "HyperLink Signaling Server",
  "uptime": 3600.5,
  "timestamp": "2024-03-09T10:30:00.000Z",
  "peers": 5
}
```

### Logs

The server logs all connections, disconnections, and errors:

```
🚀 HyperLink Signaling Server running on port 9000
   Health: http://localhost:9000/health
   Allowed Origins: http://localhost:3000, https://hyperlink.vercel.app
[CONNECT] Peer connected: user-123-abc | Total: 1
[DISCONNECT] Peer disconnected: user-123-abc | Total: 0
[AUTH] Rejected request from 192.168.1.1: Invalid token
```

## Troubleshooting

### CORS Errors

**Problem**: Browser shows CORS error when connecting

**Solution**: Add your frontend URL to `ALLOWED_ORIGINS`:

```env
ALLOWED_ORIGINS=http://localhost:3000,https://your-app.vercel.app
```

### Authentication Failures

**Problem**: All requests return 401 Unauthorized

**Solution**:

1. Verify `SUPABASE_JWT_SECRET` matches your Supabase project
2. Ensure JWT token is valid and not expired
3. Check token is passed correctly (header or query param)

### Connection Refused

**Problem**: Cannot connect to signaling server

**Solution**:

1. Verify server is running: `curl http://localhost:9000/health`
2. Check firewall rules allow port 9000
3. Verify `PORT` environment variable is set correctly

### Rate Limit Errors

**Problem**: Requests return 429 Too Many Requests

**Solution**:

1. Reduce request frequency
2. Implement exponential backoff in client
3. Adjust rate limits in `src/index.ts` if needed

## Development

### Project Structure

```
apps/signaling/
├── src/
│   └── index.ts          # Main server file
├── dist/                 # Compiled JavaScript (generated)
├── .env.example          # Example environment variables
├── .env.local            # Local environment (gitignored)
├── openapi.yaml          # API documentation (OpenAPI 3.0)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── Dockerfile            # Docker container definition
└── README.md             # This file
```

### Adding New Endpoints

1. Add route in `src/index.ts`:

```typescript
app.get("/my-endpoint", (req, res) => {
  res.json({ message: "Hello" });
});
```

2. Update `openapi.yaml` with endpoint documentation

3. Add tests (if applicable)

### Testing

```bash
# Health check
curl http://localhost:9000/health

# Test authentication (replace with real token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:9000/myapp/test-peer
```

## Security

- **JWT Validation**: All protected endpoints verify Supabase JWT tokens
- **Rate Limiting**: Prevents abuse and DoS attacks
- **CORS**: Restricts access to allowed origins only
- **No Peer Discovery**: `allow_discovery` disabled to prevent peer enumeration
- **HTTPS**: Use HTTPS in production (handled by Railway/reverse proxy)

## Performance

- **Stateless**: Server doesn't store peer data, only facilitates connections
- **Lightweight**: Minimal memory footprint (~50MB)
- **Scalable**: Can handle 1000+ concurrent connections per instance
- **Fast**: WebSocket connections for real-time signaling

## License

MIT License - see [LICENSE](../../LICENSE) file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/GIRISHRV/HyperLink/issues)
- **Discussions**: [GitHub Discussions](https://github.com/GIRISHRV/HyperLink/discussions)
- **Documentation**: [Main Docs](../../docs/README.md)
