# Test Credentials

No authentication is required for this app. The Synapse AI News Terminal is a read-only public news aggregator.

## Endpoints
- Public preview URL: https://77d81783-0264-4c3b-a3c7-7b1a67f1db4c.preview.emergentagent.com/
- Backend API base: `/api`

## API Endpoints (all public, no auth)
- GET  /api/health
- GET  /api/news        (?category=, ?source=, ?q=, ?limit=)
- GET  /api/sources
- POST /api/refresh

## LocalStorage state
- `ai-news:saved` — JSON array of saved article IDs (per-device)
