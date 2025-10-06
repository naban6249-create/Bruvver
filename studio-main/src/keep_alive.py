# studio-main/src/keep_alive.py

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
        self.interval = interval_minutes * 60  # Convert to seconds
        self.running = False
        self.thread = None

    def ping_service(self, name: str, url: str) -> bool:
        """Ping a single service"""
        try:
            response = requests.get(url, timeout=15)
            if response.status_code == 200:
                logger.info(f"✓ {name} ping successful at {datetime.now().strftime('%H:%M:%S')}")
                return True
            else:
                logger.warning(f"⚠ {name} returned status {response.status_code}")
                return False
        except requests.exceptions.Timeout:
            logger.error(f"✗ {name} ping timeout (might be waking up)")
            return False
        except requests.exceptions.RequestException as e:
            logger.error(f"✗ {name} ping failed: {e}")
            return False

    def ping_all(self):
        """Ping all configured services"""
        for service in self.services:
            name = service.get("name", "Unknown")
            url = service.get("url", "")
            if url:
                self.ping_service(name, url)
            else:
                logger.warning(f"No URL configured for {name}")

    def _ping_loop(self):
        """Background loop that pings periodically"""
        logger.info(f"Keep-alive thread started for {len(self.services)} services")
        while self.running:
            self.ping_all()
            time.sleep(self.interval)
        logger.info("Keep-alive thread stopped")

    def start(self):
        """Start the keep-alive service"""
        if self.running:
            logger.warning("Keep-alive already running")
            return
        
        if not self.services:
            logger.warning("No services configured for keep-alive")
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._ping_loop, daemon=True)
        self.thread.start()
        
        service_names = ", ".join([s.get("name", "Unknown") for s in self.services])
        logger.info(f"Keep-alive started for: {service_names} (every {self.interval/60:.0f} min)")
        
        # Send immediate first ping
        self.ping_all()

    def stop(self):
        """Stop the keep-alive service"""
        if not self.running:
            return
            
        self.running = False
        if self.thread and self.thread.is_alive():
            self.thread.join(timeout=5)
        logger.info("Keep-alive service stopped")

def create_multi_service_keepalive(
    backend_url: str, 
    frontend_url: str, 
    interval_minutes: int = 10
) -> KeepAlive:
    """Create a keep-alive instance for both backend and frontend"""
    return KeepAlive(
        services=[
            {"name": "Backend", "url": f"{backend_url}/health"},
            {"name": "Frontend", "url": frontend_url}
        ],
        interval_minutes=interval_minutes
    )
