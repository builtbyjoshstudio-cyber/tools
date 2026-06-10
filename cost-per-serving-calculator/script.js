/**
 * Cost Per Serving Calculator logic
 * Fully integrates with Tynkr Kinetic theme.
 */

// Global state
let ingredients = [];

const factors = {
    // Mass (base: g)
    'g': 1,
    'kg': 1000,
    'oz': 28.3495,
    'lb': 453.592,
    // Volume (base: ml)
    'ml': 1,
    'L': 1000,
    'tsp': 4.92892,
    'tbsp': 14.7868,
    'cup': 240,
    // Count
    'unit': 1
};

const dimensionGroups = {
    'g': 'mass', 'kg': 'mass', 'oz': 'mass', 'lb': 'mass',
    'ml': 'volume', 'L': 'volume', 'tsp': 'volume', 'tbsp': 'volume', 'cup': 'volume',
    'unit': 'count'
};

document.addEventListener('DOMContentLoaded', () => {
    const servingsInput = document.getElementById('servings');
    const wasteSlider = document.getElementById('waste');
    const wasteValueDisplay = document.getElementById('waste-val');
    const addIngredientBtn = document.getElementById('add-ingredient-btn');
    
    // Populate ingredients datalist for auto-complete
    const datalist = document.getElementById('ingredients-list');
    if (datalist && typeof INGREDIENT_DENSITIES !== 'undefined') {
        Object.keys(INGREDIENT_DENSITIES).sort().forEach(ing => {
            const option = document.createElement('option');
            option.value = ing.charAt(0).toUpperCase() + ing.slice(1);
            datalist.appendChild(option);
        });
    }

    // Wire global settings
    servingsInput.addEventListener('input', calculate);
    wasteSlider.addEventListener('input', (e) => {
        wasteValueDisplay.textContent = `${e.target.value}%`;
        calculate();
    });
    
    addIngredientBtn.addEventListener('click', () => {
        addIngredientRow();
        calculate();
    });

    // Initial 2 rows
    addIngredientRow();
    addIngredientRow();
    
    calculate();
});

function addIngredientRow() {
    const container = document.getElementById('ledger-rows');
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
    
    const rowObj = {
        id: id,
        name: '',
        usedVal: 0,
        usedUnit: 'g',
        packVal: 0,
        packUnit: 'g',
        packCost: 0
    };
    
    ingredients.push(rowObj);
    
    const rowEl = document.createElement('div');
    rowEl.className = 'ledger-row';
    rowEl.id = `row-${id}`;
    rowEl.innerHTML = `
        <div class="input-group col-span-mobile">
            <span class="input-label" style="display:none">Ingredient Name</span>
            <input type="text" placeholder="Ingredient Name (e.g. Flour)" class="form-input ing-name" list="ingredients-list">
        </div>
        <div class="input-group">
            <span class="input-label" style="display:none">Amount Used</span>
            <input type="number" placeholder="Used" step="any" min="0" class="form-input ing-used">
        </div>
        <div class="input-group">
            <span class="input-label" style="display:none">Used Unit</span>
            <select class="form-input ing-used-unit">
                <optgroup label="Mass">
                    <option value="g" selected>g</option>
                    <option value="kg">kg</option>
                    <option value="oz">oz</option>
                    <option value="lb">lb</option>
                </optgroup>
                <optgroup label="Volume">
                    <option value="ml">ml</option>
                    <option value="L">L</option>
                    <option value="tsp">tsp</option>
                    <option value="tbsp">tbsp</option>
                    <option value="cup">cup</option>
                </optgroup>
                <optgroup label="Count">
                    <option value="unit">unit</option>
                </optgroup>
            </select>
        </div>
        <div class="input-group">
            <span class="input-label" style="display:none">Pack Size</span>
            <input type="number" placeholder="Pack" step="any" min="0" class="form-input ing-pack">
        </div>
        <div class="input-group">
            <span class="input-label" style="display:none">Pack Unit</span>
            <select class="form-input ing-pack-unit">
                <optgroup label="Mass">
                    <option value="g" selected>g</option>
                    <option value="kg">kg</option>
                    <option value="oz">oz</option>
                    <option value="lb">lb</option>
                </optgroup>
                <optgroup label="Volume">
                    <option value="ml">ml</option>
                    <option value="L">L</option>
                    <option value="tsp">tsp</option>
                    <option value="tbsp">tbsp</option>
                    <option value="cup">cup</option>
                </optgroup>
                <optgroup label="Count">
                    <option value="unit">unit</option>
                </optgroup>
            </select>
        </div>
        <div class="input-group">
            <span class="input-label" style="display:none">Pack Cost</span>
            <div class="currency-input-wrapper">
                <input type="number" placeholder="Cost" step="0.01" min="0" class="form-input ing-cost">
            </div>
        </div>
        <div>
            <button type="button" class="delete-row-btn" aria-label="Remove Ingredient">&times;</button>
        </div>
    `;
    
    // Wire up events
    const nameInput = rowEl.querySelector('.ing-name');
    const usedInput = rowEl.querySelector('.ing-used');
    const usedUnitSelect = rowEl.querySelector('.ing-used-unit');
    const packInput = rowEl.querySelector('.ing-pack');
    const packUnitSelect = rowEl.querySelector('.ing-pack-unit');
    const costInput = rowEl.querySelector('.ing-cost');
    const deleteBtn = rowEl.querySelector('.delete-row-btn');
    
    nameInput.addEventListener('input', (e) => { rowObj.name = e.target.value; calculate(); });
    usedInput.addEventListener('input', (e) => { rowObj.usedVal = parseFloat(e.target.value) || 0; calculate(); });
    usedUnitSelect.addEventListener('change', (e) => { rowObj.usedUnit = e.target.value; calculate(); });
    packInput.addEventListener('input', (e) => { rowObj.packVal = parseFloat(e.target.value) || 0; calculate(); });
    packUnitSelect.addEventListener('change', (e) => { rowObj.packUnit = e.target.value; calculate(); });
    costInput.addEventListener('input', (e) => { rowObj.packCost = parseFloat(e.target.value) || 0; calculate(); });
    
    deleteBtn.addEventListener('click', () => {
        removeIngredientRow(id, rowEl);
    });
    
    container.appendChild(rowEl);
}

function removeIngredientRow(id, element) {
    ingredients = ingredients.filter(i => i.id !== id);
    element.remove();
    calculate();
}

function calculate() {
    const servingsVal = parseInt(document.getElementById('servings').value) || 4;
    const servings = Math.max(1, servingsVal);
    const waste = parseFloat(document.getElementById('waste').value) || 0;
    
    let totalCost = 0;
    const breakdownList = [];
    
    ingredients.forEach(item => {
        // Skip if entirely empty/unfilled
        if (!item.name && item.usedVal === 0 && item.packVal === 0 && item.packCost === 0) {
            return;
        }
        
        const nameDisplay = item.name || 'Unnamed Ingredient';
        
        // Mismatch check
        let usedDim = dimensionGroups[item.usedUnit];
        let packDim = dimensionGroups[item.packUnit];
        
        let densityMatch = null;
        let isDensityConverted = false;
        
        if (usedDim !== packDim) {
            densityMatch = findIngredientDensity(item.name);
            if (densityMatch && ((usedDim === 'volume' && packDim === 'mass') || (usedDim === 'mass' && packDim === 'volume'))) {
                isDensityConverted = true;
            } else {
                breakdownList.push({
                    name: nameDisplay,
                    mismatch: true,
                    message: `Dimension mismatch (${usedDim} vs ${packDim})`
                });
                // Visual warning on row border
                const rowEl = document.getElementById(`row-${item.id}`);
                if (rowEl) rowEl.style.borderColor = 'var(--warn)';
                return;
            }
        }
        
        // Clear visual warning
        const rowEl = document.getElementById(`row-${item.id}`);
        if (rowEl) rowEl.style.borderColor = '';
        
        if (item.usedVal > 0 && item.packVal > 0 && item.packCost > 0) {
            const packFactor = factors[item.packUnit];
            const packBase = item.packVal * packFactor;
            
            let usedBase = 0;
            if (isDensityConverted) {
                const density = densityMatch.density;
                const usedFactor = factors[item.usedUnit];
                
                if (usedDim === 'volume' && packDim === 'mass') {
                    // Used volume (ml) -> mass (grams)
                    const usedMl = item.usedVal * usedFactor;
                    const usedGrams = usedMl * density;
                    usedBase = usedGrams * (1 + waste / 100);
                } else {
                    // Used mass (grams) -> volume (ml)
                    const usedGrams = item.usedVal * usedFactor;
                    const usedMl = usedGrams / density;
                    usedBase = usedMl * (1 + waste / 100);
                }
            } else {
                const usedFactor = factors[item.usedUnit];
                usedBase = item.usedVal * usedFactor * (1 + waste / 100);
            }
            
            const itemCost = item.packCost * (usedBase / packBase);
            totalCost += itemCost;
            
            const leftoverBase = Math.max(0, packBase - usedBase);
            const leftoverVal = leftoverBase / packFactor;
            const pctLeft = (leftoverBase / packBase) * 100;
            
            // Format leftover display
            let leftoverStr = '';
            if (leftoverVal > 0) {
                // If it is a clean integer show it, else 2 decimal places
                const formattedLeftover = leftoverVal % 1 === 0 ? leftoverVal : leftoverVal.toFixed(2);
                leftoverStr = `${formattedLeftover} ${item.packUnit} left (${pctLeft.toFixed(0)}% left)`;
            } else {
                leftoverStr = `0 ${item.packUnit} left (0% left)`;
            }
            
            let conversionNote = isDensityConverted ? ` (via ${densityMatch.name})` : '';
            
            breakdownList.push({
                name: nameDisplay,
                mismatch: false,
                cost: itemCost,
                leftover: leftoverStr + conversionNote
            });
        } else {
            // Partially filled but not ready
            breakdownList.push({
                name: nameDisplay,
                mismatch: false,
                cost: 0,
                leftover: 'Incomplete parameters'
            });
        }
    });
    
    // Render outputs
    const costPerServing = totalCost / servings;
    
    document.getElementById('total-cost-output').textContent = `$${totalCost.toFixed(2)}`;
    document.getElementById('cost-per-serving-output').textContent = `$${costPerServing.toFixed(2)}`;
    
    // Render breakdown panel
    const listContainer = document.getElementById('breakdown-list');
    listContainer.innerHTML = '';
    
    if (breakdownList.length === 0) {
        listContainer.innerHTML = `
            <div style="font-family: var(--font-ui); font-size: 13px; color: var(--muted); text-align: center; padding: 24px 0;">
                No ingredients entered yet. Fill out the ledger above to view cost breakdowns.
            </div>
        `;
        return;
    }
    
    breakdownList.forEach(item => {
        const rowEl = document.createElement('div');
        rowEl.className = 'glass-lite anatomy-row';
        
        if (item.mismatch) {
            rowEl.style.borderColor = 'color-mix(in oklab, var(--warn) 30%, transparent)';
            rowEl.innerHTML = `
                <div class="ix" style="color: var(--warn); background: color-mix(in oklab, var(--warn) 15%, transparent)">!</div>
                <div>
                    <h4>${escapeHtml(item.name)}</h4>
                    <p class="item-breakdown-details" style="color: var(--warn)">${item.message}</p>
                </div>
            `;
        } else {
            rowEl.innerHTML = `
                <div class="ix">$</div>
                <div>
                    <h4>${escapeHtml(item.name)}</h4>
                    <p class="item-breakdown-details">
                        Allocated: <b>$${item.cost.toFixed(2)}</b> &middot; ${escapeHtml(item.leftover)}
                    </p>
                </div>
            `;
        }
        
        listContainer.appendChild(rowEl);
    });
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
