from playwright.sync_api import sync_playwright
import pandas as pd
from urllib.parse import quote


def extract_products_from_response(data, search_term):
    products = []

    for tile in data.get("Products", []):
        for product in tile.get("Products", []):
            products.append({
                "search_term": search_term,
                "name": product.get("DisplayName", ""),
                "price": product.get("Price", ""),
                "stockcode": product.get("Stockcode", ""),
                "cup_price": product.get("CupPrice", ""),
                "cup_string": product.get("CupString", ""),
                "package_size": product.get("PackageSize", ""),
                "store": "Woolworths"
            })

    return products


def scrape_products(search_term):
    search_url = f"https://www.woolworths.com.au/shop/search/products?searchTerm={quote(search_term)}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()

        print(f"Opening browser for: {search_term}")

        with page.expect_response(
            lambda response: "/apis/ui/Search/products" in response.url and response.request.method == "POST",
            timeout=30000
        ) as response_info:
            page.goto(search_url, wait_until="domcontentloaded")

        response = response_info.value
        data = response.json()

        browser.close()

    return extract_products_from_response(data, search_term)


def save_products():
    all_products = []

    for item in ["eggs", "milk", "bread"]:
        print(f"Searching: {item}")
        results = scrape_products(item)
        print(f"Found {len(results)} products for {item}")
        all_products.extend(results)

    df = pd.DataFrame(all_products)
    df.to_csv("data/products.csv", index=False)

    print(f"Saved {len(df)} products to data/products.csv")


if __name__ == "__main__":
    save_products()