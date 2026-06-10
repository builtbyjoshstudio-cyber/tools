/**
 * Tynkr Tools - Shared Kitchen Ingredient Database
 * 
 * Nutritional values are stored per 100g (or 100ml for liquids).
 * Density is defined as specific gravity (grams per milliliter, g/ml).
 * Volume conversions: grams = volume_ml * density.
 */

const INGREDIENT_DATABASE = {
    // Flours
    "all-purpose flour": { density: 0.51, cal: 364, protein: 10.3, carbs: 76.3, fat: 1.0, fiber: 2.7, sodium: 2 },
    "ap flour": { density: 0.51, cal: 364, protein: 10.3, carbs: 76.3, fat: 1.0, fiber: 2.7, sodium: 2 },
    "flour": { density: 0.51, cal: 364, protein: 10.3, carbs: 76.3, fat: 1.0, fiber: 2.7, sodium: 2 },
    "bread flour": { density: 0.54, cal: 361, protein: 12.7, carbs: 70.6, fat: 1.7, fiber: 2.4, sodium: 2 },
    "cake flour": { density: 0.48, cal: 362, protein: 8.0, carbs: 78.0, fat: 1.0, fiber: 1.8, sodium: 2 },
    "whole wheat flour": { density: 0.50, cal: 339, protein: 13.7, carbs: 72.6, fat: 1.9, fiber: 12.2, sodium: 2 },
    "wheat flour": { density: 0.50, cal: 339, protein: 13.7, carbs: 72.6, fat: 1.9, fiber: 12.2, sodium: 2 },
    "semolina flour": { density: 0.67, cal: 360, protein: 12.7, carbs: 72.8, fat: 1.1, fiber: 3.9, sodium: 1 },
    "semolina": { density: 0.67, cal: 360, protein: 12.7, carbs: 72.8, fat: 1.1, fiber: 3.9, sodium: 1 },
    "rye flour": { density: 0.50, cal: 354, protein: 9.0, carbs: 77.0, fat: 1.5, fiber: 11.7, sodium: 2 },
    "buckwheat flour": { density: 0.58, cal: 343, protein: 13.2, carbs: 71.5, fat: 3.4, fiber: 10.0, sodium: 0 },

    // Sugars & Sweeteners
    "granulated sugar": { density: 0.84, cal: 387, protein: 0, carbs: 100, fat: 0, fiber: 0, sodium: 1 },
    "white sugar": { density: 0.84, cal: 387, protein: 0, carbs: 100, fat: 0, fiber: 0, sodium: 1 },
    "sugar": { density: 0.84, cal: 387, protein: 0, carbs: 100, fat: 0, fiber: 0, sodium: 1 },
    "brown sugar": { density: 0.92, cal: 380, protein: 0, carbs: 98.0, fat: 0, fiber: 0, sodium: 28 },
    "powdered sugar": { density: 0.50, cal: 389, protein: 0, carbs: 99.8, fat: 0, fiber: 0, sodium: 2 },
    "confectioners sugar": { density: 0.50, cal: 389, protein: 0, carbs: 99.8, fat: 0, fiber: 0, sodium: 2 },
    "honey": { density: 1.40, cal: 304, protein: 0.3, carbs: 82.4, fat: 0, fiber: 0, sodium: 4 },
    "maple syrup": { density: 1.33, cal: 260, protein: 0, carbs: 67.0, fat: 0.1, fiber: 0, sodium: 12 },
    "molasses": { density: 1.40, cal: 290, protein: 0, carbs: 75.0, fat: 0.1, fiber: 0, sodium: 37 },

    // Fats & Oils
    "butter": { density: 0.96, cal: 717, protein: 0.9, carbs: 0.1, fat: 81.1, fiber: 0, sodium: 11 },
    "margarine": { density: 0.92, cal: 713, protein: 0.1, carbs: 0.9, fat: 80.5, fiber: 0, sodium: 700 },
    "olive oil": { density: 0.92, cal: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sodium: 2 },
    "vegetable oil": { density: 0.92, cal: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sodium: 0 },
    "canola oil": { density: 0.92, cal: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sodium: 0 },
    "coconut oil": { density: 0.90, cal: 862, protein: 0, carbs: 0, fat: 100, fiber: 0, sodium: 0 },
    "oil": { density: 0.92, cal: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, sodium: 2 },

    // Liquids & Dairy
    "water": { density: 1.00, cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0 },
    "milk": { density: 1.03, cal: 61, protein: 3.2, carbs: 4.8, fat: 3.3, fiber: 0, sodium: 44 },
    "heavy cream": { density: 0.98, cal: 340, protein: 2.8, carbs: 2.7, fat: 36.1, fiber: 0, sodium: 27 },
    "heavy whipping cream": { density: 0.98, cal: 340, protein: 2.8, carbs: 2.7, fat: 36.1, fiber: 0, sodium: 27 },
    "sour cream": { density: 0.98, cal: 198, protein: 2.4, carbs: 4.6, fat: 19.4, fiber: 0, sodium: 31 },
    "yogurt": { density: 1.05, cal: 59, protein: 10.0, carbs: 3.6, fat: 0.4, fiber: 0, sodium: 36 },
    "buttermilk": { density: 1.03, cal: 40, protein: 3.3, carbs: 4.8, fat: 0.9, fiber: 0, sodium: 105 },

    // Seasonings & Salts
    "table salt": { density: 1.15, cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 38758 },
    "salt": { density: 1.15, cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 38758 },
    "kosher salt": { density: 0.70, cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 38758 },
    "diamond crystal kosher salt": { density: 0.57, cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 38758 },
    "morton kosher salt": { density: 0.83, cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 38758 },
    "sea salt": { density: 1.05, cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 38758 },

    // Baking Agents & Leaveners
    "yeast": { density: 0.64, cal: 325, protein: 40.0, carbs: 40.0, fat: 7.0, fiber: 27.0, sodium: 51 },
    "active dry yeast": { density: 0.64, cal: 325, protein: 40.0, carbs: 40.0, fat: 7.0, fiber: 27.0, sodium: 51 },
    "instant yeast": { density: 0.64, cal: 325, protein: 40.0, carbs: 40.0, fat: 7.0, fiber: 27.0, sodium: 51 },
    "baking powder": { density: 0.90, cal: 97, protein: 0, carbs: 28.0, fat: 0, fiber: 0, sodium: 10600 },
    "baking soda": { density: 1.20, cal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 27360 },
    "cornstarch": { density: 0.54, cal: 381, protein: 0.3, carbs: 91.3, fat: 0.1, fiber: 0.9, sodium: 9 },
    "cocoa powder": { density: 0.42, cal: 228, protein: 19.6, carbs: 57.9, fat: 13.7, fiber: 37.0, sodium: 21 },

    // Grains, Rice, Pasta (Explicit raw/cooked)
    "jasmine rice dry": { density: 0.83, cal: 356, protein: 7.1, carbs: 79.5, fat: 0.7, fiber: 1.3, sodium: 0 },
    "jasmine rice cooked": { density: 0.75, cal: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fiber: 0.4, sodium: 0 },
    "rice dry": { density: 0.83, cal: 356, protein: 7.1, carbs: 79.5, fat: 0.7, fiber: 1.3, sodium: 0 },
    "rice cooked": { density: 0.75, cal: 130, protein: 2.7, carbs: 28.2, fat: 0.3, fiber: 0.4, sodium: 0 },
    "pasta dry": { density: 0.60, cal: 371, protein: 13.0, carbs: 75.0, fat: 1.5, fiber: 3.2, sodium: 6 },
    "pasta cooked": { density: 0.60, cal: 158, protein: 5.8, carbs: 30.9, fat: 0.9, fiber: 1.8, sodium: 1 },
    "quinoa": { density: 0.75, cal: 368, protein: 14.1, carbs: 64.2, fat: 6.1, fiber: 7.0, sodium: 5 },
    "rolled oats": { density: 0.38, cal: 379, protein: 13.2, carbs: 67.7, fat: 6.5, fiber: 10.1, sodium: 2 },
    "oats": { density: 0.38, cal: 379, protein: 13.2, carbs: 67.7, fat: 6.5, fiber: 10.1, sodium: 2 },
    "flaxseed": { density: 0.67, cal: 534, protein: 18.3, carbs: 28.9, fat: 42.2, fiber: 27.3, sodium: 30 },
    "chia seeds": { density: 0.67, cal: 486, protein: 16.5, carbs: 42.1, fat: 30.7, fiber: 34.4, sodium: 16 },

    // Proteins & Meats (Explicit raw/cooked)
    "chicken breast raw": { density: 1.0, cal: 120, protein: 22.5, carbs: 0, fat: 2.6, fiber: 0, sodium: 45 },
    "chicken breast cooked": { density: 1.0, cal: 165, protein: 31.0, carbs: 0, fat: 3.6, fiber: 0, sodium: 74 },
    "chicken raw": { density: 1.0, cal: 120, protein: 22.5, carbs: 0, fat: 2.6, fiber: 0, sodium: 45 },
    "chicken cooked": { density: 1.0, cal: 165, protein: 31.0, carbs: 0, fat: 3.6, fiber: 0, sodium: 74 },

    // Extras
    "chocolate chips": { density: 0.71, cal: 479, protein: 5.2, carbs: 64.1, fat: 22.3, fiber: 5.3, sodium: 115 },
    "walnuts": { density: 0.50, cal: 654, protein: 15.2, carbs: 13.7, fat: 65.2, fiber: 6.7, sodium: 2 },
    "almonds": { density: 0.58, cal: 579, protein: 21.2, carbs: 21.6, fat: 49.9, fiber: 12.5, sodium: 1 },
    "pecans": { density: 0.46, cal: 691, protein: 9.2, carbs: 13.9, fat: 72.0, fiber: 9.6, sodium: 0 }
};

// Recreate INGREDIENT_DENSITIES for backwards compatibility
const INGREDIENT_DENSITIES = {};
Object.keys(INGREDIENT_DATABASE).forEach(key => {
    INGREDIENT_DENSITIES[key] = INGREDIENT_DATABASE[key].density;
});

/**
 * Finds the matching ingredient database entry for a given ingredient name or text line.
 * Performs a case-insensitive search matching the longest key first to prevent false partial matches.
 * 
 * @param {string} text - The line of text or ingredient name to search.
 * @returns {object|null} - An object with { name, density, cal, protein, carbs, fat, fiber, sodium } or null.
 */
function findIngredientDensity(text) {
    if (!text) return null;
    const cleanText = text.toLowerCase();
    
    // Sort keys by length descending to match "all-purpose flour" before "flour"
    const sortedKeys = Object.keys(INGREDIENT_DATABASE).sort((a, b) => b.length - a.length);
    
    for (const key of sortedKeys) {
        if (cleanText.includes(key)) {
            return {
                name: key,
                ...INGREDIENT_DATABASE[key]
            };
        }
    }
    return null;
}
