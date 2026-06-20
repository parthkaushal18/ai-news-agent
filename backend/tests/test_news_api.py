"""Backend API tests for SYNAPSE AI News Aggregator."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
# Fallback to frontend/.env
if not BASE_URL:
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                    break
    except Exception:
        pass

API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ── Health ────────────────────────────────────────────────────────────────────
class TestHealth:
    def test_health_alive(self, client):
        r = client.get(f"{API}/health", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["status"] == "alive"
        assert isinstance(d["articles"], int)
        assert d["articles"] > 0, "Expected >0 cached articles"
        assert d["sources"] == 12
        assert "last_fetch" in d
        assert isinstance(d["next_fetch_in"], int)


# ── News listing & filters ────────────────────────────────────────────────────
class TestNewsList:
    def test_news_returns_articles(self, client):
        r = client.get(f"{API}/news?limit=120", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "articles" in d
        assert isinstance(d["articles"], list)
        assert len(d["articles"]) > 0
        # Validate article schema
        a = d["articles"][0]
        for k in ("id", "title", "summary", "url", "source", "category", "published"):
            assert k in a, f"Missing field: {k}"
        assert isinstance(a["title"], str) and len(a["title"]) > 0

    def test_filter_by_category_industry(self, client):
        r = client.get(f"{API}/news?category=Industry", timeout=15)
        assert r.status_code == 200
        articles = r.json()["articles"]
        assert len(articles) > 0
        for a in articles:
            assert a["category"].lower() == "industry"

    def test_filter_by_source_hackernews(self, client):
        r = client.get(f"{API}/news", params={"source": "Hacker News"}, timeout=15)
        assert r.status_code == 200
        articles = r.json()["articles"]
        # HN fix should yield results
        assert len(articles) > 0, "Hacker News filter returned 0 articles"
        for a in articles:
            assert a["source"] == "Hacker News"

    def test_search_query_agent(self, client):
        r = client.get(f"{API}/news", params={"q": "agent"}, timeout=15)
        assert r.status_code == 200
        articles = r.json()["articles"]
        # Should have at least a couple results
        for a in articles:
            blob = (a["title"] + " " + a["summary"] + " " + a["source"]).lower()
            assert "agent" in blob

    def test_search_case_insensitive(self, client):
        r1 = client.get(f"{API}/news", params={"q": "GPT"}, timeout=15).json()
        r2 = client.get(f"{API}/news", params={"q": "gpt"}, timeout=15).json()
        assert r1["total"] == r2["total"]


# ── Sources ───────────────────────────────────────────────────────────────────
class TestSources:
    def test_sources_payload(self, client):
        r = client.get(f"{API}/sources", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert "sources" in d and "categories" in d
        assert len(d["sources"]) >= 12
        # Hacker News should appear with count > 0
        hn = next((s for s in d["sources"] if s["name"] == "Hacker News"), None)
        assert hn is not None, "Hacker News missing from sources"
        assert hn["count"] > 0, f"Hacker News count is {hn['count']} (expected >0)"
        # categories with counts
        for c in d["categories"]:
            assert "name" in c and "count" in c


# ── Refresh ───────────────────────────────────────────────────────────────────
class TestRefresh:
    def test_refresh_triggers(self, client):
        r = client.post(f"{API}/refresh", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d.get("in_progress") is True
        assert "message" in d
