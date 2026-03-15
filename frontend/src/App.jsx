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

const normalizeForLookup = (item) => {
  const map = {
    milk: "full cream milk",
    bread: "white bread",
    rice: "white rice",
    yogurt: "greek yogurt",
    cheese: "cheddar cheese",
    tuna: "tuna can",
    onions: "brown onions",
    oats: "rolled oats"
  };

  return map[item] || item;
};

const calculateHealthyScore = (nutrition) => {
  if (!nutrition) return 0;

  const protein = Number(nutrition.protein_g || 0);
  const fibre = Number(nutrition.fibre_g || 0);
  const fat = Number(nutrition.fat_g || 0);
  const carbs = Number(nutrition.carbs_g || 0);
  const calories = Number(nutrition.calories_kcal || 0);

  const proteinScore = Math.min(protein / 30, 1) * 30;
  const fibreScore = Math.min(fibre / 10, 1) * 25;

  let fatScore = 0;
  if (fat >= 10 && fat <= 30) fatScore = 20;
  else if (fat > 0 && fat < 10) fatScore = (fat / 10) * 20;
  else if (fat > 30 && fat <= 45) fatScore = Math.max(0, 20 - ((fat - 30) / 15) * 20);

  let carbScore = 0;
  if (carbs >= 20 && carbs <= 80) carbScore = 15;
  else if (carbs > 0 && carbs < 20) carbScore = (carbs / 20) * 15;
  else if (carbs > 80 && carbs <= 120) carbScore = Math.max(0, 15 - ((carbs - 80) / 40) * 15);

  let calorieScore = 0;
  if (calories >= 300 && calories <= 900) calorieScore = 10;
  else if (calories > 0 && calories < 300) calorieScore = (calories / 300) * 10;
  else if (calories > 900 && calories <= 1300) calorieScore = Math.max(0, 10 - ((calories - 900) / 400) * 10);

  return Math.round(proteinScore + fibreScore + fatScore + carbScore + calorieScore);
};

const getHealthyScoreLabel = (score) => {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Decent";
  return "Needs balance";
};

export default function App() {
  const [itemInput, setItemInput] = useState("");
  const [items, setItems] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [inputError, setInputError] = useState("");

  const [chatInput, setChatInput] = useState("");
  const [recipeLoading, setRecipeLoading] = useState(false);
  const [recipeResult, setRecipeResult] = useState(null);

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

  const addNormalizedItemToList = (normalized) => {
    const alreadyExists = items.some(
      (item) => item.toLowerCase() === normalized.toLowerCase()
    );

    if (alreadyExists) return;

    setItems((prev) => [...prev, normalized]);
    setResult(null);
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
    setResult(null);
  };

  const removeItem = (itemToRemove) => {
    setItems((prev) => prev.filter((item) => item !== itemToRemove));
    setResult(null);
  };

  const clearList = () => {
    setItems([]);
    setResult(null);
    setItemInput("");
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
          budget: 0
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

  const askRecipeAssistant = async () => {
    if (!chatInput.trim()) return;

    setRecipeLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/recipe-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: chatInput
        })
      });

      const data = await response.json();
      setRecipeResult(data);
    } catch (error) {
      console.error("Error fetching recipe:", error);
    } finally {
      setRecipeLoading(false);
    }
  };

  const handleRecipeKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      askRecipeAssistant();
    }
  };

  const addIngredientToList = (ingredient) => {
    addNormalizedItemToList(ingredient);
  };

  const addAllIngredientsToList = () => {
    if (!recipeResult?.ingredients) return;

    let changed = false;

    setItems((prev) => {
      const updated = [...prev];

      recipeResult.ingredients.forEach((ingredient) => {
        const exists = updated.some(
          (item) => item.toLowerCase() === ingredient.toLowerCase()
        );

        if (!exists) {
          updated.push(ingredient);
          changed = true;
        }
      });

      return updated;
    });

    if (changed) {
      setResult(null);
    }
  };

  const selectSuggestion = (suggestion) => {
    setItemInput(suggestion);
    setInputError("");
  };

  const comparisonRows = useMemo(() => {
    if (!result) return [];

    const wooliesMap = Object.fromEntries(
      (result.woolworths_products || []).map((p) => [p.search_term, p])
    );

    const colesMap = Object.fromEntries(
      (result.coles_products || []).map((p) => [p.search_term, p])
    );

    return items.map((item) => {
      const normalizedItem = normalizeForLookup(item);

      const woolies = wooliesMap[normalizedItem] || null;
      const coles = colesMap[normalizedItem] || null;

      let bestDeal = "No comparison available";

      if (woolies && coles) {
        if (woolies.price < coles.price) {
          bestDeal = `Woolworths cheaper by $${(coles.price - woolies.price).toFixed(2)}`;
        } else if (coles.price < woolies.price) {
          bestDeal = `Coles cheaper by $${(woolies.price - coles.price).toFixed(2)}`;
        } else {
          bestDeal = "Same price at both stores";
        }
      } else if (woolies) {
        bestDeal = "Only found at Woolworths";
      } else if (coles) {
        bestDeal = "Only found at Coles";
      }

      return {
        item,
        woolies,
        coles,
        bestDeal
      };
    });
  }, [result, items]);

  const recommendationText = useMemo(() => {
    if (!result) return null;

    if (result.recommended_store === "Tie") {
      return {
        title: "Both stores are equally priced",
        subtitle: "Your basket costs the same at Coles and Woolworths."
      };
    }

    if (result.recommended_store === "No data") {
      return {
        title: "No store recommendation available",
        subtitle: "We could not match enough products to compare both baskets."
      };
    }

    return {
      title: `Recommendation: shop at ${result.recommended_store}`,
      subtitle: `Your basket costs $${result.recommended_store === "Coles" ? result.coles_total.toFixed(2) : result.woolworths_total.toFixed(2)} there, saving you $${result.savings.toFixed(2)} compared with the other store.`
    };
  }, [result]);

  const healthyScore = useMemo(() => {
    if (!result?.nutrition) return 0;
    return calculateHealthyScore(result.nutrition);
  }, [result]);

  const healthyScoreLabel = useMemo(() => {
    return getHealthyScoreLabel(healthyScore);
  }, [healthyScore]);

  return (
    <div className="min-h-screen bg-[#F7F4D5] text-[#0A3323]">
      <header className="bg-[#0A3323] w-full py-6 px-8 mb-10 shadow-md">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-white text-4xl font-bold tracking-wide">Buy Smart</h1>
          <p className="text-[#CDE3DA] text-sm mt-1">Save more on groceries</p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <div className="bg-[#EEE7C8] rounded-3xl p-6 shadow-sm border border-[#D9D2B5]">
              <p className="text-sm font-semibold tracking-[0.18em] text-[#105666] mb-5">
                MY GROCERY LIST
              </p>

              <div className="flex gap-3 mb-3 items-center">
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
                  className="w-12 h-12 flex items-center justify-center rounded-full bg-[#0A3323] text-white text-2xl font-bold hover:bg-[#14573f] transition"
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

              <div className="space-y-4">
                <button
                  onClick={findBasket}
                  className="w-full bg-[#D3968C] text-[#F7F4D5] py-3.5 rounded-full font-semibold text-lg hover:opacity-95 transition"
                  type="button"
                >
                  {loading ? "Loading..." : "Compare Baskets"}
                </button>

                <button
                  onClick={clearList}
                  className="w-full border border-[#839958] text-[#0A3323] py-3.5 rounded-full font-semibold text-lg bg-transparent hover:bg-[#F1EBCB] transition"
                  type="button"
                >
                  Clear List
                </button>
              </div>
            </div>

            <div className="bg-[#EEE7C8] rounded-3xl p-6 shadow-sm border border-[#D9D2B5]">
              <p className="text-sm font-semibold tracking-[0.18em] text-[#105666] mb-5">
                RECIPE ASSISTANT
              </p>

              <div className="space-y-3">
                <input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleRecipeKeyDown}
                  placeholder="Ask for a meal idea, e.g. I wanna make pizza"
                  className="w-full rounded-2xl px-4 py-3 border border-[#CFC7A8] bg-white text-[#0A3323] placeholder:text-[#839958] outline-none focus:ring-2 focus:ring-[#839958]"
                />

                <button
                  onClick={askRecipeAssistant}
                  className="w-full bg-[#105666] text-[#F7F4D5] py-3.5 rounded-full font-semibold text-lg hover:opacity-95 transition"
                  type="button"
                >
                  {recipeLoading ? "Thinking..." : "Ask Recipe Assistant"}
                </button>
              </div>

              {recipeResult && (
                <div className="mt-6 bg-[#F7F4D5] border border-[#D9D2B5] rounded-3xl p-5">
                  <p className="text-2xl font-bold text-[#0A3323] mb-2">
                    {recipeResult.title}
                  </p>
                  <p className="text-[#105666] mb-4">
                    {recipeResult.reply}
                  </p>

                  <div className="mb-4">
                    <p className="text-sm font-semibold tracking-[0.14em] text-[#105666] mb-3">
                      INGREDIENTS
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {recipeResult.ingredients.map((ingredient) => (
                        <button
                          key={ingredient}
                          type="button"
                          onClick={() => addIngredientToList(ingredient)}
                          className="px-3 py-2 rounded-full bg-[#105666] text-[#F7F4D5] text-sm font-medium hover:opacity-90"
                        >
                          + {ingredient}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={addAllIngredientsToList}
                    type="button"
                    className="mb-5 w-full bg-[#D3968C] text-[#F7F4D5] py-3 rounded-full font-semibold hover:opacity-95 transition"
                  >
                    Add all ingredients to grocery list
                  </button>

                  <div>
                    <p className="text-sm font-semibold tracking-[0.14em] text-[#105666] mb-3">
                      STEPS
                    </p>
                    <div className="space-y-2">
                      {recipeResult.steps.map((step, index) => (
                        <div
                          key={index}
                          className="bg-white rounded-2xl px-4 py-3 border border-[#E6DFBF] text-[#0A3323]"
                        >
                          <span className="font-semibold mr-2">{index + 1}.</span>
                          {step}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            {result && recommendationText && (
              <div className="bg-[#DCE8DF] border border-[#B7C8BB] rounded-3xl p-5 mb-6">
                <p className="text-2xl font-bold text-[#0A3323] mb-1">
                  {recommendationText.title}
                </p>
                <p className="text-[#105666] text-base">
                  {recommendationText.subtitle}
                </p>
              </div>
            )}

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-[#E6DFBF] mb-6">
              <p className="text-sm font-semibold tracking-[0.18em] text-[#105666] mb-5">
                PRICE COMPARISON
              </p>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-[#F3EFE2] rounded-2xl p-5">
                  <p className="text-4xl font-bold text-[#0A3323]">
                    {comparisonRows.length}
                  </p>
                  <p className="text-base text-[#105666] mt-1">Items compared</p>
                </div>

                <div className="bg-[#F3EFE2] rounded-2xl p-5">
                  <p className="text-4xl font-bold text-[#0A3323]">
                    ${result ? result.woolworths_total.toFixed(2) : "0.00"}
                  </p>
                  <p className="text-base text-[#105666] mt-1">Woolworths total</p>
                </div>

                <div className="bg-[#F3EFE2] rounded-2xl p-5">
                  <p className="text-4xl font-bold text-[#0A3323]">
                    ${result ? result.coles_total.toFixed(2) : "0.00"}
                  </p>
                  <p className="text-base text-[#105666] mt-1">Coles total</p>
                </div>

                <div className="bg-[#DCE8DF] rounded-2xl p-5">
                  <p className="text-2xl font-bold text-[#0A3323]">
                    {result ? result.recommended_store : "—"}
                  </p>
                  <p className="text-base text-[#105666] mt-1">
                    {result
                      ? result.savings > 0
                        ? `Save $${result.savings.toFixed(2)}`
                        : "No savings"
                      : "Recommended store"}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full table-fixed border-separate border-spacing-y-4 text-sm">
                  <thead>
                    <tr className="text-[#105666] text-base">
                      <th className="text-left font-semibold w-[14%] px-2 pb-2">Item</th>
                      <th className="text-left font-semibold w-[33%] px-4 pb-2">
                        <div className="flex items-center gap-2">
                          <img src="/logos/woolworths.png" className="h-6" />
                          Woolworths
                        </div>
                      </th>
                      <th className="text-left font-semibold w-[33%] px-4 pb-2">
                        <div className="flex items-center gap-2">
                          <img src="/logos/coles.png" className="h-6" />
                          Coles
                        </div>
                      </th>
                      <th className="text-left font-semibold w-[20%] px-2 pb-2">Best deal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonRows.map((row, index) => (
                      <tr key={index} className="align-top bg-[#EEE7C8] rounded-xl">
                        <td className="px-2 py-4 text-[#0A3323] font-medium">
                          {row.item}
                        </td>
                        <td className="px-4 py-4 text-[#0A3323]">
                          {row.woolies ? (
                            <div className="leading-7">
                              <div className="break-words">{row.woolies.name}</div>
                              <div className="text-[#105666] font-medium">
                                ${row.woolies.price.toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-4 text-[#0A3323]">
                          {row.coles ? (
                            <div className="leading-7">
                              <div className="break-words">{row.coles.name}</div>
                              <div className="text-[#105666] font-medium">
                                ${row.coles.price.toFixed(2)}
                              </div>
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-2 py-4 text-[#105666] font-semibold leading-7">
                          {row.bestDeal}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {result && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  <div className="bg-[#EEE7C8] rounded-2xl p-6">
                    <h3 className="font-semibold mb-4 text-lg">Nutrition</h3>
                    <p>Calories: {result.nutrition.calories_kcal.toFixed(0)}</p>
                    <p>Protein: {result.nutrition.protein_g.toFixed(1)} g</p>
                    <p>Carbs: {result.nutrition.carbs_g.toFixed(1)} g</p>
                    <p>Fat: {result.nutrition.fat_g.toFixed(1)} g</p>
                    <p>Fibre: {result.nutrition.fibre_g.toFixed(1)} g</p>
                  </div>

                  <div className="bg-[#EEE7C8] rounded-2xl p-6">
                    <h3 className="font-semibold mb-4 text-lg">Healthy Score</h3>
                    <p className="text-4xl font-bold text-[#0A3323]">
                      {healthyScore}/100
                    </p>
                    <p className="text-sm text-[#105666] mt-2 font-medium">
                      {healthyScoreLabel}
                    </p>
                    <p className="text-sm text-[#105666] mt-3">
                      Based on balance of protein, fibre, fats, carbs and calories.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}