import pandas as pd


BAD_WORDS = [
    "easter",
    "chocolate",
    "cadbury",
    "mini eggs",
    "creme egg",
    "caramello",
    "crunchie"
]


def load_products(csv_path="data/products.csv"):
    return pd.read_csv(csv_path)


def is_relevant_product(search_term, product_name):
    search_term = str(search_term).lower()
    product_name = str(product_name).lower()

    if search_term == "eggs":
        for bad_word in BAD_WORDS:
            if bad_word in product_name:
                return False
        return "egg" in product_name

    if search_term == "milk":
        return "milk" in product_name

    if search_term == "bread":
        return "bread" in product_name

    return search_term in product_name


def find_cheapest_products(user_items, csv_path="data/products.csv"):
    df = load_products(csv_path)

    # make sure price is numeric
    df["price"] = pd.to_numeric(df["price"], errors="coerce")
    df["cup_price"] = pd.to_numeric(df["cup_price"], errors="coerce")

    selected_products = []

    for item in user_items:
        item = item.strip().lower()

        matches = df[df["search_term"].str.lower() == item].copy()

        matches = matches[matches["name"].apply(lambda x: is_relevant_product(item, x))]

        if matches.empty:
            continue

        # choose cheapest by actual product price for now
        cheapest = matches.sort_values("price", ascending=True).iloc[0]
        selected_products.append(cheapest)

    if selected_products:
        return pd.DataFrame(selected_products)

    return pd.DataFrame(columns=df.columns)