import pandas as pd
from logic.cheapest_picker import normalize_item, relevance_score, load_nutrition


def load_store_products(csv_path):
    df = pd.read_csv(csv_path)

    df["search_term"] = df["search_term"].astype(str).str.strip().str.lower()
    df["name"] = df["name"].astype(str)
    df["price"] = pd.to_numeric(df["price"], errors="coerce")

    if "cup_price" in df.columns:
        df["cup_price"] = pd.to_numeric(df["cup_price"], errors="coerce")
    else:
        df["cup_price"] = pd.NA

    if "cup_string" not in df.columns:
        df["cup_string"] = ""

    if "package_size" not in df.columns:
        df["package_size"] = ""

    return df


def find_store_basket(user_items, products_csv, store_name, nutrition_csv="data/nutrition_lookup.csv"):
    df = load_store_products(products_csv)
    nutrition_df = load_nutrition(nutrition_csv)

    nutrition_df["search_term"] = nutrition_df["search_term"].astype(str).str.strip().str.lower()

    selected_products = []
    normalized_items = []

    for raw_item in user_items:
        item = normalize_item(raw_item)

        if item in normalized_items:
            continue
        normalized_items.append(item)

        matches = df[df["search_term"] == item].copy()

        if matches.empty:
            continue

        matches["relevance"] = matches["name"].apply(lambda x: relevance_score(item, x))
        matches = matches[matches["relevance"] > 0]

        if matches.empty:
            continue

        # Use cup_price when available for fairer comparison, otherwise fall back to price
        matches["comparison_price"] = matches["cup_price"].fillna(matches["price"])

        matches = matches.sort_values(
            by=["relevance", "comparison_price", "price"],
            ascending=[False, True, True]
        )

        best_match = matches.iloc[0].copy()
        best_match["store"] = store_name
        selected_products.append(best_match)

    if not selected_products:
        empty_nutrition = {
            "calories_kcal": 0.0,
            "protein_g": 0.0,
            "carbs_g": 0.0,
            "fat_g": 0.0,
            "fibre_g": 0.0,
        }
        return pd.DataFrame(), empty_nutrition

    result_df = pd.DataFrame(selected_products)

    result_df = result_df.merge(
        nutrition_df,
        how="left",
        on="search_term"
    )

    nutrition = {
        "calories_kcal": float(result_df["calories_kcal"].fillna(0).sum()),
        "protein_g": float(result_df["protein_g"].fillna(0).sum()),
        "carbs_g": float(result_df["carbs_g"].fillna(0).sum()),
        "fat_g": float(result_df["fat_g"].fillna(0).sum()),
        "fibre_g": float(result_df["fibre_g"].fillna(0).sum()),
    }

    return result_df, nutrition


def compare_baskets(
    user_items,
    woolworths_csv="data/products.csv",
    coles_csv="data/coles_products.csv",
    nutrition_csv="data/nutrition_lookup.csv"
):
    woolworths_df, woolworths_nutrition = find_store_basket(
        user_items=user_items,
        products_csv=woolworths_csv,
        store_name="Woolworths",
        nutrition_csv=nutrition_csv
    )

    coles_df, coles_nutrition = find_store_basket(
        user_items=user_items,
        products_csv=coles_csv,
        store_name="Coles",
        nutrition_csv=nutrition_csv
    )

    woolworths_total = float(woolworths_df["price"].fillna(0).sum()) if not woolworths_df.empty else 0.0
    coles_total = float(coles_df["price"].fillna(0).sum()) if not coles_df.empty else 0.0

    if woolworths_total == 0 and coles_total == 0:
        recommended_store = "No data"
        savings = 0.0
        chosen_nutrition = {
            "calories_kcal": 0.0,
            "protein_g": 0.0,
            "carbs_g": 0.0,
            "fat_g": 0.0,
            "fibre_g": 0.0,
        }
    elif coles_total == 0:
        recommended_store = "Woolworths"
        savings = 0.0
        chosen_nutrition = woolworths_nutrition
    elif woolworths_total == 0:
        recommended_store = "Coles"
        savings = 0.0
        chosen_nutrition = coles_nutrition
    elif woolworths_total < coles_total:
        recommended_store = "Woolworths"
        savings = round(coles_total - woolworths_total, 2)
        chosen_nutrition = woolworths_nutrition
    elif coles_total < woolworths_total:
        recommended_store = "Coles"
        savings = round(woolworths_total - coles_total, 2)
        chosen_nutrition = coles_nutrition
    else:
        recommended_store = "Tie"
        savings = 0.0
        chosen_nutrition = woolworths_nutrition

    return {
        "woolworths_df": woolworths_df,
        "coles_df": coles_df,
        "woolworths_total": woolworths_total,
        "coles_total": coles_total,
        "recommended_store": recommended_store,
        "savings": savings,
        "nutrition": chosen_nutrition,
    }