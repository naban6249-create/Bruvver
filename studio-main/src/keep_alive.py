import requests
import time
import threading
import logging
from datetime import datetime
from typing import List, Dict

logger = logging.getLogger(__name__)

class KeepAlive:
    """Self-ping to prevent Render.com services from sleeping"""
    
    def __init__(self, services: List[Dict[str, str]], interval_minutes: int = 10):
        self.services = services
        self.interval = interval_minutes * 60
        self.running = False
        self.thread = None
    
    def ping_service(self, name: str, url: str) -> bool:
        """Ping a single service"""
        try:
            response = requests.get(url, timeout=30, allow_redirects=True)
            
            # Accept 200, 201, and even 503 (service starting) as "alive"
            if response.status_code in [200, 201]:
                logger.info(f"✓ {name} ping successful at {datetime.now().strftime('%H:%M:%S')}")
                return True
            elif response.status_code == 503:
                logger.info(f"⏳ {name} is starting up (503)...")
                return True  # Don't spam warnings during startup
            else:
                logger.warning(f"⚠ {name} returned status {response.status_code}")
                return False
        except requests.exceptions.Timeout:
            logger.warning(f"⏰ {name} timeout (might be cold start)")
            return False
        except requests.exceptions.RequestException as e:
            logger.debug(f"⚠ {name} ping error: {str(e)[:100]}")
            return False
    
    def ping_all(self):
        """Ping all configured services"""
        for service in self.services:
            name = service.get("name", "Unknown")
            url = service.get("url", "")
            if url:
                self.ping_service(name, url)
    
    def _ping_loop(self):
        """Background loop"""
        logger.info(f"Keep-alive thread started for {len(self.services)} services")
        while self.running:
            self.ping_all()
            time.sleep(self.interval)
        logger.info("Keep-alive thread stopped")
    
    def start(self):
        """Start the keep-alive service"""
        if self.running:
            return
        
        if not self.services:
            logger.warning("No services configured for keep-alive")
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._ping_loop, daemon=True)
        self.thread.start()
        
        logger.info(f"Keep-alive started (every {self.interval/60:.0f} min)")
        self.ping_all()  # Immediate first ping
    
    def stop(self):
        """Stop the keep-alive service"""
        if not self.running:
            return
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=5)
        logger.info("Keep-alive service stopped")


def create_backend_keepalive(
    backend_url: str,
    interval_minutes: int = 14
) -> KeepAlive:
    """Create keep-alive for backend only (no frontend)"""
    return KeepAlive(
        services=[
            {"name": "Backend", "url": f"{backend_url}/health"}
        ],
        interval_minutes=interval_minutes
    )
