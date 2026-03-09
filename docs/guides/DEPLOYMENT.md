# Deployment Guide

This guide covers deploying HyperLink to production environments.

## Overview

HyperLink consists of three main components:
1. **Frontend** (Next.js) - Deployed to Vercel
2. **Signaling Server** (Node.js) - Deployed to Railway
3. **Database** (PostgreSQL) - Hosted on Supabase

## Frontend Deployment (Vercel)

### Prerequisites

- Vercel account
- GitHub repository connected to Vercel

### Steps

1. **Connect Repository**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Build Settings**
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/web`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

3. **Set Environment Variables**

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   NEXT_PUBLIC_PEER_SERVER_HOST=your-signaling-server.railway.app
   NEXT_PUBLIC_PEER_SERVER_PORT=443
   NEXT_PUBLIC_PEER_SERVER_PATH=/myapp
   NEXT_PUBLIC_SENTRY_DSN=your_sentry_dsn
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically build and deploy
   - Future pushes to `main` branch will auto-deploy

### Custom Domain (Optional)

1. Go to Project Settings > Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Update `ALLOWED_ORIGIN` in signaling server

## Signaling Server Deployment (Railway)

### Prerequisites

- Railway account
- GitHub repository connected to Railway

### Steps

1. **Create New Project**
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Click "New Project"
   - Select "Deploy from GitHub repo"

2. **Configure Service**
   - **Root Directory**: `apps/signaling`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

3. **Set Environment Variables**

   ```env
   PORT=9000
   SUPABASE_JWT_SECRET=your_jwt_secret
   ALLOWED_ORIGIN=https://your-frontend.vercel.app
   ```

   **Note**: Get `SUPABASE_JWT_SECRET` from Supabase Dashboard > Settings > API > JWT Secret

4. **Configure Networking**
   - Railway will automatically assign a public URL
   - Note the URL (e.g., `your-app.railway.app`)
   - Use this URL in frontend's `NEXT_PUBLIC_PEER_SERVER_HOST`

5. **Deploy**
   - Railway will automatically build and deploy
   - Future pushes to `main` branch will auto-deploy

### Health Check

Verify deployment:
```bash
curl https://your-app.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "HyperLink Signaling Server",
  "uptime": 123.45,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Database Setup (Supabase)

### Prerequisites

- Supabase account
- Supabase project created

### Steps

1. **Create Project**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Click "New Project"
   - Choose organization and region
   - Set database password

2. **Apply Migrations**

   **Option A: Using Supabase CLI**
   ```bash
   # Link to project
   supabase link --project-ref your_project_ref
   
   # Apply migrations
   supabase db push
   ```

   **Option B: Manual via Dashboard**
   - Go to SQL Editor
   - Copy contents of `supabase/migrations/001_create_transfers_table.sql`
   - Run the SQL

3. **Configure Authentication**
   - Go to Authentication > Settings
   - Enable Email provider
   - Configure email templates (optional)
   - Set site URL to your frontend URL

4. **Get API Keys**
   - Go to Settings > API
   - Copy `URL` and `anon public` key
   - Use these in frontend environment variables

5. **Configure CORS (if needed)**
   - Go to Settings > API
   - Add your frontend URL to allowed origins

## TURN Server Configuration

For production WebRTC connections, configure TURN servers for NAT traversal.

### Using Twilio TURN

1. **Sign up for Twilio**
   - Go to [Twilio Console](https://www.twilio.com/console)
   - Create account and get credentials

2. **Create API Endpoint**

   ```typescript
   // apps/web/src/app/api/turn-credentials/route.ts
   import { NextResponse } from 'next/server';
   import twilio from 'twilio';
   
   export async function GET() {
     const accountSid = process.env.TWILIO_ACCOUNT_SID!;
     const authToken = process.env.TWILIO_AUTH_TOKEN!;
     
     const client = twilio(accountSid, authToken);
     const token = await client.tokens.create();
     
     return NextResponse.json({
       iceServers: token.iceServers
     });
   }
   ```

3. **Add Environment Variables**
   ```env
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   ```

### Alternative: Metered TURN

1. Sign up at [Metered.ca](https://www.metered.ca)
2. Get API key
3. Configure in frontend

## Monitoring Setup (Sentry)

### Prerequisites

- Sentry account
- Sentry project created

### Steps

1. **Create Projects**
   - Create separate projects for frontend and backend
   - Note the DSN for each

2. **Configure Frontend**
   ```env
   NEXT_PUBLIC_SENTRY_DSN=your_frontend_dsn
   ```

3. **Configure Signaling Server**
   ```env
   SENTRY_DSN=your_backend_dsn
   ```

4. **Verify Integration**
   - Trigger a test error
   - Check Sentry dashboard for event

## Environment Variables Summary

### Frontend (Vercel)

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | `eyJhbGc...` |
| `NEXT_PUBLIC_PEER_SERVER_HOST` | Signaling server host | `app.railway.app` |
| `NEXT_PUBLIC_PEER_SERVER_PORT` | Signaling server port | `443` |
| `NEXT_PUBLIC_PEER_SERVER_PATH` | Signaling server path | `/myapp` |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry DSN | `https://xxx@sentry.io/xxx` |
| `TWILIO_ACCOUNT_SID` | Twilio account SID | `ACxxx` |
| `TWILIO_AUTH_TOKEN` | Twilio auth token | `xxx` |

### Signaling Server (Railway)

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `9000` |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret | `xxx` |
| `ALLOWED_ORIGIN` | Frontend URL | `https://app.vercel.app` |
| `SENTRY_DSN` | Sentry DSN | `https://xxx@sentry.io/xxx` |

## Post-Deployment Checklist

- [ ] Frontend is accessible at production URL
- [ ] Signaling server health check passes
- [ ] Database migrations applied
- [ ] Authentication works (sign up, login, logout)
- [ ] File transfer works end-to-end
- [ ] TURN servers configured for NAT traversal
- [ ] Sentry receiving events
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificates valid
- [ ] Environment variables set correctly
- [ ] CORS configured properly

## Troubleshooting

### Frontend Issues

**Issue**: Build fails on Vercel

**Solutions**:
- Check build logs for errors
- Verify all environment variables are set
- Ensure `package.json` scripts are correct
- Check TypeScript errors

**Issue**: API routes return 500

**Solutions**:
- Check Vercel function logs
- Verify Supabase credentials
- Check environment variables

### Signaling Server Issues

**Issue**: Health check fails

**Solutions**:
- Check Railway logs
- Verify server is running
- Check port configuration
- Verify environment variables

**Issue**: WebRTC connections fail

**Solutions**:
- Verify CORS configuration
- Check JWT secret matches Supabase
- Ensure TURN servers are configured
- Check firewall rules

### Database Issues

**Issue**: Migrations fail

**Solutions**:
- Check SQL syntax
- Verify database permissions
- Check for existing tables
- Review Supabase logs

**Issue**: RLS policies blocking queries

**Solutions**:
- Verify user is authenticated
- Check RLS policy conditions
- Review Supabase logs
- Test queries in SQL Editor

## Rollback Procedure

### Frontend (Vercel)

1. Go to Deployments
2. Find previous working deployment
3. Click "..." > "Promote to Production"

### Signaling Server (Railway)

1. Go to Deployments
2. Find previous working deployment
3. Click "Redeploy"

### Database (Supabase)

1. Go to Database > Backups
2. Select backup to restore
3. Click "Restore"

## Scaling Considerations

### Frontend

- Vercel automatically scales
- Consider Edge Functions for API routes
- Use CDN for static assets

### Signaling Server

- Railway auto-scales on Pro plan
- Consider multiple instances for high traffic
- Use load balancer if needed

### Database

- Supabase auto-scales on Pro plan
- Consider read replicas for high read traffic
- Monitor connection pool usage

## Security Best Practices

1. **Use HTTPS everywhere**
2. **Rotate secrets regularly**
3. **Enable rate limiting**
4. **Monitor for suspicious activity**
5. **Keep dependencies updated**
6. **Use environment variables for secrets**
7. **Enable CORS only for trusted origins**
8. **Implement proper authentication**

## Monitoring

### Key Metrics to Monitor

- **Frontend**: Page load time, error rate, user sessions
- **Signaling Server**: Connection count, error rate, uptime
- **Database**: Query performance, connection count, storage usage

### Tools

- **Vercel Analytics**: Frontend performance
- **Railway Metrics**: Server performance
- **Supabase Dashboard**: Database metrics
- **Sentry**: Error tracking

---

**Last Updated**: 2024
