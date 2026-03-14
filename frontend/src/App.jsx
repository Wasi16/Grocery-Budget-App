import { useState } from "react";

export default function App() {
  const [budget, setBudget] = useState(25);
  const [itemInput, setItemInput] = useState("");
  const [items, setItems] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const addItem = () => {
    const trimmed = itemInput.trim();
    if (!trimmed) return;
    setItems([...items, trimmed]);
    setItemInput("");
  };

  const clearList = () => {
    setItems([]);
    setResult(null);
    setItemInput("");
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
          budget: Number(budget)
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

  return (
    <div className="min-h-screen bg-[#f5f3e7] text-gray-800">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-5xl font-bold text-green-950 mb-2">GrocerySmart</h1>
        <p className="text-gray-600 mb-8">
          Find the cheapest matching Woolworths products and view estimated nutrition totals.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel */}
          <div className="bg-[#ece8d1] rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold tracking-widest text-gray-700 mb-4">
              MY GROCERY LIST
            </p>

            <div className="flex gap-2 mb-4">
              <input
                value={itemInput}
                onChange={(e) => setItemInput(e.target.value)}
                placeholder="Add an item (e.g. milk, eggs...)"
                className="flex-1 rounded-full px-4 py-3 border border-green-900 outline-none"
              />
              <button
                onClick={addItem}
                className="w-12 h-12 rounded-full bg-green-950 text-white text-xl"
              >
                +
              </button>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {items.map((item, index) => (
                <span
                  key={index}
                  className="bg-[#214f4a] text-white px-3 py-1 rounded-full text-sm"
                >
                  {item}
                </span>
              ))}
            </div>

            <div className="space-y-3 mb-6">
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="w-full rounded-xl px-4 py-3 border border-gray-300"
              />
              <button
                onClick={findBasket}
                className="w-full bg-[#c99287] text-white py-3 rounded-full font-semibold"
              >
                {loading ? "Loading..." : "Find Cheapest Basket"}
              </button>
              <button
                onClick={clearList}
                className="w-full border border-gray-400 py-3 rounded-full font-semibold"
              >
                Clear List
              </button>
            </div>

            {result && (
              <div className="bg-green-950 text-white rounded-2xl p-4">
                <p className="text-xs tracking-widest mb-4">ESTIMATED NUTRIENTS IN YOUR LIST</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-900 rounded-xl p-3">
                    <p className="text-2xl font-bold">{result.nutrition.calories_kcal.toFixed(0)}</p>
                    <p className="text-xs opacity-80">Calories (kcal)</p>
                  </div>
                  <div className="bg-green-900 rounded-xl p-3">
                    <p className="text-2xl font-bold">{result.nutrition.protein_g.toFixed(1)}g</p>
                    <p className="text-xs opacity-80">Protein</p>
                  </div>
                  <div className="bg-green-900 rounded-xl p-3">
                    <p className="text-2xl font-bold">{result.nutrition.fat_g.toFixed(1)}g</p>
                    <p className="text-xs opacity-80">Fat</p>
                  </div>
                  <div className="bg-green-900 rounded-xl p-3">
                    <p className="text-2xl font-bold">{result.nutrition.carbs_g.toFixed(1)}g</p>
                    <p className="text-xs opacity-80">Carbs</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
              <p className="text-xs font-semibold tracking-widest text-gray-700 mb-4">
                PRICE COMPARISON
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                <div className="bg-[#f3efe5] rounded-xl p-4">
                  <p className="text-3xl font-bold">{result ? result.products.length : 0}</p>
                  <p className="text-sm text-gray-500">Items compared</p>
                </div>
                <div className="bg-[#f3efe5] rounded-xl p-4">
                  <p className="text-3xl font-bold text-green-700">
                    ${result ? result.total_price.toFixed(2) : "0.00"}
                  </p>
                  <p className="text-sm text-gray-500">Woolies total</p>
                </div>
                <div className="bg-[#e6f3eb] rounded-xl p-4">
                  <p className="text-3xl font-bold text-green-700">
                    {result
                      ? `$${Math.abs(budget - result.total_price).toFixed(2)}`
                      : "$0.00"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {result
                      ? result.total_price <= budget
                        ? "Left in budget"
                        : "Over budget"
                      : "Budget difference"}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-gray-500 text-sm border-b">
                      <th className="py-3">Item</th>
                      <th className="py-3">Woolies</th>
                      <th className="py-3">Price</th>
                      <th className="py-3">Unit Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result?.products?.map((product, index) => (
                      <tr key={index} className="border-b last:border-b-0">
                        <td className="py-4">{product.search_term}</td>
                        <td className="py-4">{product.name}</td>
                        <td className="py-4 font-semibold">${product.price.toFixed(2)}</td>
                        <td className="py-4">{product.cup_string || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {result && (
              <div className="bg-[#f8f3ea] border border-[#d9b1a4] rounded-2xl p-4 text-sm text-[#9b6b61]">
                Nutrition values are estimated from category-level lookup data.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}