import streamlit as st
from logic.cheapest_picker import find_cheapest_products

st.set_page_config(page_title="Grocery Budget App", page_icon="🛒")

st.title("🛒 Grocery Budget App")
st.write("Enter your budget and grocery items, and we'll find the cheapest matching products.")

budget = st.number_input("Enter your budget ($)", min_value=0.0, step=1.0)

items_text = st.text_area(
    "Enter grocery items separated by commas",
    placeholder="eggs, milk, bread"
)

if st.button("Find Cheapest Basket"):
    user_items = [item.strip() for item in items_text.split(",") if item.strip()]

    result_df = find_cheapest_products(user_items)

    if result_df.empty:
        st.warning("No matching grocery products found.")
    else:
        st.subheader("Selected Products")
        st.dataframe(result_df[["search_term", "name", "price", "cup_string", "store"]])

        total = result_df["price"].sum()

        st.subheader("Receipt")
        for _, row in result_df.iterrows():
            st.write(f"{row['search_term'].title()}: {row['name']} — ${row['price']:.2f}")

        st.write("---")
        st.write(f"**Total: ${total:.2f}**")

        if total <= budget:
            st.success(f"Under budget by ${budget - total:.2f}")
        else:
            st.error(f"Over budget by ${total - budget:.2f}")