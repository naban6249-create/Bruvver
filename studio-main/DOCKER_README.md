# Coffee Shop Management System - Docker Setup

This directory contains Docker configuration files to run the complete Coffee Shop Management System.

## Services Included

- **Frontend**: Next.js application (React/TypeScript)
- **Backend**: FastAPI application with SQLAlchemy
- **Database**: PostgreSQL 15
- **Cache**: Redis (optional)

## Quick Start

1. **Copy environment file:**
   ```bash
   cp .env.docker.example .env.docker
   ```

2. **Build and start services:**
   ```bash
   docker-compose up --build
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Documentation: http://localhost:8000/docs

## Environment Variables

Create a `.env.docker` file with the following variables:

```env
# Database Configuration
DATABASE_URL=postgresql://postgres:postgres123@db:5432/coffee_shop

# API Keys and Authentication
SERVICE_API_KEY=sk-coffee-management-2024
API_KEY=sk-coffee-management-2024
API_KEY_HEADER=X-API-Key
API_KEY_PREFIX=

# Application URLs
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
NEXT_PUBLIC_API_SERVER_URL=http://localhost:8000

# CORS Settings
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:9002

# Timezone
TZ=Asia/Kolkata

# Redis Configuration (optional)
REDIS_URL=redis://redis:6379/0

# Google Sheets Integration (optional - configure if needed)
GOOGLE_SHEETS_CREDENTIALS_PATH=/app/credentials.json
GOOGLE_SHEET_ID=1HUumnzKXmZeg7TDQt7t5E87aPXHcGbyceYSf_mqmnq8

# Development Settings
DEBUG=True
LOG_LEVEL=INFO
```

## Development Commands

```bash
# Start all services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild services
docker-compose build --no-cache

# Run database migrations (if needed)
docker-compose exec backend python -m alembic upgrade head
```

## File Structure

```
├── Dockerfile.backend       # FastAPI backend container
├── Dockerfile.frontend      # Next.js frontend container
├── docker-compose.yml       # Service orchestration
├── .dockerignore           # Files to ignore in frontend build
├── .dockerignore.backend   # Files to ignore in backend build
├── requirements.txt        # Python dependencies
└── .env.docker.example     # Environment template
```

## Troubleshooting

1. **Database Connection Issues:**
   - Ensure PostgreSQL container is healthy
   - Check database logs: `docker-compose logs db`

2. **API Authentication Issues:**
   - Verify `SERVICE_API_KEY` in environment variables
   - Check backend logs: `docker-compose logs backend`

3. **Frontend Not Loading:**
   - Ensure backend is running first
   - Check browser console for API errors

4. **Port Conflicts:**
   - Change ports in docker-compose.yml if needed
   - Check `docker-compose ps` for running containers
