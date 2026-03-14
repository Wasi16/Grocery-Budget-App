import streamlit as st
from logic.cheapest_picker import find_cheapest_products

st.set_page_config(
    page_title="GrocerySmart",
    page_icon="🛒",
    layout="wide"
)

# -----------------------------
# Session state
# -----------------------------
if "grocery_items" not in st.session_state:
    st.session_state.grocery_items = []

if "item_input" not in st.session_state:
    st.session_state.item_input = ""

# -----------------------------
# Lightweight custom styling
# -----------------------------
st.markdown("""
<style>
    .main {
        background-color: #f7f8fc;
    }

    .block-container {
        padding-top: 2rem;
        padding-bottom: 2rem;
        max-width: 1200px;
    }

    h1, h2, h3 {
        color: #111827;
    }

    .subtitle {
        color: #6b7280;
        font-size: 1rem;
        margin-bottom: 1.25rem;
    }

    .section-label {
        font-size: 1.05rem;
        font-weight: 700;
        color: #111827;
        margin-bottom: 0.6rem;
    }

    .item-chip {
        display: inline-block;
        padding: 0.38rem 0.78rem;
        margin: 0.2rem 0.3rem 0.2rem 0;
        background: #eef2ff;
        color: #3730a3;
        border-radius: 999px;
        font-size: 0.9rem;
        font-weight: 600;
    }

    .receipt-line {
        padding: 0.45rem 0;
        border-bottom: 1px solid #eef2f7;
        color: #111827;
    }

    .small-muted {
        color: #6b7280;
        font-size: 0.92rem;
    }

    .summary-card {
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        padding: 1rem 1rem 0.6rem 1rem;
        margin-bottom: 1rem;
        box-shadow: 0 2px 10px rgba(0,0,0,0.04);
    }
</style>
""", unsafe_allow_html=True)

# -----------------------------
# Helper functions
# -----------------------------
def add_item():
    item = st.session_state.item_input.strip()
    if item:
        st.session_state.grocery_items.append(item)
    st.session_state.item_input = ""


def clear_items():
    st.session_state.grocery_items = []
    st.session_state.item_input = ""


# -----------------------------
# Header
# -----------------------------
st.title("🛒 GrocerySmart")
st.markdown(
    '<div class="subtitle">Find the cheapest matching Woolworths products and view estimated nutrition totals.</div>',
    unsafe_allow_html=True
)

# -----------------------------
# Top controls row
# -----------------------------
top_left, top_right = st.columns([1, 1.6], gap="large")

with top_left:
    st.markdown('<div class="section-label">Budget</div>', unsafe_allow_html=True)
    budget = st.number_input(
        "Budget",
        min_value=0.0,
        step=1.0,
        value=25.0,
        label_visibility="collapsed"
    )

with top_right:
    st.markdown('<div class="section-label">Add Grocery Items</div>', unsafe_allow_html=True)

    input_col, add_col = st.columns([5, 1])
    with input_col:
        st.text_input(
            "Add item",
            key="item_input",
            placeholder="e.g. eggs, bananas, milk",
            label_visibility="collapsed"
        )
    with add_col:
        st.button("Add", on_click=add_item, use_container_width=True)

    st.markdown('<div class="small-muted">Current grocery list</div>', unsafe_allow_html=True)

    if st.session_state.grocery_items:
        chips_html = "".join(
            [f'<span class="item-chip">{item}</span>' for item in st.session_state.grocery_items]
        )
        st.markdown(chips_html, unsafe_allow_html=True)
    else:
        st.markdown('<div class="small-muted">No items added yet.</div>', unsafe_allow_html=True)

    action_col1, action_col2 = st.columns(2)
    with action_col1:
        find_clicked = st.button("Find Cheapest Basket", use_container_width=True)
    with action_col2:
        st.button("Clear List", on_click=clear_items, use_container_width=True)

st.markdown("<br>", unsafe_allow_html=True)

# -----------------------------
# Main result area
# -----------------------------
if find_clicked:
    if not st.session_state.grocery_items:
        st.warning("Please add at least one grocery item first.")
    else:
        result_df = find_cheapest_products(st.session_state.grocery_items)

        if result_df.empty:
            st.warning("No matching grocery products found.")
        else:
            total_price = result_df["price"].sum()

            total_calories = result_df["calories_kcal"].fillna(0).sum()
            total_protein = result_df["protein_g"].fillna(0).sum()
            total_carbs = result_df["carbs_g"].fillna(0).sum()
            total_fat = result_df["fat_g"].fillna(0).sum()
            total_fibre = result_df["fibre_g"].fillna(0).sum()

            main_col, side_col = st.columns([2.2, 1], gap="large")

            with main_col:
                st.markdown('<div class="summary-card">', unsafe_allow_html=True)
                st.markdown('<div class="section-label">Basket Summary</div>', unsafe_allow_html=True)

                metric_col1, metric_col2 = st.columns(2)
                with metric_col1:
                    st.metric("Items Compared", len(result_df))
                with metric_col2:
                    st.metric("Woolworths Total", f"${total_price:.2f}")
                st.markdown('</div>', unsafe_allow_html=True)

                st.markdown('<div class="summary-card">', unsafe_allow_html=True)
                st.markdown('<div class="section-label">Selected Products</div>', unsafe_allow_html=True)

                table = result_df[[
                    "search_term",
                    "name",
                    "price",
                    "cup_string"
                ]].rename(columns={
                    "search_term": "Requested Item",
                    "name": "Selected Product",
                    "price": "Price ($)",
                    "cup_string": "Unit Price"
                })

                st.dataframe(table, use_container_width=True, hide_index=True)
                st.markdown('</div>', unsafe_allow_html=True)

                st.markdown('<div class="summary-card">', unsafe_allow_html=True)
                st.markdown('<div class="section-label">Receipt</div>', unsafe_allow_html=True)

                for _, row in result_df.iterrows():
                    st.markdown(
                        f'<div class="receipt-line"><strong>{row["search_term"].title()}</strong>: {row["name"]} — ${row["price"]:.2f}</div>',
                        unsafe_allow_html=True
                    )

                st.markdown("<br>", unsafe_allow_html=True)
                st.markdown(f"### Total: ${total_price:.2f}")

                if total_price <= budget:
                    st.success(f"Under budget by ${budget - total_price:.2f}")
                else:
                    st.error(f"Over budget by ${total_price - budget:.2f}")

                st.markdown('</div>', unsafe_allow_html=True)

            with side_col:
                st.markdown('<div class="summary-card">', unsafe_allow_html=True)
                st.markdown('<div class="section-label">Nutrition Summary</div>', unsafe_allow_html=True)

                n1, n2 = st.columns(2)
                with n1:
                    st.metric("Calories", f"{total_calories:.0f} kcal")
                    st.metric("Protein", f"{total_protein:.1f} g")
                    st.metric("Fibre", f"{total_fibre:.1f} g")
                with n2:
                    st.metric("Carbs", f"{total_carbs:.1f} g")
                    st.metric("Fat", f"{total_fat:.1f} g")

                st.caption("Estimated values based on category-level nutrition lookup.")
                st.markdown('</div>', unsafe_allow_html=True)

                st.markdown('<div class="summary-card">', unsafe_allow_html=True)
                st.markdown('<div class="section-label">Your List</div>', unsafe_allow_html=True)

                for item in st.session_state.grocery_items:
                    st.write(f"• {item}")

                st.markdown('</div>', unsafe_allow_html=True)