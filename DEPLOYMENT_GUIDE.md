# EchosOfMe Production Deployment Guide

This guide walks you through deploying the EchosOfMe application from local Docker to a scalable cloud production environment with RTX 5090 hybrid architecture.

## Architecture Overview

### Production Stack
- **Frontend/Backend**: Next.js 14 deployed on Railway
- **Database**: Neon PostgreSQL (cloud-managed)
- **Cache**: Upstash Redis (cloud-managed)
- **RTX Integration**: Local RTX 5090 via Cloudflare Tunnel
- **CDN/Security**: Cloudflare (tunnel + CDN)

### Hybrid Architecture Benefits
- **Scalable Web Tier**: Railway handles traffic scaling automatically
- **High-Performance AI**: Local RTX 5090 for intensive AI training
- **Managed Data Layer**: Neon and Upstash for reliability
- **Secure Connectivity**: Cloudflare Tunnel for RTX access

---

## Prerequisites

### Required Accounts
1. **Railway** - Web application hosting
2. **Neon** - PostgreSQL database
3. **Upstash** - Redis cache
4. **Cloudflare** - CDN and tunnel services
5. **GitHub** - Source code and CI/CD

### Local Requirements
- Node.js 20+
- Docker (for development)
- Git
- Cloudflared CLI (for RTX tunnel)

---

## Step 1: Set Up Cloud Services

### 1.1 Neon PostgreSQL Setup

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project: `echosofme-production`
3. Copy the connection string:
   ```
   postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
4. Note: Neon automatically handles connection pooling and SSL

### 1.2 Upstash Redis Setup

1. Sign up at [upstash.com](https://upstash.com)
2. Create a new Redis database: `echosofme-cache`
3. Copy the Redis URL:
   ```
   rediss://default:password@region.upstash.io:port
   ```
4. Note: Upstash provides automatic scaling and persistence

### 1.3 Railway Setup

1. Sign up at [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Install Railway CLI:
   ```bash
   npm install -g @railway/cli
   railway login
   ```

### 1.4 Cloudflare Setup

1. Sign up at [cloudflare.com](https://cloudflare.com)
2. Add your domain to Cloudflare
3. Get API token for tunnel creation
4. Install cloudflared CLI (see RTX setup section)

---

## Step 2: Configure Environment Variables

### 2.1 Update Production Environment

1. Copy the production environment template:
   ```bash
   cp .env.production .env.production.local
   ```

2. Update with your actual values:
   ```env
   # NextAuth Configuration
   NEXTAUTH_SECRET=your-generated-secret-here
   NEXTAUTH_URL=https://your-production-domain.com

   # Neon Database
   DATABASE_URL=postgresql://username:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require

   # Upstash Redis
   REDIS_URL=rediss://default:password@region.upstash.io:port

   # RTX 5090 Hybrid (after tunnel setup)
   RTX_GPU_ENDPOINT=https://rtx-training.your-domain.com
   RTX_INFERENCE_ENDPOINT=https://rtx-inference.your-domain.com
   RTX_VOICE_ENDPOINT=https://rtx-voice.your-domain.com
   ```

### 2.2 Railway Environment Variables

Railway will automatically read from your environment file during deployment, but you can also set them manually:

```bash
railway variables set DATABASE_URL="your-neon-url"
railway variables set REDIS_URL="your-upstash-url"
railway variables set NEXTAUTH_SECRET="your-secret"
```

---

## Step 3: Database Migration

### 3.1 Run Production Migration

1. Set your database URL:
   ```bash
   export DATABASE_URL="your-neon-connection-string"
   ```

2. Run the production migration:
   ```bash
   node scripts/migrate-production.js
   ```

3. Verify migration success:
   ```bash
   # Check tables were created
   psql $DATABASE_URL -c "\dt"
   ```

### 3.2 Seed Initial Data (Optional)

```bash
# Run question seeding if needed
node scripts/seed-questions.js
```

---

## Step 4: RTX 5090 Hybrid Setup

### 4.1 Install Cloudflared

On your RTX 5090 machine:

```bash
# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# macOS
brew install cloudflare/cloudflare/cloudflared

# Windows
# Download from: https://github.com/cloudflare/cloudflared/releases
```

### 4.2 Setup Cloudflare Tunnel

1. Set your domain and token:
   ```bash
   export CLOUDFLARE_DOMAIN="your-domain.com"
   export CLOUDFLARE_TOKEN="your-api-token"
   ```

2. Run the setup script:
   ```bash
   chmod +x scripts/setup-cloudflare-tunnel.sh
   ./scripts/setup-cloudflare-tunnel.sh
   ```

3. This will:
   - Create tunnel: `echosofme-rtx-tunnel`
   - Set up DNS records for RTX services
   - Configure automatic startup
   - Create startup script: `~/start-rtx-tunnel.sh`

### 4.3 Start RTX Services

Ensure your RTX services are running on:
- **Port 8000**: Training service
- **Port 8001**: Inference service  
- **Port 8002**: Voice processing service
- **Port 9000**: Monitoring dashboard

### 4.4 Start Tunnel

```bash
# Manual start
~/start-rtx-tunnel.sh

# Or as a service
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

---

## Step 5: Deploy to Railway

### 5.1 Automated Deployment

Using the deployment script:

```bash
chmod +x scripts/deploy-to-railway.sh
./scripts/deploy-to-railway.sh
```

Select:
1. **Production** for live deployment
2. **Staging** for testing

### 5.2 Manual Deployment

```bash
# Login to Railway
railway login

# Deploy
railway deploy --environment production
```

### 5.3 Set Up Custom Domain

1. In Railway dashboard, go to your service
2. Add custom domain: `your-domain.com`
3. Update DNS records as instructed
4. Update `NEXTAUTH_URL` to your custom domain

---

## Step 6: CI/CD Setup (Optional)

### 6.1 GitHub Secrets

Add these secrets to your GitHub repository:

```
RAILWAY_TOKEN=your-railway-token
PROD_DATABASE_URL=your-neon-url
STAGING_URL=https://your-staging-domain.com
PRODUCTION_URL=https://your-production-domain.com
```

### 6.2 Automated Deployments

The GitHub Actions workflow will:
- **On `develop` push**: Deploy to staging
- **On `main` push**: Deploy to production
- **Manual trigger**: Deploy to chosen environment

---

## Step 7: Post-Deployment Verification

### 7.1 Health Checks

```bash
# Basic health check
curl https://your-domain.com/api/health

# Database connectivity
curl https://your-domain.com/api/admin/database/health

# RTX hybrid status
curl https://your-domain.com/api/training/system-status
```

### 7.2 Admin Access

1. Access admin dashboard: `https://your-domain.com/admin`
2. Use the default admin account or create one
3. Verify all systems are operational

### 7.3 RTX Integration Test

1. Go to training page: `https://your-domain.com/training`
2. Start a test training job
3. Verify RTX services are accessible
4. Check fallback works if RTX is offline

---

## Step 8: Monitoring and Maintenance

### 8.1 Railway Monitoring

- Monitor via Railway dashboard
- Set up log alerts for errors
- Monitor resource usage

### 8.2 Database Monitoring

- Neon provides built-in monitoring
- Monitor connection pool usage
- Set up query performance alerts

### 8.3 RTX Monitoring

- Monitor tunnel health: `cloudflared tunnel info echosofme-rtx-tunnel`
- Check RTX service status: `https://rtx-monitor.your-domain.com`
- Monitor GPU utilization locally

### 8.4 Uptime Monitoring

Consider setting up external monitoring:
- UptimeRobot
- Pingdom
- Custom health checks

---

## Troubleshooting

### Common Issues

1. **Database Connection Timeouts**
   - Check Neon connection limits
   - Verify SSL settings
   - Check connection pool configuration

2. **RTX Tunnel Issues**
   - Verify cloudflared is running
   - Check DNS records
   - Test local RTX services

3. **Railway Deployment Failures**
   - Check build logs: `railway logs`
   - Verify environment variables
   - Check disk space and memory limits

4. **Performance Issues**
   - Monitor Redis cache hit rates
   - Check database query performance
   - Verify RTX service response times

### Debug Commands

```bash
# Railway logs
railway logs --tail

# Database connection test
psql $DATABASE_URL -c "SELECT 1"

# Redis connection test
redis-cli -u $REDIS_URL ping

# Tunnel status
cloudflared tunnel info echosofme-rtx-tunnel
```

---

## Scaling Considerations

### Traffic Scaling
- Railway auto-scales based on demand
- Monitor response times and add replicas if needed
- Consider implementing proper caching strategies

### Database Scaling
- Neon handles connection pooling automatically
- Monitor query performance and add indexes
- Consider read replicas for heavy read workloads

### RTX Scaling
- Multiple RTX machines can share the same tunnel
- Implement load balancing for RTX services
- Consider queueing for long-running training jobs

---

## Security Checklist

- [ ] Environment variables are properly secured
- [ ] Database uses SSL connections
- [ ] Redis uses TLS encryption
- [ ] Cloudflare SSL/TLS is enabled
- [ ] Admin routes are properly protected
- [ ] Rate limiting is configured
- [ ] Security headers are set
- [ ] CORS is properly configured

---

## Rollback Procedures

### Railway Rollback
```bash
railway rollback --environment production
```

### Database Rollback
- Keep database backups before major migrations
- Test migrations on staging first
- Use transactions for critical operations

### RTX Rollback
- Keep previous tunnel configuration
- Maintain service version history
- Test changes on development tunnel first

---

## Cost Optimization

### Railway
- Monitor usage and scale appropriately
- Use staging environment for testing
- Implement efficient caching

### Neon
- Monitor connection usage
- Optimize queries to reduce compute time
- Use appropriate instance sizing

### Upstash
- Monitor Redis memory usage
- Implement TTL for cached data
- Use compression for large cached objects

### Cloudflare
- Utilize free tier effectively
- Monitor bandwidth usage
- Optimize caching rules

---

This deployment guide provides a comprehensive path from local development to production-ready cloud deployment while maintaining the powerful RTX 5090 hybrid architecture for AI workloads.