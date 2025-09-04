# Coffee Command Center Backend

A comprehensive FastAPI backend for coffee shop management with SQLite database, automated reporting, and Google Sheets integration.

## 🚀 Features

- **Complete Menu Management**: CRUD operations for coffee menu items with ingredients
- **Order Processing**: Full order management system with status tracking
- **Sales Analytics**: Daily sales tracking with comprehensive reporting
- **Inventory Management**: Stock tracking with low-stock alerts
- **Admin Authentication**: JWT-based authentication system
- **Automated Reporting**: Daily export to Google Sheets and email notifications
- **RESTful API**: Well-documented API endpoints with OpenAPI/Swagger docs

## 🛠️ Tech Stack

- **Backend**: FastAPI (Python 3.11+)
- **Database**: SQLite with SQLAlchemy ORM
- **Authentication**: JWT tokens with bcrypt password hashing
- **Automation**: APScheduler for daily tasks
- **Google Sheets**: gspread for automated exports
- **Email**: SMTP email notifications
- **Deployment**: Docker, Render, or Vercel ready

## 📁 Project Structure

```
coffee-backend/
├── main.py                 # Main FastAPI application
├── models.py              # SQLAlchemy database models
├── schemas.py             # Pydantic data schemas
├── database.py            # Database configuration
├── auth.py                # Authentication utilities
├── crud.py                # Database CRUD operations
├── automation.py          # Scheduled tasks and automation
├── deploy.py              # Deployment utilities
├── test_main.py           # Test cases
├── requirements.txt       # Python dependencies
├── .env.example          # Environment variables template
├── Dockerfile            # Docker configuration
├── docker-compose.yml    # Docker Compose setup
└── README.md             # This file
```

## 🔧 Quick Setup

### 1. Clone and Install Dependencies

```bash
# Clone your repository
git clone <your-repo-url>
cd coffee-backend

# Set up virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your actual values
nano .env
```

Required environment variables:
- `SECRET_KEY`: JWT secret key (generate a strong random key)
- `EMAIL_ADDRESS`: Your Gmail address for notifications
- `EMAIL_PASSWORD`: Gmail app password
- `GOOGLE_SHEET_ID`: Your Google Sheet ID for exports

### 3. Google Sheets Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable Google Sheets API
4. Create a service account
5. Download the JSON credentials file
6. Rename it to `credentials.json` and place in project root
7. Share your Google Sheet with the service account email

### 4. Run the Application

```bash
# Development mode
python deploy.py setup
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Or use the deployment script
python deploy.py check
python deploy.py migrate
uvicorn main:app --host 0.0.0.0 --port 8000
```

## 📚 API Documentation

Once running, access the interactive API documentation:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🔑 API Endpoints

### Public Endpoints
- `GET /` - API status and info
- `GET /health` - Health check
- `GET /api/menu` - Get menu items
- `GET /api/menu/{id}` - Get specific menu item
- `POST /api/orders` - Create new order
- `GET /api/categories` - Get menu categories

### Admin Endpoints (Require Authentication)
- `POST /api/auth/register` - Register admin
- `POST /api/auth/login` - Admin login
- `GET /api/auth/me` - Get current user
- `POST /api/menu` - Create menu item
- `PUT /api/menu/{id}` - Update menu item
- `DELETE /api/menu/{id}` - Delete menu item
- `GET /api/orders` - Get orders
- `PATCH /api/orders/{id}` - Update order status
- `GET /api/sales` - Get sales data
- `POST /api/sales` - Record manual sale
- `GET /api/sales/summary` - Get sales analytics
- `GET /api/dashboard` - Get dashboard data
- `GET /api/inventory` - Get inventory
- `POST /api/inventory` - Add inventory item
- `PATCH /api/inventory/{id}` - Update inventory

## 🤖 Automation Features

The system includes automated tasks that run daily:

### Daily Export (12:05 AM)
- Exports previous day's sales to Google Sheets
- Sends email summary to admin
- Creates daily report records

### Daily Reset (11:55 PM)  
- Performs maintenance tasks
- Logs daily statistics
- Prepares system for next day

### Manual Triggers
- `POST /api/admin/export-sales` - Manual export trigger
- `POST /api/admin/daily-reset` - Manual reset trigger

## 🚀 Deployment Options

### Option 1: Render.com

```bash
python deploy.py render
```

1. Push code to GitHub
2. Connect to Render
3. Set environment variables
4. Deploy as Web Service

### Option 2: Vercel

```bash
python deploy.py vercel
```

1. Install Vercel CLI
2. Run deployment command
3. Configure serverless functions

### Option 3: Docker

```bash
# Build image
python deploy.py docker

# Run container
docker-compose up -d
```

## 🧪 Testing

```bash
# Run all tests
python deploy.py test

# Or run pytest directly
pytest test_main.py -v
```

## 🔒 Security Notes

- Change the default `SECRET_KEY` in production
- Use strong passwords for admin accounts
- Enable HTTPS in production
- Regularly update dependencies
- Configure proper CORS origins

## 📊 Database Schema

### Core Tables
- `menu_items` - Coffee menu items with pricing
- `ingredients` - Ingredients for each menu item
- `orders` - Customer orders
- `order_items` - Individual items in orders
- `daily_sales` - Sales records for analytics
- `admins` - Admin user accounts
- `inventory` - Stock management
- `stock_movements` - Inventory movement tracking

## 🤝 Integration with Frontend

Your TypeScript frontend can connect to this API:

```typescript
// Example API calls
const API_BASE = 'http://localhost:8000/api';

// Get menu
const menu = await fetch(`${API_BASE}/menu`);

// Create order
const order = await fetch(`${API_BASE}/orders`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(orderData)
});

// Admin login
const auth = await fetch(`${API_BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});
```

## 📈 Monitoring and Logs

- Health check endpoint: `/health`
- Application logs via uvicorn
- Database query monitoring
- Automated error handling and reporting

## 🔄 Updates and Maintenance

- Database migrations handled automatically
- Backup SQLite database regularly
- Monitor Google Sheets API quotas
- Update dependencies regularly

## 📞 Support

For issues and questions:
1. Check the API documentation at `/docs`
2. Review logs for error details
3. Ensure all environment variables are set correctly
4. Verify Google Sheets and email configurations