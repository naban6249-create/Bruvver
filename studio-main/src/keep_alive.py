"""
Keep-alive service for Render deployment
Pings both frontend and backend services to prevent them from sleeping
"""
import requests
import logging
from threading import Thread
import time

logger = logging.getLogger(__name__)

class MultiServiceKeepAlive:
    """Keep-alive service that pings multiple services"""
    
    def __init__(self, backend_url: str, frontend_url: str, interval_minutes: int = 10):
        self.backend_url = backend_url.rstrip('/')
        self.frontend_url = frontend_url.rstrip('/')
        self.interval_seconds = interval_minutes * 60
        self.running = False
        self.thread = None
        
    def ping_service(self, url: str, service_name: str) -> bool:
        """Ping a service and return success status"""
        try:
            # Try health endpoint first
            response = requests.get(f"{url}/health", timeout=10)
            if response.status_code == 200:
                logger.info(f"✓ {service_name} ping successful at {time.strftime('%H:%M:%S')}")
                return True
            else:
                logger.warning(f"⚠ {service_name} returned status {response.status_code}")
                return False
        except requests.exceptions.Timeout:
            logger.warning(f"⚠ {service_name} ping timeout")
            return False
        except requests.exceptions.ConnectionError:
            logger.warning(f"⚠ {service_name} connection error")
            return False
        except Exception as e:
            logger.error(f"✗ {service_name} ping error: {e}")
            return False
    
    def _keep_alive_loop(self):
        """Main keep-alive loop"""
        logger.info(f"Keep-alive service started (interval: {self.interval_seconds}s)")
        logger.info(f"Backend URL: {self.backend_url}")
        logger.info(f"Frontend URL: {self.frontend_url}")
        
        while self.running:
            try:
                # Ping backend
                self.ping_service(self.backend_url, "Backend")
                
                # Wait a bit between pings
                time.sleep(2)
                
                # Ping frontend
                self.ping_service(self.frontend_url, "Frontend")
                
                # Wait for next interval
                time.sleep(self.interval_seconds)
                
            except Exception as e:
                logger.error(f"Keep-alive loop error: {e}")
                time.sleep(60)  # Wait a minute before retrying
    
    def start(self):
        """Start the keep-alive service in a background thread"""
        if not self.running:
            self.running = True
            self.thread = Thread(target=self._keep_alive_loop, daemon=True)
            self.thread.start()
            logger.info("Keep-alive service thread started")
    
    def stop(self):
        """Stop the keep-alive service"""
        if self.running:
            self.running = False
            if self.thread:
                self.thread.join(timeout=5)
            logger.info("Keep-alive service stopped")


def create_multi_service_keepalive(backend_url: str, frontend_url: str, interval_minutes: int = 10) -> MultiServiceKeepAlive:
    """
    Factory function to create and start a multi-service keep-alive instance
    
    Args:
        backend_url: URL of the backend service
        frontend_url: URL of the frontend service
        interval_minutes: Interval between pings in minutes (default: 10)
    
    Returns:
        MultiServiceKeepAlive instance
    """
    service = MultiServiceKeepAlive(backend_url, frontend_url, interval_minutes)
    service.start()
    return service
