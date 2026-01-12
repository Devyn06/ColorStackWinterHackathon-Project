from fastapi import FastAPI
from pipeline import analyze_routes, RouteRequest

# Initialize FastAPI app with uvicorn app:app --reload
app = FastAPI()

@app.get("/")
def health():
    return {"status": "ok"}

@app.post("/analyze-route")
def analyze(req: RouteRequest):
    return analyze_routes(req)