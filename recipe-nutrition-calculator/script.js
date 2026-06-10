document.addEventListener('DOMContentLoaded', () => {
    // Theme switching is handled globally by ../kinetic.js

    // State Variables
    let customIngredients = [];
    let displayMode = 'serving'; // 'serving' or 'total'

    // DOM Elements
    const recipeInput = document.getElementById('recipe-input');
    const servingsInput = document.getElementById('servings');
    const displayModeServingBtn = document.getElementById('display-mode-serving');
    const displayModeTotalBtn = document.getElementById('display-mode-total');

    // Custom Ingredient Inputs
    const customNameInput = document.getElementById('custom-name');
    const customWeightInput = document.getElementById('custom-weight');
    const customModeSelect = document.getElementById('custom-mode');
    const customCalInput = document.getElementById('custom-cal');
    const customProteinInput = document.getElementById('custom-protein');
    const customCarbsInput = document.getElementById('custom-carbs');
    const customFatInput = document.getElementById('custom-fat');
    const customFiberInput = document.getElementById('custom-fiber');
    const customSodiumInput = document.getElementById('custom-sodium');
    const addCustomBtn = document.getElementById('add-custom-btn');
    const customActiveList = document.getElementById('custom-active-list');
    const customActiveContainer = document.getElementById('custom-active-container');

    // Warning / Unmatched Elements
    const warningCard = document.getElementById('warning-card');
    const ambiguousWarningsContainer = document.getElementById('ambiguous-warnings');
    const unmatchedContainer = document.getElementById('unmatched-container');
    const unmatchedList = document.getElementById('unmatched-list');

    // Output stats
    const summaryModeTitle = document.getElementById('summary-mode-title');
    const statCalories = document.getElementById('stat-calories');
    const barProtein = document.getElementById('bar-protein');
    const barCarbs = document.getElementById('bar-carbs');
    const barFat = document.getElementById('bar-fat');
    const labelProteinKcal = document.getElementById('label-protein-kcal');
    const labelCarbsKcal = document.getElementById('label-carbs-kcal');
    const labelFatKcal = document.getElementById('label-fat-kcal');

    // Label Elements
    const lblServings = document.getElementById('lbl-servings');
    const lblServingSize = document.getElementById('lbl-serving-size');
    const lblCalories = document.getElementById('lbl-calories');
    const lblFat = document.getElementById('lbl-fat');
    const lblFatDv = document.getElementById('lbl-fat-dv');
    const lblSodium = document.getElementById('lbl-sodium');
    const lblSodiumDv = document.getElementById('lbl-sodium-dv');
    const lblCarbs = document.getElementById('lbl-carbs');
    const lblCarbsDv = document.getElementById('lbl-carbs-dv');
    const lblFiber = document.getElementById('lbl-fiber');
    const lblFiberDv = document.getElementById('lbl-fiber-dv');
    const lblProtein = document.getElementById('lbl-protein');

    // Load saved recipe
    const savedRecipe = localStorage.getItem('savedNutritionRecipe');
    if (savedRecipe) {
        recipeInput.value = savedRecipe;
    }

    // Load saved custom ingredients
    const savedCustoms = localStorage.getItem('savedCustomIngredients');
    if (savedCustoms) {
        try {
            customIngredients = JSON.parse(savedCustoms);
            renderCustomIngredients();
        } catch (e) {
            console.error('Error parsing custom ingredients', e);
        }
    }

    // Parse mixed fractions and decimals
    function parseNumber(str) {
        str = str.trim();
        if (str.includes('/')) {
            const parts = str.split(/\s+/);
            if (parts.length > 1) {
                const fraction = parts[1].split('/');
                return parseFloat(parts[0]) + (parseFloat(fraction[0]) / parseFloat(fraction[1]));
            } else {
                const fraction = str.split('/');
                return parseFloat(fraction[0]) / parseFloat(fraction[1]);
            }
        }
        return parseFloat(str);
    }

    // Convert Unicode Fractions to Decimals
    function convertUnicodeFractions(str) {
        let result = str;
        const unicodeFractions = {
            '½': 0.5, '⅓': 0.3333, '⅔': 0.6666, '¼': 0.25, '¾': 0.75,
            '⅕': 0.2, '⅖': 0.4, '⅗': 0.6, '⅘': 0.8, '⅙': 0.1666, '⅚': 0.8333,
            '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875
        };
        for (const [char, val] of Object.entries(unicodeFractions)) {
            const regex = new RegExp(`(\\d*)${char}`, 'g');
            result = result.replace(regex, (m, digit) => {
                const base = digit ? parseFloat(digit) : 0;
                return (base + val).toString();
            });
        }
        return result;
    }

    // Parse a recipe line into quantity, unit, and ingredient
    function parseIngredientLine(line) {
        const trimmed = line.trim();
        if (!trimmed) return null;

        // Skip comments or instruction sections
        if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('Instructions:')) {
            return {
                original: trimmed,
                uncalculated: true,
                comment: true
            };
        }

        let cleanLine = convertUnicodeFractions(trimmed);

        // Standard Units Regex
        const unitRegex = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.\d+|\d+)\s*(grams?|g\.?|kilograms?|kg\.?|ounces?|ozs?\.?|pounds?|lbs?\.?|teaspoons?|tsps?\.?|tablespoons?|tbsps?\.?|fluid\s*ounces?|fl\.?\s*oz\.?|cups?|c\.?|milliliters?|ml\.?|liters?|l\.?|quarts?|qts?\.?|pints?|pts?\.?|gallons?|gals?\.?)\b\s*(?:of\s+)?(.*)$/i;
        const countRegex = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.\d+|\d+)\s*(.*)$/;

        let match = unitRegex.exec(cleanLine);
        if (match) {
            return {
                original: trimmed,
                quantity: parseNumber(match[1]),
                unit: match[2].toLowerCase(),
                ingredient: match[3].trim()
            };
        }

        match = countRegex.exec(cleanLine);
        if (match) {
            const ingName = match[2].trim();
            // Do not calculate "to taste"
            if (/\b(?:to taste|t.t.)\b/i.test(ingName)) {
                return {
                    original: trimmed,
                    uncalculated: true,
                    reason: 'To taste ingredients are not calculated'
                };
            }
            return {
                original: trimmed,
                quantity: parseNumber(match[1]),
                unit: 'count',
                ingredient: ingName
            };
        }

        return {
            original: trimmed,
            uncalculated: true,
            reason: 'Could not parse quantity and unit'
        };
    }

    // Convert Volume or Imperial units to Grams
    function convertToGrams(qty, unit, density) {
        unit = unit.toLowerCase();

        // Weight
        if (/^(grams?|g\.?)$/.test(unit)) return qty;
        if (/^(kilograms?|kg\.?)$/.test(unit)) return qty * 1000;
        if (/^(ounces?|ozs?\.?)$/.test(unit)) return qty * 28.3495;
        if (/^(pounds?|lbs?\.?)$/.test(unit)) return qty * 453.592;

        // Volume
        let volumeMl = 0;
        if (/^(teaspoons?|tsps?\.?)$/.test(unit)) volumeMl = qty * 4.92892;
        else if (/^(tablespoons?|tbsps?\.?)$/.test(unit)) volumeMl = qty * 14.7868;
        else if (/^(fluid\s*ounces?|fl\.?\s*oz\.?)$/.test(unit)) volumeMl = qty * 29.5735;
        else if (/^(cups?|c\.?)$/.test(unit)) volumeMl = qty * 240;
        else if (/^(pints?|pts?\.?)$/.test(unit)) volumeMl = qty * 473.176;
        else if (/^(quarts?|qts?\.?)$/.test(unit)) volumeMl = qty * 946.353;
        else if (/^(gallons?|gals?\.?)$/.test(unit)) volumeMl = qty * 3785.41;
        else if (/^(milliliters?|ml\.?)$/.test(unit)) volumeMl = qty;
        else if (/^(liters?|l\.?)$/.test(unit)) volumeMl = qty * 1000;

        if (volumeMl > 0) {
            return volumeMl * density;
        }

        // Count base (specifically support eggs)
        if (unit === 'count') {
            if (/\beggs?\b/i.test(density)) { // density used as string identifier in egg check
                return qty * 50; // 1 large egg is ~50g
            }
        }

        return null;
    }

    // Auto-replace text helper for ambiguity warnings
    window.replaceIngredientText = function(oldText, newText) {
        const lines = recipeInput.value.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].toLowerCase().includes(oldText.toLowerCase())) {
                lines[i] = lines[i].replace(new RegExp(oldText, 'i'), newText);
                break;
            }
        }
        recipeInput.value = lines.join('\n');
        calculateNutrition();
    };

    // Main Calculations
    function calculateNutrition() {
        const text = recipeInput.value;
        localStorage.setItem('savedNutritionRecipe', text);

        const servings = Math.max(1, parseInt(servingsInput.value) || 4);
        
        let totalCal = 0;
        let totalProtein = 0;
        let totalCarbs = 0;
        let totalFat = 0;
        let totalFiber = 0;
        let totalSodium = 0;
        let totalWeightG = 0;

        const unmatchedItems = [];
        const ambiguousWarnings = [];

        const lines = text.split('\n');

        lines.forEach(line => {
            const parsed = parseIngredientLine(line);
            if (!parsed) return;

            if (parsed.uncalculated) {
                if (!parsed.comment) {
                    unmatchedItems.push(parsed.original);
                }
                return;
            }

            // Raw/Cooked Ambiguity Check
            const nameLower = parsed.ingredient.toLowerCase();
            let matchedName = parsed.ingredient;
            let warningTriggered = false;

            if (nameLower === 'rice' || nameLower === 'jasmine rice' || nameLower === 'basmati rice') {
                ambiguousWarnings.push({
                    item: parsed.ingredient,
                    type: 'rice',
                    message: `<b>${parsed.ingredient}</b> is ambiguous. Defaulting to <b>dry rice</b>.`
                });
                matchedName = 'jasmine rice dry';
                warningTriggered = true;
            } else if (nameLower === 'chicken' || nameLower === 'chicken breast') {
                ambiguousWarnings.push({
                    item: parsed.ingredient,
                    type: 'chicken',
                    message: `<b>${parsed.ingredient}</b> is ambiguous. Defaulting to <b>chicken breast raw</b>.`
                });
                matchedName = 'chicken breast raw';
                warningTriggered = true;
            } else if (nameLower === 'pasta') {
                ambiguousWarnings.push({
                    item: parsed.ingredient,
                    type: 'pasta',
                    message: `<b>${parsed.ingredient}</b> is ambiguous. Defaulting to <b>pasta dry</b>.`
                });
                matchedName = 'pasta dry';
                warningTriggered = true;
            }

            // Special check for Egg counts
            const isEgg = /\beggs?\b/i.test(matchedName);
            const lookupName = isEgg ? 'yeast' : matchedName; // lookup check
            const dbMatch = findIngredientDensity(isEgg ? 'water' : matchedName); // density checks

            let density = 1.0;
            let nutritionData = null;

            if (dbMatch) {
                density = dbMatch.density;
                nutritionData = dbMatch;
            }

            // If egg count is active, pass identifier
            const checkDensity = isEgg ? matchedName : density;
            const grams = convertToGrams(parsed.quantity, parsed.unit, checkDensity);

            if (grams !== null && (nutritionData || isEgg)) {
                // If egg, hardcode standard raw whole egg values per 100g (143 cal, 12.6g P, 0.7g C, 9.5g F, 0g fiber, 142mg sodium)
                const calPer100 = isEgg ? 143 : nutritionData.cal;
                const proteinPer100 = isEgg ? 12.6 : nutritionData.protein;
                const carbsPer100 = isEgg ? 0.7 : nutritionData.carbs;
                const fatPer100 = isEgg ? 9.5 : nutritionData.fat;
                const fiberPer100 = isEgg ? 0 : nutritionData.fiber;
                const sodiumPer100 = isEgg ? 142 : nutritionData.sodium;

                totalCal += grams * (calPer100 / 100);
                totalProtein += grams * (proteinPer100 / 100);
                totalCarbs += grams * (carbsPer100 / 100);
                totalFat += grams * (fatPer100 / 100);
                totalFiber += grams * (fiberPer100 / 100);
                totalSodium += grams * (sodiumPer100 / 100);
                totalWeightG += grams;
            } else {
                unmatchedItems.push(parsed.original);
            }
        });

        // Add Custom Ingredients
        customIngredients.forEach(item => {
            const weight = parseFloat(item.weight) || 0;
            totalWeightG += weight;

            if (item.mode === 'per-100g') {
                totalCal += weight * ((parseFloat(item.cal) || 0) / 100);
                totalProtein += weight * ((parseFloat(item.protein) || 0) / 100);
                totalCarbs += weight * ((parseFloat(item.carbs) || 0) / 100);
                totalFat += weight * ((parseFloat(item.fat) || 0) / 100);
                totalFiber += weight * ((parseFloat(item.fiber) || 0) / 100);
                totalSodium += weight * ((parseFloat(item.sodium) || 0) / 100);
            } else {
                totalCal += parseFloat(item.cal) || 0;
                totalProtein += parseFloat(item.protein) || 0;
                totalCarbs += parseFloat(item.carbs) || 0;
                totalFat += parseFloat(item.fat) || 0;
                totalFiber += parseFloat(item.fiber) || 0;
                totalSodium += parseFloat(item.sodium) || 0;
            }
        });

        // Toggle Rendering based on Per Serving vs. Total
        const divider = (displayMode === 'serving') ? servings : 1;
        const currentCal = totalCal / divider;
        const currentProtein = totalProtein / divider;
        const currentCarbs = totalCarbs / divider;
        const currentFat = totalFat / divider;
        const currentFiber = totalFiber / divider;
        const currentSodium = totalSodium / divider;
        const currentWeight = totalWeightG / divider;

        // Render Summary Card
        summaryModeTitle.textContent = displayMode === 'serving' ? 'Per Serving' : 'Total Recipe';
        statCalories.textContent = Math.round(currentCal);

        // Render Macro Visualizer splits (using 4-4-9)
        const kcalProtein = currentProtein * 4;
        const kcalCarbs = currentCarbs * 4;
        const kcalFat = currentFat * 9;
        const macroTotalKcal = kcalProtein + kcalCarbs + kcalFat;

        if (macroTotalKcal > 0) {
            const pctProtein = (kcalProtein / macroTotalKcal) * 100;
            const pctCarbs = (kcalCarbs / macroTotalKcal) * 100;
            const pctFat = (kcalFat / macroTotalKcal) * 100;

            barProtein.style.width = `${pctProtein}%`;
            barCarbs.style.width = `${pctCarbs}%`;
            barFat.style.width = `${pctFat}%`;

            labelProteinKcal.textContent = `${Math.round(kcalProtein)} kcal (${Math.round(pctProtein)}%)`;
            labelCarbsKcal.textContent = `${Math.round(kcalCarbs)} kcal (${Math.round(pctCarbs)}%)`;
            labelFatKcal.textContent = `${Math.round(kcalFat)} kcal (${Math.round(pctFat)}%)`;
        } else {
            barProtein.style.width = '0%';
            barCarbs.style.width = '0%';
            barFat.style.width = '0%';
            labelProteinKcal.textContent = '0 kcal (0%)';
            labelCarbsKcal.textContent = '0 kcal (0%)';
            labelFatKcal.textContent = '0 kcal (0%)';
        }

        // Render Est. Nutrition Facts Label
        lblServings.textContent = servings;
        
        let sizeStr = '--';
        if (totalWeightG > 0) {
            const sGrams = totalWeightG / servings;
            sizeStr = sGrams >= 1000 ? `${(sGrams / 1000).toFixed(2)} kg` : `${Math.round(sGrams)} g`;
        }
        lblServingSize.textContent = displayMode === 'serving' ? sizeStr : (totalWeightG >= 1000 ? `${(totalWeightG / 1000).toFixed(2)} kg` : `${Math.round(totalWeightG)} g`);
        
        lblCalories.textContent = Math.round(currentCal);
        lblFat.textContent = `${currentFat.toFixed(1).replace(/\.0$/, '')}g`;
        lblSodium.textContent = `${Math.round(currentSodium)}mg`;
        lblCarbs.textContent = `${currentCarbs.toFixed(1).replace(/\.0$/, '')}g`;
        lblFiber.textContent = `${currentFiber.toFixed(1).replace(/\.0$/, '')}g`;
        lblProtein.textContent = `${currentProtein.toFixed(1).replace(/\.0$/, '')}g`;

        // Calculate DVs (Fat 78g, Sodium 2300mg, Carbs 275g, Fiber 28g)
        lblFatDv.textContent = `${Math.round((currentFat / 78) * 100)}%`;
        lblSodiumDv.textContent = `${Math.round((currentSodium / 2300) * 100)}%`;
        lblCarbsDv.textContent = `${Math.round((currentCarbs / 275) * 100)}%`;
        lblFiberDv.textContent = `${Math.round((currentFiber / 28) * 100)}%`;

        // Warnings Card Rendering
        ambiguousWarningsContainer.innerHTML = '';
        ambiguousWarnings.forEach(w => {
            const el = document.createElement('div');
            el.className = 'review-warning-item';
            
            let actionBtnTextHtml = '';
            if (w.type === 'rice') {
                actionBtnTextHtml = `
                    <div class="action-links">
                        <button type="button" class="action-btn" onclick="replaceIngredientText('${w.item}', 'jasmine rice dry')">Use Dry</button>
                        <button type="button" class="action-btn" onclick="replaceIngredientText('${w.item}', 'jasmine rice cooked')">Use Cooked</button>
                    </div>
                `;
            } else if (w.type === 'chicken') {
                actionBtnTextHtml = `
                    <div class="action-links">
                        <button type="button" class="action-btn" onclick="replaceIngredientText('${w.item}', 'chicken breast raw')">Use Raw</button>
                        <button type="button" class="action-btn" onclick="replaceIngredientText('${w.item}', 'chicken breast cooked')">Use Cooked</button>
                    </div>
                `;
            } else if (w.type === 'pasta') {
                actionBtnTextHtml = `
                    <div class="action-links">
                        <button type="button" class="action-btn" onclick="replaceIngredientText('${w.item}', 'pasta dry')">Use Dry</button>
                        <button type="button" class="action-btn" onclick="replaceIngredientText('${w.item}', 'pasta cooked')">Use Cooked</button>
                    </div>
                `;
            }

            el.innerHTML = `
                <span class="icon">⚠️</span>
                <div>
                    <div>${w.message}</div>
                    ${actionBtnTextHtml}
                </div>
            `;
            ambiguousWarningsContainer.appendChild(el);
        });

        // Unmatched Lists
        unmatchedList.innerHTML = '';
        unmatchedItems.forEach(item => {
            const li = document.createElement('li');
            li.textContent = item;
            unmatchedList.appendChild(li);
        });

        unmatchedContainer.style.display = unmatchedItems.length > 0 ? 'block' : 'none';
        
        const hasAlerts = ambiguousWarnings.length > 0 || unmatchedItems.length > 0;
        warningCard.style.display = hasAlerts ? 'block' : 'none';
    }

    // Add Custom Ingredient Handler
    addCustomBtn.addEventListener('click', () => {
        const name = customNameInput.value.trim();
        const weight = parseFloat(customWeightInput.value) || 0;
        const mode = customModeSelect.value;
        const cal = parseFloat(customCalInput.value) || 0;
        const protein = parseFloat(customProteinInput.value) || 0;
        const carbs = parseFloat(customCarbsInput.value) || 0;
        const fat = parseFloat(customFatInput.value) || 0;
        const fiber = parseFloat(customFiberInput.value) || 0;
        const sodium = parseFloat(customSodiumInput.value) || 0;

        if (!name || weight <= 0) {
            alert('Please enter a valid ingredient name and weight in grams.');
            return;
        }

        const customItem = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 5),
            name,
            weight,
            mode,
            cal,
            protein,
            carbs,
            fat,
            fiber,
            sodium
        };

        customIngredients.push(customItem);
        localStorage.setItem('savedCustomIngredients', JSON.stringify(customIngredients));

        // Reset Inputs
        customNameInput.value = '';
        customWeightInput.value = '';
        customCalInput.value = '';
        customProteinInput.value = '';
        customCarbsInput.value = '';
        customFatInput.value = '';
        customFiberInput.value = '';
        customSodiumInput.value = '';

        renderCustomIngredients();
        calculateNutrition();
    });

    function renderCustomIngredients() {
        customActiveList.innerHTML = '';
        if (customIngredients.length === 0) {
            customActiveContainer.style.display = 'none';
            return;
        }

        customActiveContainer.style.display = 'block';
        customIngredients.forEach(item => {
            const row = document.createElement('div');
            row.className = 'custom-item-row';
            
            const modeSuffix = item.mode === 'per-100g' ? ' /100g' : ' total';
            row.innerHTML = `
                <div>
                    <span class="name">${item.name}</span> <span style="font-size:11px;color:var(--accent);font-weight:600;text-transform:uppercase;">[Custom]</span>
                    <div class="details">${item.weight}g &middot; ${Math.round(item.cal)} kcal${modeSuffix} &middot; P: ${item.protein}g &middot; C: ${item.carbs}g &middot; F: ${item.fat}g</div>
                </div>
                <button type="button" class="remove-btn" aria-label="Remove" data-id="${item.id}">&times;</button>
            `;

            row.querySelector('.remove-btn').addEventListener('click', (e) => {
                const id = e.target.dataset.id;
                customIngredients = customIngredients.filter(x => x.id !== id);
                localStorage.setItem('savedCustomIngredients', JSON.stringify(customIngredients));
                renderCustomIngredients();
                calculateNutrition();
            });

            customActiveList.appendChild(row);
        });
    }

    // Toggle Display Modes
    displayModeServingBtn.addEventListener('click', () => {
        displayMode = 'serving';
        displayModeServingBtn.classList.add('active');
        displayModeTotalBtn.classList.remove('active');
        calculateNutrition();
    });

    displayModeTotalBtn.addEventListener('click', () => {
        displayMode = 'total';
        displayModeTotalBtn.classList.add('active');
        displayModeServingBtn.classList.remove('active');
        calculateNutrition();
    });

    // Inputs Listeners
    recipeInput.addEventListener('input', calculateNutrition);
    servingsInput.addEventListener('input', calculateNutrition);

    // Initial Trigger
    calculateNutrition();
});
