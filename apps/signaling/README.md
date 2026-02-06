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
- Health Check: `http://localhost:9001/health`

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

## 🚂 Railway Deployment

1. **Create New Project** in Railway dashboard

2. **Connect Repository**
   - Link your GitHub repository
   - Select `apps/signaling` as the root directory

3. **Set Environment Variables**

   ```
   PORT=9000
   ALLOWED_ORIGINS=https://your-frontend.vercel.app,https://hyperlink-staging.vercel.app
   ```

4. **Deploy**
   - Railway will automatically detect the `Dockerfile`
   - Build and deploy will start automatically

5. **Get WebSocket URL**
   - Railway will provide a public URL like: `hyperlink-signaling.railway.app`
   - Your WebSocket endpoint: `wss://hyperlink-signaling.railway.app/myapp`

6. **Update Frontend Environment Variables**
   - In `apps/web/.env.local`:
   ```env
   NEXT_PUBLIC_PEER_SERVER_HOST=hyperlink-signaling.railway.app
   NEXT_PUBLIC_PEER_SERVER_PORT=443
   NEXT_PUBLIC_PEER_SERVER_PATH=/myapp
   ```

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

**Why Railway?**

- Persistent WebSocket connections
- Docker support
- Auto-deploy from GitHub
- Free tier available

**Why NOT Vercel/Netlify?**

- They are serverless/stateless
- WebSocket connections would be terminated
- PeerServer requires persistent process
