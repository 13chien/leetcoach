import os
import json
import requests

PROBLEMS = [
    "two sum",
    "valid parentheses",
    "best time to buy and sell stock",
    "contains duplicate",
    "maximum subarray",
    "product of array except self",
    "maximum product subarray",
    "find minimum in rotated sorted array",
    "search in rotated sorted array",
    "3sum",
    "container with most water",
    "climbing stairs",
    "coin change",
    "longest increasing subsequence",
    "longest common subsequence",
    "word break",
    "combination sum",
    "house robber",
    "house robber ii",
    "decode ways",
    "unique paths",
    "jump game",
    "merge intervals",
    "insert interval",
    "non-overlapping intervals",
    "number of islands",
    "clone graph",
    "course schedule",
    "pacific atlantic water flow",
    "longest consecutive sequence"
]

HINTS_FILE = "hints.json"


def load_existing_cache():
    try:
        with open(HINTS_FILE, "r") as f:
            return json.load(f)
    except:
        return {}


def generate_hints(problem_title):
    prompt = f"""
Generate coding interview coaching data for this LeetCode problem:

{problem_title}

Return ONLY valid JSON:

{{
  "pattern": "...",
  "complexity": "...",
  "hints": [
    "small hint",
    "stronger hint",
    "algorithm hint",
    "final hint"
  ],
  "scaffold": "Java code skeleton with TODO comments. Do not include the full solution."
}}

Rules:
- Do NOT provide the complete working solution.
- Scaffold should guide the user structurally.
- Scaffold should contain TODO comments.
- Keep hints concise.
"""

    api_key = os.environ["GEMINI_API_KEY"]

    response = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}",
        json={
            "contents": [
                {
                    "parts": [
                        {
                            "text": prompt
                        }
                    ]
                }
            ]
        },
        timeout=30,
        verify=False
    )

    data = response.json()

    if "error" in data:
        raise Exception(data["error"])

    text = data["candidates"][0]["content"]["parts"][0]["text"]

    text = (
        text
        .replace("```json", "")
        .replace("```", "")
        .strip()
    )

    return json.loads(text)


def save_cache(cache):
    with open(HINTS_FILE, "w") as f:
        json.dump(cache, f, indent=2)


def main():
    cache = load_existing_cache()

    for problem in PROBLEMS:

        if problem in cache:
            print(f"Skipping: {problem}")
            continue

        print(f"Generating: {problem}")

        try:
            cache[problem] = generate_hints(problem)

            save_cache(cache)

            print(f"Saved: {problem}")

        except Exception as e:
            print(f"Failed: {problem}")
            print(e)

    print("Done. hints.json updated.")


if __name__ == "__main__":
    main()