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

def load_existing_cache():
    try:
        with open("hints.json", "r") as f:
            return json.load(f)
    except:
        return {}

def generate_hints(problem_title):
    prompt = f"""
Generate coding interview hints for this LeetCode problem: {problem_title}

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

Do not give full solution.
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
        timeout=30
    )

    data = response.json()

    if "error" in data:
        raise Exception(data["error"])

    text = data["candidates"][0]["content"]["parts"][0]["text"]

    text = text.replace("```json", "").replace("```", "").strip()

    return json.loads(text)

def main():
    cache = load_existing_cache()

    for problem in PROBLEMS:
        if problem in cache:
            print(f"Skipping: {problem}")
            continue

        print(f"Generating: {problem}")

        cache[problem] = generate_hints(problem)

        with open("hints.json", "w") as f:
            json.dump(cache, f, indent=2)

    print("Done. hints.json updated.")

if __name__ == "__main__":
    main()