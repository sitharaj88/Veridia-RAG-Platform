import httpx
import sys
from pathlib import Path

# Configure stdout for utf-8
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

API_URL = "http://127.0.0.1:8000/api"

print("=== Checking Health ===")
try:
    r = httpx.get(f"{API_URL}/health", timeout=5.0)
    print(r.status_code, r.json())
except Exception as e:
    print("Health check failed:", e)
    sys.exit(1)

# Find the resume PDF
pdf_files = list(Path("data/raw").glob("*.pdf"))
if not pdf_files:
    print("No PDF files found in data/raw!")
    sys.exit(1)

pdf_path = pdf_files[0]
print(f"\n=== Ingesting PDF: {pdf_path} ===")
try:
    with open(pdf_path, "rb") as f:
        files = {"files": (pdf_path.name, f, "application/pdf")}
        r = httpx.post(f"{API_URL}/ingest", files=files, timeout=120.0)
        print("Ingest status:", r.status_code)
        resp_data = r.json()
        print("Ingest response:", resp_data)
        
        task_ids = resp_data.get("task_ids", [])
        if task_ids:
            task_id = task_ids[0]
            print(f"Waiting for background task {task_id} to finish...")
            import time
            while True:
                status_r = httpx.get(f"{API_URL}/ingest/tasks/{task_id}")
                task_status = status_r.json()
                status = task_status.get("status")
                progress = task_status.get("progress")
                message = task_status.get("message")
                print(f"Status: {status} | Progress: {progress*100:.0f}% | Message: {message}")
                if status == "completed":
                    print("Ingestion completed successfully!")
                    break
                elif status == "failed":
                    print(f"Ingestion failed: {task_status.get('error')}")
                    sys.exit(1)
                time.sleep(3.0)
except Exception as e:
    print("Ingestion failed:", e)
    sys.exit(1)

print("\n=== Listing Documents ===")
try:
    r = httpx.get(f"{API_URL}/documents")
    print(r.status_code, r.json())
except Exception as e:
    print("List documents failed:", e)

print("\n=== Querying RAG (naive strategy) ===")
try:
    payload = {
        "query": "What is Sitharaj Seenivasan's experience and what technologies does he use?",
        "strategy": "naive",
    }
    r = httpx.post(f"{API_URL}/query", json=payload, timeout=120.0)
    print("Query status:", r.status_code)
    resp = r.json()
    print("Answer:")
    print(resp.get("answer"))
    print("\nSources:")
    for src in resp.get("sources", []):
        print(f"- {src.get('filename')} (score: {src.get('relevance_score')})")
except Exception as e:
    print("Query failed:", e)
