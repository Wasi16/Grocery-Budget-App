import asyncio
import csv
import re
from playwright.async_api import async_playwright
from playwright_stealth import Stealth

QUERIES = [
    "eggs",
    "full cream milk",
    "white bread",
    "chicken breast",
    "tuna can",
    "greek yogurt",
    "cheddar cheese",
    "white rice",
    "pasta",
    "rolled oats",
    "wraps",
    "olive oil",
    "butter",
    "bananas",
    "apples",
    "potatoes",
    "brown onions",
]


def clean_price(price_text: str) -> str:
    if not price_text:
        return ""
    match = re.search(r"\$?\s*([0-9]+(?:\.[0-9]{1,2})?)", price_text.replace(",", ""))
    return match.group(1) if match else ""


async def extract_price_from_tile(product):
    selectors = [
        '[data-testid="price"]',
        '[data-testid="product-price"]',
        '.price',
        '.product__price',
        '.product-price',
    ]

    for selector in selectors:
        el = await product.query_selector(selector)
        if el:
            text = (await el.inner_text()).strip()
            cleaned = clean_price(text)
            if cleaned:
                return cleaned, text

    spans = await product.query_selector_all("span")
    for span in spans:
        try:
            text = (await span.inner_text()).strip()
            if "$" in text:
                cleaned = clean_price(text)
                if cleaned:
                    return cleaned, text
        except Exception:
            continue

    return "", ""


async def extract_name_from_tile(product):
    anchor = await product.query_selector("a")
    if anchor:
        aria_label = await anchor.get_attribute("aria-label")
        if aria_label and aria_label.strip():
            return aria_label.strip()

        text = (await anchor.inner_text()).strip()
        if text:
            return text

    headings = await product.query_selector_all("h2, h3, h4, p, div")
    for el in headings:
        try:
            text = (await el.inner_text()).strip()
            if text and len(text) > 3:
                return text
        except Exception:
            continue

    return ""


async def scrape_coles():
    all_products = []

    async with Stealth().use_async(async_playwright()) as p:
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context()
        page = await context.new_page()

        for q in QUERIES:
            url = f"https://www.coles.com.au/search/products?q={q}"
            print(f"Opening: {url}")

            await page.goto(url, wait_until="domcontentloaded")
            await page.wait_for_timeout(6000)

            products = await page.query_selector_all('[data-testid="product-tile"]')
            print(f"Found {len(products)} tiles for {q}")

            for product in products:
                name = await extract_name_from_tile(product)
                price, raw_price_text = await extract_price_from_tile(product)

                if not name or not price:
                    continue

                all_products.append({
                    "search_term": q,
                    "name": name,
                    "price": price,
                    "stockcode": "",
                    "cup_price": "",
                    "cup_string": raw_price_text,
                    "package_size": "",
                    "store": "Coles"
                })

        await browser.close()

    with open("data/coles_products.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "search_term",
                "name",
                "price",
                "stockcode",
                "cup_price",
                "cup_string",
                "package_size",
                "store",
            ],
        )
        writer.writeheader()
        writer.writerows(all_products)

    print(f"Saved {len(all_products)} products to data/coles_products.csv")


if __name__ == "__main__":
    asyncio.run(scrape_coles())