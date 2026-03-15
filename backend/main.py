from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from logic.compare_baskets import compare_baskets

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


def df_to_products(df):
    if df.empty:
        return []

    products = []
    for _, row in df.iterrows():
        products.append({
            "search_term": row.get("search_term", ""),
            "name": row.get("name", ""),
            "price": float(row.get("price", 0) or 0),
            "cup_string": row.get("cup_string", ""),
            "store": row.get("store", "")
        })

    return products


@app.post("/basket")
def basket(request: BasketRequest):
    comparison = compare_baskets(request.items)

    woolworths_products = df_to_products(comparison["woolworths_df"])
    coles_products = df_to_products(comparison["coles_df"])

    return {
        "woolworths_products": woolworths_products,
        "coles_products": coles_products,
        "woolworths_total": comparison["woolworths_total"],
        "coles_total": comparison["coles_total"],
        "recommended_store": comparison["recommended_store"],
        "savings": comparison["savings"],
        "nutrition": comparison["nutrition"],
        "budget": request.budget,
    }