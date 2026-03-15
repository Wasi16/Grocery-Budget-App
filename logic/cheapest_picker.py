import pandas as pd

ALIASES = {
    "milk": "full cream milk",
    "bread": "white bread",
    "rice": "white rice",
    "yogurt": "greek yogurt",
    "cheese": "cheddar cheese",
    "tuna": "tuna can",
    "onion": "brown onions",
    "onions": "brown onions",
    "potato": "potatoes",
    "potatoes": "potatoes",
    "apple": "apples",
    "apples": "apples",
    "banana": "bananas",
    "bananas": "bananas",
    "oat": "rolled oats",
    "oats": "rolled oats",
}

ITEM_TYPES = {
    "bananas": "produce",
    "apples": "produce",
    "potatoes": "produce",
    "brown onions": "produce",

    "eggs": "protein",
    "chicken breast": "protein",
    "tuna can": "protein",

    "full cream milk": "dairy",
    "greek yogurt": "dairy",
    "cheddar cheese": "dairy",

    "white rice": "staple",
    "pasta": "staple",
    "rolled oats": "staple",
    "white bread": "staple",
    "wraps": "staple",

    "olive oil": "pantry",
    "butter": "pantry",
}

PRODUCE_POSITIVE_WORDS = {
    "fresh", "loose", "bunch", "kg", "per kg", "each", "punnet", "bag"
}

PRODUCE_NEGATIVE_WORDS = {
    "yoghurt", "yogurt", "chips", "bread", "muffin", "muffins",
    "custard", "puree", "pouch", "snack", "drink", "juice",
    "smoothie", "bar", "bars", "cereal", "baby", "prawn", "prawns",
    "sunscreen", "perfume", "chalk", "chalksters", "banana republic"
}

PROTEIN_POSITIVE_WORDS = {
    "breast", "fillet", "fillets", "dozen", "free range", "cage", "can", "canned", "tuna", "egg", "eggs", "chicken"
}

PROTEIN_NEGATIVE_WORDS = {
    "snack", "meal", "soup", "salad", "flavoured", "flavored", "dip",
    "yoghurt", "yogurt", "custard", "dessert", "chips",
    "cat", "dog", "pet", "kitten", "puppy", "bowl", "tray", "litter",
    "wet cat food", "wet dog food", "treat", "toy"
}

DAIRY_NEGATIVE_WORDS = {
    "dessert", "ice cream", "custard"
}

STAPLE_NEGATIVE_WORDS = {
    "snack", "chips", "bar", "bars", "sweet",
    "bowl", "cooker", "steamer", "container", "lamp", "scoop",
    "ricer", "rice paper", "magic", "desk", "kitchen tool", "potato ricer"
}

PANTRY_NEGATIVE_WORDS = {
    "spray bottle", "cleaner", "soap"
}


def load_products(csv_path="data/products.csv"):
    return pd.read_csv(csv_path)


def load_nutrition(csv_path="data/nutrition_lookup.csv"):
    return pd.read_csv(csv_path)


def normalize_item(item: str) -> str:
    item = str(item).strip().lower()
    return ALIASES.get(item, item)


def relevance_score(search_term: str, product_name: str) -> int:
    search_term = str(search_term).lower().strip()
    name = str(product_name).lower().strip()

    score = 0
    tokens = search_term.split()

    for token in tokens:
        if token in name:
            score += 3

    if search_term in name:
        score += 5

    item_type = ITEM_TYPES.get(search_term, "general")

    if item_type == "produce":
        for word in PRODUCE_POSITIVE_WORDS:
            if word in name:
                score += 2
        for word in PRODUCE_NEGATIVE_WORDS:
            if word in name:
                score -= 7

    elif item_type == "protein":
        for word in PROTEIN_POSITIVE_WORDS:
            if word in name:
                score += 2
        for word in PROTEIN_NEGATIVE_WORDS:
            if word in name:
                score -= 8

    elif item_type == "dairy":
        for word in DAIRY_NEGATIVE_WORDS:
            if word in name:
                score -= 6

    elif item_type == "staple":
        for word in STAPLE_NEGATIVE_WORDS:
            if word in name:
                score -= 8

    elif item_type == "pantry":
        for word in PANTRY_NEGATIVE_WORDS:
            if word in name:
                score -= 6

    if search_term == "tuna can":
        if "tuna" not in name:
            score -= 12
        if "cat" in name or "dog" in name or "pet" in name:
            score -= 20

    if search_term == "white rice":
        if "rice" not in name:
            score -= 12
        if any(bad in name for bad in ["bowl", "cooker", "steamer", "container", "lamp", "ricer"]):
            score -= 20

    if search_term == "bananas":
        if any(bad in name for bad in ["prawn", "perfume", "sunscreen"]):
            score -= 20

    if not any(token in name for token in tokens):
        score -= 15

    return score


def find_cheapest_products(
    user_items,
    products_csv="data/products.csv",
    nutrition_csv="data/nutrition_lookup.csv"
):
    df = load_products(products_csv)
    nutrition_df = load_nutrition(nutrition_csv)

    df["search_term"] = df["search_term"].astype(str).str.strip().str.lower()
    df["name"] = df["name"].astype(str)
    df["price"] = pd.to_numeric(df["price"], errors="coerce")
    df["cup_price"] = pd.to_numeric(df.get("cup_price", None), errors="coerce")

    selected_products = []

    for item in user_items:
        item = normalize_item(item)

        matches = df[df["search_term"] == item].copy()

        if matches.empty:
            continue

        matches["relevance"] = matches["name"].apply(lambda x: relevance_score(item, x))
        matches = matches[matches["relevance"] > 0]

        if matches.empty:
            continue

        matches["comparison_price"] = matches["cup_price"].fillna(matches["price"])

        matches = matches.sort_values(
            by=["relevance", "comparison_price", "price"],
            ascending=[False, True, True]
        )

        best_match = matches.iloc[0]
        selected_products.append(best_match)

    if not selected_products:
        return pd.DataFrame()

    result_df = pd.DataFrame(selected_products)

    result_df = result_df.merge(
        nutrition_df,
        how="left",
        on="search_term"
    )

    return result_df