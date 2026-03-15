import json
import re
from ollama import Client

ALLOWED_INGREDIENTS = [
    "eggs",
    "milk",
    "bread",
    "bananas",
    "apples",
    "potatoes",
    "onions",
    "chicken breast",
    "tuna",
    "rice",
    "pasta",
    "oats",
    "yogurt",
    "cheese",
    "butter",
    "olive oil",
    "wraps",
]

SYSTEM_PROMPT = f"""
You are a recipe assistant inside a grocery shopping app.

You are a REAL recipe assistant, but you must stay constrained to the allowed ingredients.
Do NOT act like a nutrition coach.
Do NOT write long explanations.
Do NOT suggest ingredients outside the allowed list.

Allowed ingredients:
{", ".join(ALLOWED_INGREDIENTS)}

Your job:
- Understand what meal the user wants
- Suggest the closest simple recipe possible using ONLY allowed ingredients
- If the user asks for something impossible, suggest the closest available version
- Keep it short, practical, and useful
- Return STRICT JSON only
- Do not include markdown
- Do not include any text before or after the JSON

Return EXACTLY this JSON structure:
{{
  "title": "short recipe title",
  "reply": "1-2 short sentences only",
  "ingredients": ["ingredient 1", "ingredient 2", "ingredient 3"],
  "steps": ["step 1", "step 2", "step 3", "step 4"]
}}

Rules:
- Every ingredient must exactly match one of the allowed ingredients
- Use between 2 and 6 ingredients
- Keep steps short and simple
- If the requested meal is not possible, suggest the closest simple version using the allowed ingredients
- Example: burger may become a chicken wrap or cheesy bread if burger ingredients are unavailable
- Pizza may become cheesy wraps or pizza-style toast if sauce/dough are unavailable
- Never output invalid JSON
"""

client = Client(host="http://localhost:11434")


def extract_json_object(text: str):
    text = text.strip()

    try:
        return json.loads(text)
    except Exception:
        pass

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        return json.loads(match.group(0))

    raise ValueError("No valid JSON object found")


def fallback_recipe(user_message: str):
    text = user_message.lower()

    if "pizza" in text:
        return {
            "title": "Simple cheesy pizza wraps",
            "reply": "A quick pizza-style idea is cheesy wraps toasted until crisp.",
            "ingredients": ["wraps", "cheese", "olive oil"],
            "steps": [
                "Lay out the wraps.",
                "Add cheese on top.",
                "Drizzle a little olive oil.",
                "Toast until warm and slightly crisp."
            ]
        }

    if "burger" in text:
        return {
            "title": "Simple chicken wrap",
            "reply": "A true burger is not possible with your current ingredients, so this is the closest simple option.",
            "ingredients": ["chicken breast", "wraps", "cheese", "onions"],
            "steps": [
                "Cook the chicken breast.",
                "Warm the wraps.",
                "Add chicken, onions, and cheese.",
                "Fold and serve."
            ]
        }

    if "pasta" in text:
        return {
            "title": "Simple cheese pasta",
            "reply": "A quick pasta option is cheese pasta with onions and olive oil.",
            "ingredients": ["pasta", "cheese", "onions", "olive oil"],
            "steps": [
                "Boil the pasta.",
                "Cook onions in olive oil.",
                "Mix pasta with onions.",
                "Add cheese and serve."
            ]
        }

    if "breakfast" in text:
        return {
            "title": "Egg and cheese wraps",
            "reply": "A simple breakfast option is egg and cheese wraps.",
            "ingredients": ["eggs", "cheese", "wraps", "butter"],
            "steps": [
                "Heat a little butter in a pan.",
                "Cook the eggs.",
                "Warm the wraps.",
                "Add eggs and cheese to the wraps and fold."
            ]
        }

    if "protein" in text or "gym" in text or "dinner" in text:
        return {
            "title": "Chicken rice bowl",
            "reply": "A simple high-protein meal is a chicken rice bowl.",
            "ingredients": ["chicken breast", "rice", "onions", "olive oil"],
            "steps": [
                "Cook the rice.",
                "Cook the chicken breast in olive oil.",
                "Cook the onions until soft.",
                "Serve the chicken and onions over rice."
            ]
        }

    return {
        "title": "Tuna pasta",
        "reply": "A simple meal idea is tuna pasta.",
        "ingredients": ["tuna", "pasta", "onions", "olive oil"],
        "steps": [
            "Boil the pasta.",
            "Cook onions in olive oil.",
            "Add tuna and heat through.",
            "Mix everything together and serve."
        ]
    }


def build_recipe_response(user_message: str, model: str = "phi3"):
    try:
        response = client.chat(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            options={
                "temperature": 0.2,
                "num_predict": 220,
            },
        )

        content = response["message"]["content"].strip()
        data = extract_json_object(content)

        if not isinstance(data, dict):
            raise ValueError("Model output was not a JSON object")

        title = str(data.get("title", "")).strip()
        reply = str(data.get("reply", "")).strip()
        ingredients = data.get("ingredients", [])
        steps = data.get("steps", [])

        if not title or not reply:
            raise ValueError("Missing title or reply")

        if not isinstance(ingredients, list) or not isinstance(steps, list):
            raise ValueError("Ingredients or steps missing")

        cleaned_ingredients = []
        for ingredient in ingredients:
            ing = str(ingredient).strip().lower()
            if ing in ALLOWED_INGREDIENTS and ing not in cleaned_ingredients:
                cleaned_ingredients.append(ing)

        cleaned_steps = [str(step).strip() for step in steps if str(step).strip()]

        if not cleaned_ingredients or not cleaned_steps:
            raise ValueError("No valid ingredients or steps returned")

        return {
            "title": title,
            "reply": reply,
            "ingredients": cleaned_ingredients[:6],
            "steps": cleaned_steps[:6],
        }

    except Exception:
        return fallback_recipe(user_message)