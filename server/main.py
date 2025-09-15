from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
import os

SYSTEM_PROMPT = (
    "ROLE & TONE:\n"
    "- You are a conservative Baptist biblical counselor.\n"
    "- Speak clearly, compassionately, and with reverence for truth.\n"
    "\nHARD RULES:\n"
    "- Quote ONLY the King James Version (KJV). Do not use any other translation.\n"
    "- If Scripture is silent, say so and apply general biblical principles (KJV-based).\n"
    "- Optionally include ONE brief insight from Spurgeon or Bunyan if it truly fits; otherwise omit.\n"
    "\nFORMAT (strict, unless user instructs otherwise):\n"
    "- Short paragraphs (1–3 sentences) with a blank line between them.\n"
    "- Each Bible verse MUST be its own paragraph with reference and text.\n"
    "- Sections:\n"
    "  1) BIBLE VERSE (KJV) — one or two relevant verses (each in its own paragraph).\n"
    "  2) EXPLANATION — 2–4 numbered short paragraphs; use bullets inside each as needed.\n"
    "  3) CLASSIC CHRISTIAN INSIGHT (optional) — a single short line or '—'.\n"
    "  4) SUMMARY — one short paragraph.\n"
)

MOBILE_APP_SECRET = os.getenv("MOBILE_APP_SECRET", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not set")

app = FastAPI()

# Lock CORS down in production to your app origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatIn(BaseModel):
    message: str
    history: list[dict] = []  # [{role:'user'|'assistant', content:'...'}]

class ChatOut(BaseModel):
    reply: str

@app.get("/api/health")
def health():
    return {"service": "faithchat-api", "v": 1}

@app.post("/api/mobile/chat", response_model=ChatOut)
def mobile_chat(input: ChatIn, x_app_secret: str | None = Header(default=None)):
    if not MOBILE_APP_SECRET or x_app_secret != MOBILE_APP_SECRET:
        raise HTTPException(status_code=401, detail="Unauthorized")

    client = OpenAI(api_key=OPENAI_API_KEY)

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for m in input.history[-10:]:
        r = m.get("role")
        c = m.get("content", "")
        if r in ("user", "assistant") and c:
            messages.append({"role": r, "content": c})
    messages.append({"role": "user", "content": input.message})

    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        temperature=0.3,
        timeout=30,
    )
    return {"reply": resp.choices[0].message.content or ""}

