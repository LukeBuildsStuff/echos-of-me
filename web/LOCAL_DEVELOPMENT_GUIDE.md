# Echoes of Me - Local Development Guide
*Complete setup and workflow guide for budget-friendly local development*

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+
- Git
- 8GB+ RAM (16GB recommended for AI training)
- NVIDIA RTX 5090 (for local AI training)

### One-Command Setup
```bash
# Complete development environment setup
./scripts/dev-setup.sh
```

This will:
- ✅ Create Docker containers (PostgreSQL, Redis, App)
- ✅ Set up environment configuration
- ✅ Create necessary directories
- ✅ Install dependencies
- ✅ Initialize database
- ✅ Start all services

---

## Development Workflow

### Daily Development Commands

```bash
# Start development environment
./dev.sh start

# View application logs
./dev.sh logs

# Access database shell
./dev.sh db

# Access Redis CLI
./dev.sh redis

# Run database migrations
./dev.sh migrate

# Stop environment
./dev.sh stop
```

### Development URLs
- **Application**: http://localhost:3000
- **Database**: localhost:5432 (echosofme_dev)
- **Redis**: localhost:6379
- **Grafana** (monitoring): http://localhost:3001 (admin/admin)
- **Prometheus** (metrics): http://localhost:9090

---

## Architecture Overview

### Local Development Stack
```
┌─────────────────────────────────────────────────────────────┐
│                    Development Environment                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Next.js   │  │ PostgreSQL  │  │    Redis    │         │
│  │     App     │  │  Database   │  │    Cache    │         │
│  │  Port 3000  │  │  Port 5432  │  │  Port 6379  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Grafana   │  │ Prometheus  │  │    Nginx    │         │
│  │ Port 3001   │  │  Port 9090  │  │  Port 80    │         │
│  │ (optional)  │  │ (optional)  │  │ (optional)  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────────────────────────────────────────────────┤
│  │              RTX 5090 AI Training                       │
│  │         (Local GPU, no cloud costs)                    │
│  └─────────────────────────────────────────────────────────┘
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Key Features
- **Hot Reload**: Code changes reflect immediately
- **Database Persistence**: Data survives container restarts
- **GPU Integration**: RTX 5090 for local AI training
- **Monitoring Ready**: Optional Prometheus/Grafana stack
- **Cloud-Ready Config**: Environment variables prepared for cloud migration

---

## Environment Configuration

### Development Environment (`.env.local`)
```env
# Core Configuration
NODE_ENV=development
DATABASE_URL=postgresql://echosofme:dev_password@localhost:5432/echosofme_dev
REDIS_URL=redis://localhost:6379
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-development-secret-key

# AI Training
RTX_TRAINING_ENABLED=true
RTX_GPU_DEVICE=0
RTX_GPU_MEMORY_LIMIT=24gb
VOICE_STORAGE_PATH=./public/voices

# Feature Flags
FEATURE_VOICE_CLONING=true
FEATURE_GRIEF_SENSITIVITY=true
```

### Production-Ready Environment (`.env.production.template`)
Pre-configured for multiple cloud providers:
- AWS (RDS, ElastiCache, S3)
- Google Cloud (Cloud SQL, Memorystore, Cloud Storage)
- Railway (PostgreSQL, Redis)
- Vercel (Serverless, Edge)

---

## AI Training Workflow

### Local GPU Training (RTX 5090)
```bash
# Start training job
curl -X POST http://localhost:3000/api/training/start \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "voiceData": "..."}'

# Monitor training progress
curl http://localhost:3000/api/training/status

# Check GPU utilization
nvidia-smi
```

### Voice Processing Pipeline
1. **Upload**: Voice files uploaded via web interface
2. **Processing**: Automatic audio processing and feature extraction
3. **Training**: RTX 5090 trains personalized voice models
4. **Synthesis**: Generate synthetic voice responses
5. **Storage**: Processed files stored locally (`./public/voices/`)

---

## Database Management

### Schema Migrations
```bash
# Run all pending migrations
./dev.sh migrate

# Create new migration
npm run migrate:create -- create_new_table

# Rollback last migration
npm run migrate:rollback
```

### Database Access
```bash
# PostgreSQL shell
./dev.sh db

# Common queries
\dt                     # List tables
\d users               # Describe users table
SELECT COUNT(*) FROM responses;  # Count responses
```

### Backup & Restore
```bash
# Create backup
docker-compose -f docker-compose.dev.yml exec postgres \
  pg_dump -U echosofme echosofme_dev > backup.sql

# Restore backup
docker-compose -f docker-compose.dev.yml exec -T postgres \
  psql -U echosofme echosofme_dev < backup.sql
```

---

## Performance Optimization

### Database Performance
- **Connection Pooling**: Configured for 20 connections (development)
- **Query Monitoring**: Slow query logging enabled
- **Indexing**: Optimized indexes for common queries

### Application Performance
- **Hot Reload**: Fast development iteration
- **Caching**: Redis for session and API caching
- **Code Splitting**: Optimized bundles for admin dashboard

### AI Training Performance
- **GPU Optimization**: RTX 5090 memory management
- **Batch Processing**: Efficient training job queuing
- **Model Caching**: Reuse trained models when possible

---

## Monitoring & Debugging

### Application Monitoring
```bash
# View real-time logs
./dev.sh logs app

# Monitor database performance
./dev.sh db
# Then: SELECT * FROM db_performance;

# Check Redis cache
./dev.sh redis
# Then: INFO memory
```

### Health Checks
```bash
# Application health
curl http://localhost:3000/api/health

# Database health
./dev.sh db -c "SELECT 1"

# Redis health
./dev.sh redis ping
```

### Performance Metrics (Optional)
- **Grafana Dashboard**: http://localhost:3001
- **Prometheus Metrics**: http://localhost:9090
- **Application Metrics**: http://localhost:3000/api/metrics

---

## Testing Strategy

### Manual Testing
```bash
# Register new user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'

# Upload voice sample
curl -X POST http://localhost:3000/api/voice/upload \
  -F "voice=@sample.wav" \
  -F "userId=user123"

# Generate AI response
curl -X POST http://localhost:3000/api/ai-echo/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Tell me about your childhood", "userId": "user123"}'
```

### Automated Testing
```bash
# Run test suite (when implemented)
npm test

# Run specific test file
npm test -- user.test.js

# Run tests with coverage
npm run test:coverage
```

---

## Development Best Practices

### Code Organization
```
app/
├── (landing)/          # Marketing pages
├── admin/             # Admin dashboard
├── api/               # API routes
├── auth/              # Authentication pages
├── dashboard/         # User dashboard
└── training/          # AI training interface

components/
├── ui/                # Reusable UI components
├── admin/             # Admin-specific components
└── providers/         # Context providers

lib/
├── db.ts             # Database utilities
├── auth.ts           # Authentication config
├── training-engine.ts # AI training logic
└── utils.ts          # Common utilities
```

### Environment Management
- **Never commit `.env.local`** (contains secrets)
- **Use `.env.local.template`** for sharing configuration structure
- **Validate environment variables** at application startup

### Security Practices
- **Input Validation**: Validate all user inputs
- **SQL Injection Prevention**: Use parameterized queries
- **Authentication**: Secure session management
- **File Upload Security**: Validate file types and sizes

---

## Troubleshooting

### Common Issues

#### Docker Issues
```bash
# Container won't start
docker-compose -f docker-compose.dev.yml logs

# Port already in use
docker-compose -f docker-compose.dev.yml down
sudo netstat -tulpn | grep :3000

# Clean Docker resources
docker system prune -f
```

#### Database Issues
```bash
# Connection refused
./dev.sh db
# If fails, restart PostgreSQL:
docker-compose -f docker-compose.dev.yml restart postgres

# Migration errors
./dev.sh logs app
# Check for SQL syntax errors
```

#### AI Training Issues
```bash
# GPU not detected
nvidia-smi
# Ensure NVIDIA drivers and Docker GPU support installed

# Training job stuck
curl http://localhost:3000/api/training/status
# Check job queue and restart if needed
```

### Performance Issues
```bash
# Slow database queries
# Check slow query log in app logs
./dev.sh logs app | grep "Slow query"

# High memory usage
docker stats
# Monitor container resource usage

# Disk space issues
df -h
# Clean up old Docker volumes if needed
```

---

## Cloud Migration Preparation

### When You're Ready to Scale
1. **Backup Local Data**
   ```bash
   ./scripts/cloud-migrate.sh backup
   ```

2. **Choose Cloud Provider**
   - **Railway**: Simplest deployment, great for POC
   - **Vercel**: Optimized for Next.js, serverless
   - **AWS**: Full control, enterprise features
   - **Google Cloud**: AI/ML optimizations

3. **Prepare Configuration**
   ```bash
   # Generate cloud-specific configs
   ./scripts/cloud-migrate.sh prepare --provider railway --target staging
   ```

4. **Execute Migration**
   ```bash
   # Migrate when ready
   ./scripts/cloud-migrate.sh migrate --provider railway --target production
   ```

### Migration Checklist
- [ ] Data backup completed
- [ ] Environment variables configured
- [ ] Domain name registered
- [ ] SSL certificates prepared
- [ ] Monitoring configured
- [ ] Testing completed

---

## Cost Optimization

### Development Phase (Current)
- **$0/month**: Complete local development
- **Hardware**: RTX 5090 (one-time investment)
- **Internet**: Standard broadband for development

### Scaling Costs (When Ready)
| Users | Monthly Cost | Services |
|-------|-------------|----------|
| 0-100 | $0-25 | Free tiers only |
| 100-1K | $50-150 | Managed services |
| 1K-10K | $200-800 | Auto-scaling infrastructure |
| 10K+ | $800+ | Enterprise-grade architecture |

### Cost-Saving Tips
1. **Start with free tiers** of cloud services
2. **Use spot instances** for non-critical workloads
3. **Implement auto-scaling** to reduce idle costs
4. **Monitor usage** and optimize regularly
5. **Consider reserved instances** for predictable workloads

---

## Support & Resources

### Documentation
- [Scaling Roadmap](./SCALING_ROADMAP.md) - Complete scaling strategy
- [Deployment Guide](./DEPLOYMENT_GUIDE.md) - Production deployment
- [API Documentation](./API_DOCS.md) - API reference

### Getting Help
1. Check logs: `./dev.sh logs`
2. Review configuration: `.env.local`
3. Validate setup: `./scripts/dev-setup.sh validate`
4. Reset environment: `./scripts/dev-setup.sh reset`

### Community
- GitHub Issues for bug reports
- Discussions for feature requests
- Discord for real-time support (if available)

---

## Next Steps

1. **Complete Local Setup**
   ```bash
   ./scripts/dev-setup.sh
   ```

2. **Customize Configuration**
   - Edit `.env.local`
   - Review security settings
   - Configure AI training parameters

3. **Start Development**
   - Implement core features
   - Test voice processing pipeline
   - Validate user experience

4. **Plan for Scale**
   - Review [Scaling Roadmap](./SCALING_ROADMAP.md)
   - Prepare cloud migration strategy
   - Set up monitoring and alerts

**Happy coding! 🚀**

*Remember: Start simple, iterate quickly, and scale based on real user needs.*