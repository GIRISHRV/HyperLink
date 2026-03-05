# HyperLink Signaling Server

WebRTC signaling server for HyperLink P2P file transfers using PeerServer.

## 🚀 Quick Start

### Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The server will run on:

- WebSocket: `ws://localhost:9000/myapp`
- Health Check: `http://localhost:9000/health`

### Production Build

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## 🐳 Docker Deployment

### Build Image

```bash
docker build -t hyperlink-signaling .
```

### Run Container

```bash
docker run -p 9000:9000 -p 9001:9001 \
  -e PORT=9000 \
  -e ALLOWED_ORIGINS="https://your-frontend.vercel.app" \
  hyperlink-signaling
```

## ☁️ Render Deployment (Free)

1. **New Web Service**
   - Connect GitHub repo
   - Root Directory: `apps/signaling`

2. **Settings**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

3. **Environment Variables**
   - `PORT`: `10000`
   - `ALLOWED_ORIGINS`: `https://your-frontend.vercel.app`

*Note: Free tier spins down after inactivity.*

## 🔒 CORS Configuration

Update `ALLOWED_ORIGINS` to include your deployed frontend URLs:


```env
ALLOWED_ORIGINS=https://hyperlink.vercel.app,https://hyperlink-staging.vercel.app
```

## 📊 Health Monitoring

Check server health:

```bash
curl http://localhost:9001/health
```

Response:

```json
{
  "status": "healthy",
  "service": "HyperLink Signaling Server",
  "uptime": 123.45,
  "timestamp": "2026-02-06T11:30:00.000Z"
}
```

## 🛠️ Environment Variables

| Variable          | Description                  | Default                 |
| ----------------- | ---------------------------- | ----------------------- |
| `PORT`            | WebSocket port               | `9000`                  |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | `http://localhost:3000` |

## 📝 Architecture

This signaling server:

- Handles WebRTC peer discovery via PeerServer
- Facilitates SDP/ICE candidate exchange
- Does NOT handle file data (that's P2P!)
- Stateful WebSocket connections (requires persistent hosting)

**Deployment Note**

- Persistent WebSocket connections are required.
- Docker support is recommended.
- PeerServer requires a persistent process.

