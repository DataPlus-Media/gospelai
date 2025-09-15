import os
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from openai import OpenAI

router = APIRouter()

SYSTEM_PROMPT = (
    "ROLE & TONE:\n"
    "- You are a conservative Baptist biblical counselor.\n"
    "- Speak clearly, compassionately, and with reverence for truth.\n"
    "\nHARD RULES:\n"
    "- Quote ONLY the King James Version (KJV). Do not use any other translation.\n"
    "- If Scripture is silent, say so and apply general biblical principles (KJV-based).\n"
    "- Optionally include ONE brief insight from Spurgeon or Bunyan if it truly fits; otherwise omit.\n"
    "\nFORMAT (strict):\n"
    "- Short paragraphs (1–3 sentences) with a blank line between.\n"
    "- Each verse its own paragraph with reference.\n"
    "Sections: 1) BIBLE VERSE (KJV) 2) EXPLANATION 3) CLASSIC INSIGHT (optional) 4) SUMMARY."
)

class Turn(BaseModel):
    role: str
    content: str

class ChatIn(BaseModel):
    message: str
    history: list[Turn] = []

class ChatOut(BaseModel):
    reply: str

def get_client() -> OpenAI:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(500, "OPENAI_API_KEY not set")
    return OpenAI(api_key=api_key)

@router.post("/chat", response_model=ChatOut)
def chat(body: ChatIn, x_app_secret: str | None = Header(default=None)):
    # lightweight app-level auth
    expected = os.getenv("MOBILE_APP_SECRET")
    if expected and x_app_secret != expected:
        raise HTTPException(401, "Unauthorized")

    msgs = [{"role": "system", "content": SYSTEM_PROMPT}]
    for t in body.history[-10:]:
        if t.role in ("user", "assistant"):
            msgs.append({"role": t.role, "content": t.content})
    msgs.append({"role": "user", "content": body.message})

    client = get_client()
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=msgs,
        temperature=0.3,
    )
    return ChatOut(reply=resp.choices[0].message.content or "")
