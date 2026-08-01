import asyncio
import httpx
import json
import subprocess
import time
import os
import signal

async def main():
    print("Starting API and Agent Worker...")
    
    # Start agent-worker (port 8001)
    env = os.environ.copy()
    worker_proc = subprocess.Popen(
        ["python", "-m", "uvicorn", "app.main:app", "--port", "8001"],
        cwd="services/agent-worker",
        env=env
    )
    
    # Start api (port 8000)
    env["DATABASE_URL"] = "sqlite:///./muthirai.db"
    env["AGENT_WORKER_URL"] = "http://127.0.0.1:8001"
    api_proc = subprocess.Popen(
        ["python", "-m", "uvicorn", "app.main:app", "--port", "8000"],
        cwd="services/api",
        env=env
    )

    try:
        # Wait for both to be up
        async with httpx.AsyncClient() as client:
            for _ in range(30):
                try:
                    await client.get("http://127.0.0.1:8001/health")
                    await client.get("http://127.0.0.1:8000/health")
                    print("Services are healthy.")
                    break
                except Exception:
                    await asyncio.sleep(1)
            else:
                print("Services failed to start.")
                return

            print("Creating brand...")
            brand_payload = {
                "name": "Nike",
                "source_text": "Nike is a brand that focuses on athletic performance, inspiration, and pushing boundaries. Just do it. Our tone is motivational, bold, and active."
            }
            resp = await client.post("http://127.0.0.1:8000/brands", json=brand_payload, timeout=60.0)
            brand_data = resp.json()
            brand_id = brand_data["id"]
            print(f"Created brand: {brand_id}")

            content_tests = [
                {
                    "type": "safe_generic",
                    "text": "[safe_generic] Nike is a brand that focuses on athletic performance. Elevate your workflow with our cutting-edge solutions."
                },
                {
                    "type": "bold_off_brand",
                    "text": "[bold_off_brand] Our chaotic energy will literally explode your mind! No cap, it's wild out here in the forest."
                },
                {
                    "type": "off_brand",
                    "text": "[off_brand] Elevate your workflow with our cutting-edge solutions. Best-in-class platform for modern teams."
                },
                {
                    "type": "on_brand",
                    "text": "[on_brand] Push your limits. Every run is a chance to break boundaries and find your true athletic potential. Just do it."
                }
            ]

            results = []
            demo_notes = f"# Demo Fallback Data\n\n**Brand ID**: {brand_id}\n\n"

            for test in content_tests:
                print(f"Scoring: {test['type']}...")
                resp = await client.post(f"http://127.0.0.1:8000/brands/{brand_id}/score", json={"content": test["text"], "modality": "text"}, timeout=60.0)
                score_data = resp.json()
                print(f"Got quadrant: {score_data['quadrant']} (c: {score_data['consistency_score']:.2f}, d: {score_data['distinctiveness_score']:.2f})")
                
                # Fetch full trace for the fallback
                trace_resp = await client.get(f"http://127.0.0.1:8000/brands/{brand_id}/trace/{score_data['content_id']}")
                trace_data = trace_resp.json()
                
                results.append({
                    "target_quadrant": test["type"],
                    "actual_quadrant": score_data["quadrant"],
                    "score_result": score_data,
                    "agent_trace": trace_data,
                    "original_text": test["text"]
                })
                
                demo_notes += f"## {test['type']} ({score_data['quadrant']})\n"
                demo_notes += f"- Content ID: {score_data['content_id']}\n"
                demo_notes += f"- Text: {test['text']}\n\n"

            with open("frontend/src/lib/fallback-results.json", "w") as f:
                json.dump(results, f, indent=2)
                
            with open("demo-notes.md", "w") as f:
                f.write(demo_notes)
                
            print("Successfully saved fallback results.")
    finally:
        api_proc.terminate()
        worker_proc.terminate()
        api_proc.wait()
        worker_proc.wait()

if __name__ == "__main__":
    asyncio.run(main())
