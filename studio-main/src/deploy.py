# deploy.py - Deployment utilities and scripts
import os
import subprocess
import sys
from pathlib import Path

def check_requirements():
    """Check if all required environment variables are set"""
    required_vars = [
        "SECRET_KEY",
        "EMAIL_ADDRESS", 
        "EMAIL_PASSWORD",
        "GOOGLE_SHEET_ID"
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing required environment variables: {', '.join(missing_vars)}")
        print("Please set these in your .env file")
        return False
    
    print("✅ All required environment variables are set")
    return True

def setup_google_sheets():
    """Setup Google Sheets credentials"""
    credentials_file = "credentials.json"
    
    if not os.path.exists(credentials_file):
        print(f"❌ Google Sheets credentials file '{credentials_file}' not found")
        print("Please download your service account JSON file and rename it to 'credentials.json'")
        return False
    
    print("✅ Google Sheets credentials file found")
    return True

def run_database_migrations():
    """Run database migrations (create tables)"""
    try:
        from database import engine
        from models import Base
        
        print("🔄 Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to create database tables: {e}")
        return False

def deploy_to_render():
    """Deploy to Render.com instructions"""
    print("""
🚀 Deploy to Render.com:

1. Push your code to GitHub
2. Connect your GitHub repo to Render
3. Set up a new Web Service with these settings:
   - Runtime: Python 3
   - Build Command: pip install -r requirements.txt
   - Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
   
4. Add environment variables in Render dashboard:
   - SECRET_KEY
   - EMAIL_ADDRESS
   - EMAIL_PASSWORD
   - GOOGLE_SHEET_ID
   - DATABASE_URL (optional, defaults to SQLite)
   
5. Upload credentials.json as a secret file

📝 Your API will be available at: https://your-app-name.onrender.com
""")

def deploy_to_vercel():
    """Deploy API to Vercel instructions"""
    print("""
🚀 Deploy to Vercel:

1. Install Vercel CLI: npm i -g vercel
2. Run: vercel
3. Follow the prompts

Note: For database persistence, consider using:
- Vercel Postgres
- PlanetScale
- Railway PostgreSQL

📝 Update your DATABASE_URL environment variable accordingly
""")

def local_development_setup():
    """Set up local development environment"""
    print("🛠️  Setting up local development environment...")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8 or higher is required")
        return False
    
    # Create virtual environment if it doesn't exist
    if not os.path.exists("venv"):
        print("📦 Creating virtual environment...")
        subprocess.run([sys.executable, "-m", "venv", "venv"])
    
    # Install requirements
    print("📦 Installing requirements...")
    if os.name == 'nt':  # Windows
        pip_path = "venv\\Scripts\\pip"
    else:  # Unix/Linux/Mac
        pip_path = "venv/bin/pip"
    
    subprocess.run([pip_path, "install", "-r", "requirements.txt"])
    
    # Create .env file if it doesn't exist
    if not os.path.exists(".env"):
        print("📝 Creating .env file...")
        with open(".env", "w") as f:
            f.write("""# Coffee Command Center Environment Variables
DATABASE_URL=sqlite:///./coffee_shop.db
SECRET_KEY=dev-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email Configuration (Gmail example)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
EMAIL_ADDRESS=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Google Sheets API
GOOGLE_SHEETS_CREDENTIALS_FILE=credentials.json
GOOGLE_SHEET_ID=your-google-sheet-id

# Environment
ENVIRONMENT=development
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
""")
        print("✅ .env file created. Please update with your actual values.")
    
    return True

def run_tests():
    """Run the test suite"""
    print("🧪 Running tests...")
    try:
        subprocess.run([sys.executable, "-m", "pytest", "tests/", "-v"], check=True)
        print("✅ All tests passed!")
        return True
    except subprocess.CalledProcessError:
        print("❌ Some tests failed")
        return False

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Coffee Command Center Deployment Tools")
    parser.add_argument("action", choices=[
        "setup", "check", "migrate", "test", 
        "render", "vercel", "docker"
    ])
    
    args = parser.parse_args()
    
    if args.action == "setup":
        local_development_setup()
    elif args.action == "check":
        check_requirements() and setup_google_sheets()
    elif args.action == "migrate":
        run_database_migrations()
    elif args.action == "test":
        run_tests()
    elif args.action == "render":
        deploy_to_render()
    elif args.action == "vercel":
        deploy_to_vercel()
    elif args.action == "docker":
        print("🐳 Building Docker container...")
        subprocess.run(["docker", "build", "-t", "coffee-command-center", "."])
        print("✅ Docker image built successfully!")
        print("Run with: docker run -p 8000:8000 coffee-command-center")