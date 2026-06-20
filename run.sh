#!/bin/bash
# Start the AI News Agent and register it in the dashboard
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PYTHON=/opt/anaconda3/bin/python3
LOG_FILE="$SCRIPT_DIR/agent.log"

echo "Starting AI News Agent..."
nohup $PYTHON "$SCRIPT_DIR/agent.py" > "$LOG_FILE" 2>&1 &
AGENT_PID=$!
echo "PID: $AGENT_PID"
echo $AGENT_PID > "$SCRIPT_DIR/agent.pid"

# Wait for it to be ready
echo "Waiting for agent to start..."
for i in $(seq 1 15); do
  sleep 1
  if curl -s http://localhost:8001/health > /dev/null 2>&1; then
    echo "Agent is up!"
    break
  fi
done

# Register in the dashboard (ignore if already exists)
curl -s -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AI News Agent",
    "type": "http",
    "url": "http://localhost:8001/health",
    "description": "Fetches latest AI news from 10+ sources every 30 min — models, research, industry"
  }' > /dev/null && echo "Registered in dashboard"

# Ping it immediately to show alive status
AGENT_ID=$(curl -s http://localhost:3000/api/agents | python3 -c "
import sys,json
agents = json.load(sys.stdin)
for a in agents:
    if 'AI News' in a.get('name',''):
        print(a['id'])
        break
" 2>/dev/null)

if [ -n "$AGENT_ID" ]; then
  curl -s -X POST "http://localhost:3000/api/agents/$AGENT_ID/ping" > /dev/null
  echo "Dashboard updated — agent is live"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  AI News Agent running on :8001"
echo "  News UI  → http://localhost:8001"
echo "  Health   → http://localhost:8001/health"
echo "  API docs → http://localhost:8001/docs"
echo "  Log      → $LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
