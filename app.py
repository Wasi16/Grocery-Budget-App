import streamlit as st
from logic.cheapest_picker import find_cheapest_products

st.set_page_config(page_title="GrocerySmart", page_icon="🛒", layout="wide")

st.title("🛒 GrocerySmart")
st.write("Enter your budget and grocery items. We'll find the cheapest matching Woolworths products and show nutrition totals.")

budget = st.number_input("Enter your budget ($)", min_value=0.0, step=1.0)

items_text = st.text_area(
    "Enter grocery items separated by commas",
    placeholder="eggs, milk, bread, chicken breast, rice, bananas"
)

if st.button("Find Cheapest Basket"):
    user_items = [item.strip() for item in items_text.split(",") if item.strip()]
    result_df = find_cheapest_products(user_items)

    if result_df.empty:
        st.warning("No matching grocery products found.")
    else:
        total_price = result_df["price"].sum()

        total_calories = result_df["calories_kcal"].fillna(0).sum()
        total_protein = result_df["protein_g"].fillna(0).sum()
        total_carbs = result_df["carbs_g"].fillna(0).sum()
        total_fat = result_df["fat_g"].fillna(0).sum()
        total_fibre = result_df["fibre_g"].fillna(0).sum()

        col1, col2 = st.columns([2, 1])

        with col1:
            st.subheader("Basket Summary")

            c1, c2 = st.columns(2)

            with c1:
                st.metric("Items Compared", len(result_df))

            with c2:
                st.metric("Woolworths Total", f"${total_price:.2f}")
            
            st.subheader("Selected Products")
            table = result_df[[
                "name",
                "price",
                "cup_string"
            ]].rename(columns={
                "name": "Product",
                "price": "Price ($)",
                "cup_string": "Unit Price"
            })

            st.dataframe(table, use_container_width=True)
            

            st.subheader("Receipt")
            for _, row in result_df.iterrows():
                st.write(f"{row['search_term'].title()}: {row['name']} — ${row['price']:.2f}")

            st.write("---")
            st.write(f"**Total: ${total_price:.2f}**")

            if total_price <= budget:
                st.success(f"Under budget by ${budget - total_price:.2f}")
            else:
                st.error(f"Over budget by ${total_price - budget:.2f}")

        with col2:
            st.subheader("Nutrition Summary")

            n1, n2 = st.columns(2)

            with n1:
                st.metric("Calories", f"{total_calories:.0f} kcal")
                st.metric("Protein", f"{total_protein:.1f} g")
                st.metric("Fibre", f"{total_fibre:.1f} g")

            with n2:
                st.metric("Carbs", f"{total_carbs:.1f} g")
                st.metric("Fat", f"{total_fat:.1f} g")

            st.caption("Estimated values based on food category.")