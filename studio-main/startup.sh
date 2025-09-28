#!/bin/bash
# startup.sh - Sequential startup script for Render

echo "Starting backend server..."
export PYTHONPATH=src
uvicorn src.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "Waiting for backend to be ready..."
# Wait for backend to respond
for i in {1..30}; do
    if curl -f http://127.0.0.1:8000/health >/dev/null 2>&1; then
        echo "Backend is ready!"
        break
    fi
    echo "Backend not ready yet (attempt $i/30), waiting..."
    sleep 2
done

# Check if backend is actually running
if ! curl -f http://127.0.0.1:8000/health >/dev/null 2>&1; then
    echo "ERROR: Backend failed to start properly"
    exit 1
fi

echo "Starting frontend server..."
npm run start -- -p $PORT &
FRONTEND_PID=$!

# Keep both processes running
wait $BACKEND_PID $FRONTEND_PID
