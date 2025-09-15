from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers.mobile import router as mobile_router

app = FastAPI()

# relax CORS for testing; tighten later
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # set your app domain(s) in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {"ok": True}

app.include_router(mobile_router, prefix="/api")
