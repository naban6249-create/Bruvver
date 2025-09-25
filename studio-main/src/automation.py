# automation.py
import asyncio
import gspread
import emails
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List
import os
from dotenv import load_dotenv
import logging

from database import SessionLocal
from models import DailySale, MenuItem
from crud import get_menu_item
from sheets_exporter import export_day

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AutomationService:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.google_sheets_client = None
        self.setup_google_sheets()
    
    def setup_google_sheets(self):
        """Setup Google Sheets client"""
        try:
            credentials_file = os.getenv("GOOGLE_SHEETS_CREDENTIALS_FILE")
            if credentials_file and os.path.exists(credentials_file):
                self.google_sheets_client = gspread.service_account(filename=credentials_file)
                logger.info("Google Sheets client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Google Sheets client: {e}")

    async def export_daily_sales_to_sheets(self):
        try:
            yesterday = datetime.now().date() - timedelta(days=1)
            logger.info(f"Starting daily export for {yesterday.isoformat()}")

            db = SessionLocal()
            try:
                # Call the centralized export function from sheets_exporter
                # This will export both sales and expenses for all branches
                export_day(db, yesterday)
                logger.info(f"Successfully exported sales and expenses for {yesterday.isoformat()}")
            finally:
                db.close()
        except Exception as e:
            logger.error(f"Failed to export daily data to Google Sheets: {e}")
    
    async def send_daily_summary_email(self, sales_data: List, total_revenue: float, date: datetime.date):
        """Send daily summary email to admin"""
        try:
            email_address = os.getenv("EMAIL_ADDRESS")
            email_password = os.getenv("EMAIL_PASSWORD")
            
            if not email_address or not email_password:
                logger.warning("Email credentials not configured")
                return
            
            # Prepare email content
            html_content = f"""
            <html>
                <body>
                    <h2>Daily Sales Summary - {date}</h2>
                    <p><strong>Total Revenue: ${total_revenue:.2f}</strong></p>
                    <p><strong>Total Items Sold: {sum(int(row[2]) for row in sales_data)}</strong></p>
                    
                    <table border="1" style="border-collapse: collapse; width: 100%;">
                        <tr>
                            <th>Item Name</th>
                            <th>Quantity</th>
                            <th>Unit Price</th>
                            <th>Revenue</th>
                        </tr>
                        {''.join(f'<tr><td>{row[1]}</td><td>{row[2]}</td><td>{row[3]}</td><td>{row[4]}</td></tr>' for row in sales_data)}
                    </table>
                    
                    <p>This is an automated report from Coffee Command Center.</p>
                </body>
            </html>
            """
            
            message = emails.html(
                html=html_content,
                subject=f"Daily Sales Report - {date}",
                mail_from=email_address
            )
            
            # Configure SMTP
            smtp_config = {
                'host': os.getenv('SMTP_SERVER', 'smtp.gmail.com'),
                'port': int(os.getenv('SMTP_PORT', '587')),
                'tls': True,
                'user': email_address,
                'password': email_password
            }
            
            # Send email to admin (you can make this configurable)
            response = message.send(to=email_address, smtp=smtp_config)
            
            if response.status_code == 250:
                logger.info("Daily summary email sent successfully")
            else:
                logger.error(f"Failed to send email: {response.status_code}")
                
        except Exception as e:
            logger.error(f"Failed to send daily summary email: {e}")
    
    async def reset_daily_counters(self):
        """Reset any daily counters or perform daily maintenance"""
        logger.info("Performing daily reset and maintenance tasks")
        
        # Add any daily reset logic here
        # For example, clearing temporary data, resetting counters, etc.
        
        try:
            db = SessionLocal()
            
            # Example: Log the daily reset
            logger.info(f"Daily reset completed at {datetime.now()}")
            
            db.close()
            
        except Exception as e:
            logger.error(f"Failed to perform daily reset: {e}")
    
    def start_scheduler(self):
        """Start the background scheduler"""
        # Schedule daily export at midnight
        self.scheduler.add_job(
            func=self.export_daily_sales_to_sheets,
            trigger=CronTrigger(hour=0, minute=5),  # 12:05 AM
            id='daily_export',
            name='Export daily sales to Google Sheets',
            replace_existing=True
        )
        
        # Schedule daily reset at 11:55 PM
        self.scheduler.add_job(
            func=self.reset_daily_counters,
            trigger=CronTrigger(hour=23, minute=55),  # 11:55 PM
            id='daily_reset',
            name='Daily reset and maintenance',
            replace_existing=True
        )
        
        # Start the scheduler
        self.scheduler.start()
        logger.info("Background scheduler started successfully")
    
    def stop_scheduler(self):
        """Stop the background scheduler"""
        if self.scheduler.running:
            self.scheduler.shutdown()
            logger.info("Background scheduler stopped")

# Global automation service instance
automation_service = AutomationService()

def start_automation():
    """Start automation services"""
    automation_service.start_scheduler()

def stop_automation():
    """Stop automation services"""
    automation_service.stop_scheduler()

# Manual trigger functions (can be used in API endpoints for testing)
async def manual_export_sales():
    """Manually trigger sales export"""
    await automation_service.export_daily_sales_to_sheets()

async def manual_reset():
    """Manually trigger daily reset"""
    await automation_service.reset_daily_counters()
