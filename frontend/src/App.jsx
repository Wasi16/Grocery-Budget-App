import { useMemo, useState } from "react";

const SUPPORTED_ITEMS = [
  "eggs",
  "milk",
  "bread",
  "bananas",
  "apples",
  "potatoes",
  "onions",
  "chicken breast",
  "tuna",
  "rice",
  "pasta",
  "oats",
  "yogurt",
  "cheese",
  "butter",
  "olive oil",
  "wraps"
];

export default function App() {
  const [budget, setBudget] = useState("");
  const [itemInput, setItemInput] = useState("");
  const [items, setItems] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inputError, setInputError] = useState("");

  const filteredSuggestions = useMemo(() => {
    const query = itemInput.trim().toLowerCase();

    if (!query) return [];

    return SUPPORTED_ITEMS.filter((item) =>
      item.toLowerCase().includes(query)
    ).slice(0, 6);
  }, [itemInput]);

  const normalizeItem = (raw) => {
    const trimmed = raw.trim().toLowerCase();

    const exact = SUPPORTED_ITEMS.find(
      (item) => item.toLowerCase() === trimmed
    );

    if (exact) return exact;

    if (filteredSuggestions.length === 1) {
      return filteredSuggestions[0];
    }

    return null;
  };

  const addItem = () => {
    const normalized = normalizeItem(itemInput);

    if (!itemInput.trim()) return;

    if (!normalized) {
      setInputError("Please choose a valid grocery item from the supported list.");
      return;
    }

    const alreadyExists = items.some(
      (item) => item.toLowerCase() === normalized.toLowerCase()
    );

    if (alreadyExists) {
      setInputError("That item is already in your list.");
      setItemInput("");
      return;
    }

    setItems((prev) => [...prev, normalized]);
    setItemInput("");
    setInputError("");
  };

  const removeItem = (itemToRemove) => {
    setItems((prev) => prev.filter((item) => item !== itemToRemove));
  };

  const clearList = () => {
    setItems([]);
    setResult(null);
    setItemInput("");
    setBudget("");
    setInputError("");
  };

  const handleItemKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addItem();
    }
  };

  const findBasket = async () => {
    if (items.length === 0) return;

    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/basket", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          items,
          budget: Number(budget || 0)
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Error fetching basket:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectSuggestion = (suggestion) => {
    setItemInput(suggestion);
    setInputError("");
  };

  return (
    <div className="min-h-screen bg-[#F7F4D5] text-[#0A3323]">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-5xl font-bold text-[#0A3323] mb-2">GrocerySmart</h1>
        <p className="text-[#105666] mb-8 text-lg">
          Find the cheapest matching Woolworths products and view estimated nutrition totals.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel */}
          <div className="bg-[#EEE7C8] rounded-3xl p-6 shadow-sm border border-[#D9D2B5]">
            <p className="text-sm font-semibold tracking-[0.18em] text-[#105666] mb-5">
              MY GROCERY LIST
            </p>

            <div className="flex gap-3 mb-3">
              <input
                value={itemInput}
                onChange={(e) => {
                  setItemInput(e.target.value);
                  setInputError("");
                }}
                onKeyDown={handleItemKeyDown}
                placeholder="Add an item (e.g. milk, eggs...)"
                className="flex-1 rounded-full px-5 py-3 border border-[#105666] bg-[#F7F4D5] text-[#0A3323] placeholder:text-[#839958] outline-none focus:ring-2 focus:ring-[#839958]"
              />
              <button
                onClick={addItem}
                className="w-14 h-14 rounded-full bg-[#0A3323] text-[#F7F4D5] text-3xl flex items-center justify-center leading-none hover:opacity-95 transition"
                aria-label="Add item"
                type="button"
              >
                +
              </button>
            </div>

            {filteredSuggestions.length > 0 && itemInput.trim() && (
              <div className="mb-3 flex flex-wrap gap-2">
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => selectSuggestion(suggestion)}
                    className="px-3 py-1.5 rounded-full bg-white border border-[#839958] text-[#105666] text-sm hover:bg-[#F7F4D5]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}

            {inputError && (
              <p className="text-sm text-[#D3968C] mb-3 font-medium">{inputError}</p>
            )}

            <div className="flex flex-wrap gap-2 mb-6 min-h-[2.5rem]">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="bg-[#105666] text-[#F7F4D5] px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2"
                >
                  <span>{item}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(item)}
                    className="text-[#F7F4D5] hover:opacity-80"
                    aria-label={`Remove ${item}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-[#105666] mb-2">
                  Budget
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full rounded-2xl px-4 py-3 border border-[#CFC7A8] bg-white text-[#0A3323] placeholder:text-[#839958] outline-none focus:ring-2 focus:ring-[#839958]"
                />
              </div>

              <button
                onClick={findBasket}
                className="w-full bg-[#D3968C] text-[#F7F4D5] py-3.5 rounded-full font-semibold text-lg hover:opacity-95 transition"
                type="button"
              >
                {loading ? "Loading..." : "Find Cheapest Basket"}
              </button>

              <button
                onClick={clearList}
                className="w-full border border-[#839958] text-[#0A3323] py-3.5 rounded-full font-semibold text-lg bg-transparent hover:bg-[#F1EBCB] transition"
                type="button"
              >
                Clear List
              </button>
            </div>

            {result && (
              <div className="bg-[#0A3323] text-[#F7F4D5] rounded-3xl p-5">
                <p className="text-xs tracking-[0.18em] mb-4 text-[#F7F4D5]">
                  ESTIMATED NUTRIENTS IN YOUR LIST
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#105666] rounded-2xl p-4">
                    <p className="text-2xl font-bold">
                      {result.nutrition.calories_kcal.toFixed(0)}
                    </p>
                    <p className="text-xs opacity-80">Calories (kcal)</p>
                  </div>

                  <div className="bg-[#105666] rounded-2xl p-4">
                    <p className="text-2xl font-bold">
                      {result.nutrition.protein_g.toFixed(1)}g
                    </p>
                    <p className="text-xs opacity-80">Protein</p>
                  </div>

                  <div className="bg-[#105666] rounded-2xl p-4">
                    <p className="text-2xl font-bold">
                      {result.nutrition.fat_g.toFixed(1)}g
                    </p>
                    <p className="text-xs opacity-80">Fat</p>
                  </div>

                  <div className="bg-[#105666] rounded-2xl p-4">
                    <p className="text-2xl font-bold">
                      {result.nutrition.carbs_g.toFixed(1)}g
                    </p>
                    <p className="text-xs opacity-80">Carbs</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#E6DFBF] mb-6">
              <p className="text-sm font-semibold tracking-[0.18em] text-[#105666] mb-5">
                PRICE COMPARISON
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-[#F3EFE2] rounded-2xl p-5">
                  <p className="text-4xl font-bold text-[#0A3323]">
                    {result ? result.products.length : 0}
                  </p>
                  <p className="text-base text-[#105666] mt-1">Items compared</p>
                </div>

                <div className="bg-[#F3EFE2] rounded-2xl p-5">
                  <p className="text-4xl font-bold text-[#0A3323]">
                    ${result ? result.total_price.toFixed(2) : "0.00"}
                  </p>
                  <p className="text-base text-[#105666] mt-1">Woolies total</p>
                </div>

                <div className="bg-[#DCE8DF] rounded-2xl p-5">
                  <p className="text-4xl font-bold text-[#0A3323]">
                    {result
                      ? `$${Math.abs(Number(budget || 0) - result.total_price).toFixed(2)}`
                      : "$0.00"}
                  </p>
                  <p className="text-base text-[#105666] mt-1">
                    {result
                      ? result.total_price <= Number(budget || 0)
                        ? "Left in budget"
                        : "Over budget"
                      : "Budget difference"}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[#105666] text-base border-b border-[#E6DFBF]">
                      <th className="py-4 font-semibold">Item</th>
                      <th className="py-4 font-semibold">Woolies</th>
                      <th className="py-4 font-semibold">Price</th>
                      <th className="py-4 font-semibold">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result?.products?.map((product, index) => (
                      <tr key={index} className="border-b border-[#F1ECD3] last:border-b-0">
                        <td className="py-5 text-[#0A3323]">{product.search_term}</td>
                        <td className="py-5 text-[#0A3323]">{product.name}</td>
                        <td className="py-5 font-semibold text-[#0A3323]">
                          ${product.price.toFixed(2)}
                        </td>
                        <td className="py-5 text-[#105666]">{product.cup_string || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {result && (
              <div className="bg-[#F8EEE9] border border-[#D3968C] rounded-3xl p-4 text-sm text-[#105666]">
                Nutrition values are estimated from category-level lookup data.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}