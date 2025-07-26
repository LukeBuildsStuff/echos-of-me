# Echos Of Me

A web application that creates an AI echo of your personality by collecting daily question responses, learning to think and respond just like you.

## Quick Start

1. **Prerequisites**
   - Docker Desktop with WSL2 integration
   - NVIDIA GPU drivers and Docker GPU support
   - Node.js 20+ (for local development)

2. **Setup Environment**
   ```bash
   # Copy environment variables
   cp .env.example .env
   
   # Edit .env with your API keys
   nano .env
   ```

3. **Start Development Environment**
   ```bash
   # Start all services
   docker-compose up -d
   
   # View logs
   docker-compose logs -f web
   
   # Install dependencies (first time only)
   docker-compose exec web npm install
   
   # Run database migrations
   docker-compose exec web npm run migrate
   ```

4. **Access Services**
   - Web App: http://localhost:3001 (Production: https://echosofme.io)
   - Database: localhost:5432
   - Redis: localhost:6379
   - pgAdmin: http://localhost:5050 (admin@personalai.com / admin123)

## Project Structure

```
echosofme/
├── web/                 # Next.js frontend application
├── ml/                  # Python ML training scripts
├── data/                # Training data exports
├── models/              # Trained model storage
├── scripts/             # Utility scripts
├── project-docs/        # Detailed documentation
└── CLAUDE.md           # AI context file
```

## Development Workflow

1. **Making Changes**
   - Frontend code in `/web` hot-reloads automatically
   - Database schema changes go in `/scripts/migrations`
   - ML scripts in `/ml` for training pipelines

2. **Testing GPU Support**
   ```bash
   # Check GPU availability
   docker-compose exec ml-trainer nvidia-smi
   ```

3. **Database Management**
   - Access pgAdmin at http://localhost:5050
   - Use provided credentials to connect
   - Database name: `personalai`

## Next Steps

1. Set up authentication system
2. Create question generation service
3. Build response collection UI
4. Implement training pipeline
5. Deploy to Cloudflare

## Troubleshooting

- **Docker GPU Issues**: Ensure NVIDIA Container Toolkit is installed
- **Port Conflicts**: Check if ports 3000, 5432, 6379, 5050 are available
- **WSL Performance**: Keep code in WSL filesystem, not Windows mount

## License

MIT