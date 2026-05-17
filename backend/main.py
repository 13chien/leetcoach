import json
import os
import requests

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

HINTS_FILE = "hints.json"


class HintRequest(BaseModel):
    problemTitle: str
    problemText: str
    code: str
    hintLevel: int


def load_hints():
    try:
        with open(HINTS_FILE, "r") as f:
            return json.load(f)
    except:
        return {}


def save_hints(cache):
    with open(HINTS_FILE, "w") as f:
        json.dump(cache, f, indent=2)


def generate_hints_with_gemini(problem_title, problem_text):
    api_key = os.environ["GEMINI_API_KEY"]

    prompt = f"""
Generate coding interview hints for this LeetCode problem.

Problem title:
{problem_title}

Problem text:
{problem_text}

Return ONLY valid JSON:

{{
  "pattern": "...",
  "complexity": "...",
  "hints": [
    "small hint",
    "stronger hint",
    "algorithm hint",
    "final hint"
  ]
}}

Do not reveal the full solution.
"""

    response = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}",
        json={
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ]
        },
        timeout=30,
    )

    data = response.json()

    if "error" in data:
        raise Exception(data["error"])

    text = data["candidates"][0]["content"]["parts"][0]["text"]
    text = text.replace("```json", "").replace("```", "").strip()

    return json.loads(text)


@app.get("/")
def health():
    return {"status": "ok"}


@app.post("/hint")
async def generate_hint(req: HintRequest):
    cache = load_hints()
    title = req.problemTitle.lower().strip()

    if title not in cache:
        if not req.problemText or len(req.problemText.strip()) < 100:
            return {
                "hint": "I do not have enough problem context to generate reliable hints yet.",
                "source": "fallback",
                "pattern": "Unknown",
                "complexity": "Unknown"
            }

        print(f"Cache miss. Generating hints for: {title}")

        cache[title] = generate_hints_with_gemini(
            req.problemTitle,
            req.problemText
        )

        save_hints(cache)

    problem = cache[title]
    hints = problem["hints"]

    index = min(req.hintLevel - 1, len(hints) - 1)

    return {
        "hint": hints[index],
        "source": "cache",
        "pattern": problem.get("pattern", "Unknown"),
        "complexity": problem.get("complexity", "Unknown")
    }