#!/usr/bin/env python3
import uvicorn
import os
import sys

# Set environment variable
os.environ['SERVICE_API_KEY'] = 'sk-coffee-management-2024'

# Add src to path
sys.path.append('src')

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
