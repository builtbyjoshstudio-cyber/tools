/**
 * Cost Per Serving Calculator logic
 * Fully integrates with Tynkr Kinetic theme.
 */

// Global state
let ingredients = [];
let rowSeq = 0;

// Saved inputs (this browser only): the ledger rows, servings and waste. Never results, never uploaded.
const STORE_KEY = 'tynkr-cost-per-serving-calculator-v1';
const MAX_ROWS = 100;

// Seeded example: the same spaghetti-for-four the page copy walks through ($12.24 / $3.06).
const EXAMPLE_ROWS = [
    { name: 'Ground beef', usedVal: 1, usedUnit: 'lb', packVal: 3, packUnit: 'lb', packCost: 14.97 },
    { name: 'Spaghetti', usedVal: 12, usedUnit: 'oz', packVal: 16, packUnit: 'oz', packCost: 1.92 },
    { name: 'Pasta sauce', usedVal: 24, usedUnit: 'oz', packVal: 24, packUnit: 'oz', packCost: 3.48 },
    { name: 'Onion', usedVal: 1, usedUnit: 'unit', packVal: 3, packUnit: 'unit', packCost: 2.49 },
    { name: 'Parmesan', usedVal: 2, usedUnit: 'oz', packVal: 8, packUnit: 'oz', packCost: 6.00 }
];

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
        saveInputs();
    });

    // Open on the worked example so the first view shows a real result,
    // unless this browser saved a ledger on an earlier visit
    const saved = loadSavedInputs();
    if (saved) {
        servingsInput.value = saved.servings;
        wasteSlider.value = saved.waste;
        wasteValueDisplay.textContent = `${saved.waste}%`;
        saved.rows.forEach(row => addIngredientRow(row));
        const note = document.getElementById('example-note');
        if (note) note.style.display = 'none';
    } else {
        EXAMPLE_ROWS.forEach(row => addIngredientRow(row));
    }

    // Every edit is saved (input/change bubble up from the rows)
    ['input', 'change'].forEach(type => {
        document.getElementById('ledger-rows').addEventListener(type, saveInputs);
        servingsInput.addEventListener(type, saveInputs);
        wasteSlider.addEventListener(type, saveInputs);
    });

    // Start fresh: drop every row and leave two empty ones
    const clearLedgerBtn = document.getElementById('clear-ledger-btn');
    if (clearLedgerBtn) {
        clearLedgerBtn.addEventListener('click', () => {
            // the ledger is saved now, so clearing anything the user entered is permanent: ask first
            const hasRows = ingredients.some(i => i.name || i.usedVal || i.packVal || i.packCost);
            if (!isExample() && hasRows && !confirm('Start fresh? This clears your ledger and what is saved in this browser.')) return;
            ingredients = [];
            document.getElementById('ledger-rows').innerHTML = '';
            const note = document.getElementById('example-note');
            if (note) note.style.display = 'none';
            addIngredientRow();
            addIngredientRow();
            calculate();
            saveInputs();
        });
    }

    // Reset to the example: put the worked example back and forget the saved ledger
    const resetBtn = document.getElementById('reset-ledger-btn');
    resetBtn.addEventListener('click', () => {
        if (!isExample() && !confirm('Reset to the example? This replaces your ledger and clears what is saved in this browser.')) return;
        ingredients = [];
        document.getElementById('ledger-rows').innerHTML = '';
        EXAMPLE_ROWS.forEach(row => addIngredientRow(row));
        servingsInput.value = servingsInput.defaultValue;
        wasteSlider.value = wasteSlider.defaultValue;
        wasteValueDisplay.textContent = `${wasteSlider.value}%`;
        const note = document.getElementById('example-note');
        if (note) note.style.display = '';
        try { localStorage.removeItem(STORE_KEY); } catch (e) { /* nothing saved */ }
        calculate();
    });

    calculate();
});

// True while the page still shows the untouched worked example
function isExample() {
    const servingsInput = document.getElementById('servings');
    const wasteSlider = document.getElementById('waste');
    return servingsInput.value === servingsInput.defaultValue && wasteSlider.value === wasteSlider.defaultValue &&
        ingredients.length === EXAMPLE_ROWS.length &&
        ingredients.every((item, i) => Object.keys(EXAMPLE_ROWS[i]).every(k => item[k] === EXAMPLE_ROWS[i][k]));
}

function saveInputs() {
    const data = {
        servings: document.getElementById('servings').value,
        waste: document.getElementById('waste').value,
        rows: ingredients.map(i => ({ name: i.name, usedVal: i.usedVal, usedUnit: i.usedUnit, packVal: i.packVal, packUnit: i.packUnit, packCost: i.packCost }))
    };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch (e) { /* not remembered */ }
}

// Read the saved ledger back trusting nothing: numbers re-parsed and clamped, units checked against
// the unit list, names capped, rows capped. Returns null (show the example) when nothing usable is saved.
function loadSavedInputs() {
    let data;
    try { data = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { return null; }
    if (!data || typeof data !== 'object' || !Array.isArray(data.rows)) return null;
    const num = (v, min, max, fallback) => {
        const n = (typeof v === 'number' || typeof v === 'string') ? parseFloat(v) : NaN;
        return isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
    };
    const unit = u => (typeof u === 'string' && Object.prototype.hasOwnProperty.call(factors, u)) ? u : 'g';
    // Servings re-parsed the way calculate() reads the field (parseInt, 0/blank -> 4), so a reload shows the same result
    const servings = (typeof data.servings === 'number' || typeof data.servings === 'string') ? parseInt(data.servings, 10) : NaN;
    return {
        servings: Math.min(100000, Math.max(1, servings || 4)),
        waste: Math.round(num(data.waste, 0, 50, 0) / 5) * 5,
        rows: data.rows.slice(0, MAX_ROWS).filter(r => r && typeof r === 'object').map(r => ({
            name: typeof r.name === 'string' ? r.name.slice(0, 200) : '',
            usedVal: num(r.usedVal, 0, 1e9, 0),
            usedUnit: unit(r.usedUnit),
            packVal: num(r.packVal, 0, 1e9, 0),
            packUnit: unit(r.packUnit),
            packCost: Math.round(num(r.packCost, 0, 1e9, 0) * 100) / 100
        }))
    };
}

function addIngredientRow(preset) {
    const container = document.getElementById('ledger-rows');
    const id = (++rowSeq).toString(36);
    
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
            <input type="text" aria-label="Ingredient Name" placeholder="Ingredient Name (e.g. Flour)" class="form-input ing-name" list="ingredients-list">
        </div>
        <div class="input-group">
            <span class="input-label" style="display:none">Amount Used</span>
            <input type="number" aria-label="Amount Used" placeholder="Used" step="any" min="0" class="form-input ing-used">
        </div>
        <div class="input-group">
            <span class="input-label" style="display:none">Used Unit</span>
            <select aria-label="Used Unit" class="form-input ing-used-unit">
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
            <input type="number" aria-label="Pack Size" placeholder="Pack" step="any" min="0" class="form-input ing-pack">
        </div>
        <div class="input-group">
            <span class="input-label" style="display:none">Pack Unit</span>
            <select aria-label="Pack Unit" class="form-input ing-pack-unit">
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
                <input type="number" aria-label="Pack Cost" placeholder="Cost" step="0.01" min="0" class="form-input ing-cost">
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

    if (preset) {
        Object.assign(rowObj, preset);
        nameInput.value = preset.name;
        usedInput.value = preset.usedVal || '';
        usedUnitSelect.value = preset.usedUnit;
        packInput.value = preset.packVal || '';
        packUnitSelect.value = preset.packUnit;
        costInput.value = preset.packCost ? preset.packCost.toFixed(2) : '';
    }
    
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
    saveInputs();
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
                    <h2>${escapeHtml(item.name)}</h2>
                    <p class="item-breakdown-details" style="color: var(--warn)">${item.message}</p>
                </div>
            `;
        } else {
            rowEl.innerHTML = `
                <div class="ix">$</div>
                <div>
                    <h2>${escapeHtml(item.name)}</h2>
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
