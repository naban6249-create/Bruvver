# Render Deployment Guide for Coffee Shop Management System

## 🚀 Step-by-Step Guide to Deploy on Render

### Prerequisites
1. **Render Account**: Sign up at [render.com](https://render.com)
2. **GitHub Repository**: Push your code to a GitHub repository
3. **Google Sheets API**: Set up Google Sheets API credentials (if using Google Sheets integration)

---

## Step 1: Prepare Your Repository

### 1.1 Environment Variables Setup
Create a `.env` file in your project root with the following variables:

```bash
# Backend Environment Variables
DATABASE_URL=sqlite:///./coffee_shop.db
REDIS_URL=rediss://your-redis-service-name:6379
SERVICE_API_KEY=your-secure-api-key
API_KEY=your-secure-api-key
ALLOWED_ORIGINS=https://your-frontend-domain.onrender.com
TZ=Asia/Kolkata
PYTHONPATH=/app/src
PYTHONUNBUFFERED=1

# Google Sheets Configuration (if using)
GOOGLE_SHEETS_CREDENTIALS_PATH=/app/credentials.json
GOOGLE_SHEET_ID=your-google-sheet-id
GOOGLE_APPLICATION_CREDENTIALS=/app/credentials.json

# Frontend Environment Variables
NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain.onrender.com/api
NEXT_PUBLIC_API_SERVER_URL=https://your-backend-domain.onrender.com
NEXT_PUBLIC_COIMBATORE_BRANCH_ID=1
NODE_ENV=production
PORT=3000
```

### 1.2 Update Database Configuration
If you're using SQLite (current setup), ensure your database file is properly handled:

```python
# In your database.py file, ensure the path is correct
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./coffee_shop.db")
```

### 1.3 Google Sheets Setup (Optional)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Sheets API
4. Create service account credentials
5. Download the JSON file and place it as `credentials.json` in your project root
6. Share your Google Sheet with the service account email

---

## Step 2: Deploy on Render

### 2.1 Connect Your Repository
1. Log into [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository
4. Select the repository containing your coffee shop project

### 2.2 Deploy Services

#### Option A: Using render.yaml (Recommended)
Render will automatically detect and use the `render.yaml` file in your repository.

**The services will be created as:**
- **Backend Service**: FastAPI application on port 8000
- **Frontend Service**: Next.js application on port 3000
- **Redis Service**: Caching service

#### Option B: Manual Service Creation
If you prefer to create services manually:

1. **Create Backend Service:**
   - **Name**: `coffee-shop-backend`
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `Dockerfile.backend`
   - **Build Command**: `docker build -f Dockerfile.backend -t coffee-shop-backend .`
   - **Start Command**: `uvicorn src.main:app --host 0.0.0.0 --port $PORT --workers 1`

2. **Create Frontend Service:**
   - **Name**: `coffee-shop-frontend`
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `Dockerfile.frontend`
   - **Build Command**: `docker build -f Dockerfile.frontend -t coffee-shop-frontend .`
   - **Start Command**: `npm start`

3. **Create Redis Service:**
   - **Name**: `coffee-shop-redis`
   - **Type**: `Redis`
   - **Plan**: `Starter` (free tier available)

### 2.3 Configure Environment Variables
For each service, add the environment variables from Step 1.1.

**Important**: Update the service names in the URLs:
- Replace `your-backend-domain` with your actual backend service name
- Replace `your-frontend-domain` with your actual frontend service name

### 2.4 Set Service Dependencies
In your backend service settings:
- Add `coffee-shop-redis` as a dependency
- Set it to wait for the Redis service to be healthy

---

## Step 3: Configure CORS and API Endpoints

### 3.1 Update CORS Settings
In your FastAPI backend (`src/main.py`), ensure CORS is configured:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://coffee-shop-frontend.onrender.com"],  # Update with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3.2 Update API Base URLs
In your frontend code, ensure API calls use the correct base URL:

```javascript
// In your API client configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api';
```

---

## Step 4: Domain Configuration

### 4.1 Custom Domain (Optional)
1. Go to **Settings** → **Custom Domains** in your Render dashboard
2. Add your custom domain
3. Configure DNS settings with your domain provider
4. Update environment variables with your custom domain

### 4.2 SSL Certificate
Render automatically provides SSL certificates for all services.

---

## Step 5: Database Migration and Initialization

### 5.1 Database Setup
If you need to run database migrations:

1. **SSH into your backend service** after deployment
2. Run migration commands:
   ```bash
   alembic upgrade head
   ```

### 5.2 Initialize Database
If your application has an initialization script:
```bash
python src/init_database.py
```

---

## Step 6: Monitor and Troubleshoot

### 6.1 Check Service Logs
1. Go to your service dashboard
2. Click on **Logs** to view real-time logs
3. Check for any errors during startup

### 6.2 Health Checks
Your services include health checks:
- Backend: `GET /health`
- Frontend: `GET /`
- Redis: Built-in health check

### 6.3 Common Issues and Solutions

**Issue 1: Database Connection Failed**
- Ensure `DATABASE_URL` is correctly set
- Check if database file exists and has proper permissions

**Issue 2: API Calls Failing**
- Verify `NEXT_PUBLIC_API_BASE_URL` points to correct backend service
- Check CORS configuration in backend

**Issue 3: Redis Connection Failed**
- Ensure Redis service is running
- Check `REDIS_URL` format

**Issue 4: Google Sheets Integration Not Working**
- Verify `credentials.json` exists
- Check service account permissions
- Ensure `GOOGLE_SHEET_ID` is correct

---

## Step 7: Post-Deployment Steps

### 7.1 Test Your Application
1. Visit your frontend URL
2. Test user registration/login
3. Verify API calls are working
4. Check database operations

### 7.2 Set Up Monitoring
1. Configure error tracking (e.g., Sentry)
2. Set up logging aggregation
3. Monitor service performance

### 7.3 Backup Strategy
- Set up automated database backups
- Consider using Render's persistent disks for important data

---

## 📞 Support and Resources

- **Render Documentation**: [docs.render.com](https://docs.render.com)
- **Render Community**: [community.render.com](https://community.render.com)
- **Render Status**: [status.render.com](https://status.render.com)

---

## 🎉 Deployment Complete!

Your coffee shop management system is now live on Render! Users can access it through your frontend URL, and all backend services are running in the cloud.

**Next Steps:**
- Monitor your application performance
- Set up automated testing
- Configure CI/CD pipeline
- Add error monitoring and logging

Remember to keep your environment variables secure and update them as needed when making changes to your application.
