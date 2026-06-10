/**
 * Tynkr Tools - Shared Kitchen Ingredient Density Database
 * Densities are defined as specific gravity (grams per milliliter, g/ml).
 */

const INGREDIENT_DENSITIES = {
    // Flours (base volume to weight)
    "all-purpose flour": 0.51,        // ~122g per cup (240ml)
    "ap flour": 0.51,
    "flour": 0.51,
    "bread flour": 0.54,              // ~130g per cup
    "cake flour": 0.48,               // ~115g per cup
    "whole wheat flour": 0.50,         // ~120g per cup
    "wheat flour": 0.50,
    "semolina flour": 0.67,            // ~160g per cup
    "semolina": 0.67,
    "rye flour": 0.50,                 // ~120g per cup
    "buckwheat flour": 0.58,           // ~140g per cup

    // Sugars & Sweeteners
    "granulated sugar": 0.84,          // ~200g per cup
    "white sugar": 0.84,
    "sugar": 0.84,
    "brown sugar": 0.92,               // ~220g per cup (packed)
    "powdered sugar": 0.50,            // ~120g per cup
    "confectioners sugar": 0.50,
    "honey": 1.40,                     // ~340g per cup
    "maple syrup": 1.33,               // ~320g per cup
    "molasses": 1.40,

    // Fats & Oils
    "butter": 0.96,                    // ~230g per cup
    "margarine": 0.92,
    "olive oil": 0.92,                 // ~220g per cup
    "vegetable oil": 0.92,
    "canola oil": 0.92,
    "coconut oil": 0.90,               // ~216g per cup
    "oil": 0.92,

    // Liquids & Dairy
    "water": 1.00,                     // 1.00 g/ml
    "milk": 1.03,                      // ~247g per cup
    "heavy cream": 0.98,               // ~235g per cup
    "heavy whipping cream": 0.98,
    "sour cream": 0.98,
    "yogurt": 1.05,                    // ~250g per cup
    "buttermilk": 1.03,

    // Leaveners, Seasonings & Baking Agents
    "table salt": 1.15,                // ~276g per cup (5.7g/tsp)
    "salt": 1.15,                      // table salt fallback
    "kosher salt": 0.70,               // Average of Morton & Diamond
    "diamond crystal kosher salt": 0.57, // ~137g per cup
    "morton kosher salt": 0.83,        // ~200g per cup
    "sea salt": 1.05,                  // ~252g per cup
    "yeast": 0.64,                     // ~3.1g per tsp
    "active dry yeast": 0.64,
    "instant yeast": 0.64,
    "baking powder": 0.90,             // ~4.5g per tsp
    "baking soda": 1.20,               // ~6g per tsp
    "cornstarch": 0.54,                // ~130g per cup
    "cocoa powder": 0.42,              // ~100g per cup

    // Grains, Seeds & Nuts
    "rice": 0.83,                      // Jasmine/white rice uncooked (~200g per cup)
    "jasmine rice": 0.83,
    "basmati rice": 0.83,
    "rolled oats": 0.38,               // ~90g per cup
    "oats": 0.38,
    "quinoa": 0.75,                    // ~180g per cup
    "flaxseed": 0.67,
    "chia seeds": 0.67,

    // Extras
    "chocolate chips": 0.71,           // ~170g per cup
    "walnuts": 0.50,                   // chopped (~120g per cup)
    "almonds": 0.58,                   // chopped (~140g per cup)
    "pecans": 0.46                     // chopped (~110g per cup)
};

/**
 * Finds the matching ingredient density for a given ingredient name or text line.
 * Performs a case-insensitive search matching the longest key first to prevent false partial matches.
 * 
 * @param {string} text - The line of text or ingredient name to search.
 * @returns {object|null} - An object with { name, density } or null.
 */
function findIngredientDensity(text) {
    if (!text) return null;
    const cleanText = text.toLowerCase();
    
    // Sort keys by length descending to match "all-purpose flour" before "flour"
    const sortedKeys = Object.keys(INGREDIENT_DENSITIES).sort((a, b) => b.length - a.length);
    
    for (const key of sortedKeys) {
        // Match either direct substring or word-bounded match
        if (cleanText.includes(key)) {
            return {
                name: key,
                density: INGREDIENT_DENSITIES[key]
            };
        }
    }
    return null;
}
