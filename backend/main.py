from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from logic.cheapest_picker import find_cheapest_products

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class BasketRequest(BaseModel):
    items: List[str]
    budget: float


@app.get("/")
def root():
    return {"message": "GrocerySmart API running"}


@app.post("/basket")
def basket(request: BasketRequest):

    result_df = find_cheapest_products(request.items)

    if result_df.empty:
        return {
            "products": [],
            "total_price": 0,
            "nutrition": {
                "calories_kcal": 0,
                "protein_g": 0,
                "carbs_g": 0,
                "fat_g": 0,
                "fibre_g": 0,
            }
        }

    total_price = float(result_df["price"].sum())

    nutrition = {
        "calories_kcal": float(result_df["calories_kcal"].fillna(0).sum()),
        "protein_g": float(result_df["protein_g"].fillna(0).sum()),
        "carbs_g": float(result_df["carbs_g"].fillna(0).sum()),
        "fat_g": float(result_df["fat_g"].fillna(0).sum()),
        "fibre_g": float(result_df["fibre_g"].fillna(0).sum()),
    }

    products = []

    for _, row in result_df.iterrows():
        products.append({
            "search_term": row["search_term"],
            "name": row["name"],
            "price": float(row["price"]),
            "cup_string": row["cup_string"]
        })

    return {
        "products": products,
        "total_price": total_price,
        "nutrition": nutrition
    }