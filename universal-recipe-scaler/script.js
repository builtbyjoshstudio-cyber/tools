document.addEventListener('DOMContentLoaded', () => {
    // Theme (Light / Dark) handled globally by ../kinetic.js

    const recipeInput = document.getElementById('recipe-input');
    const recipeOutput = document.getElementById('recipe-output');
    const scaleButtons = document.querySelectorAll('.scale-btn');
    const customScaleBtn = document.getElementById('apply-custom-scale');
    const originalServings = document.getElementById('original-servings');
    const targetServings = document.getElementById('target-servings');
    const currentMultiplierDisplay = document.getElementById('current-multiplier-display');
    const unitImperialBtn = document.getElementById('unit-imperial');
    const unitMetricBtn = document.getElementById('unit-metric');
    let currentUnit = 'imperial';
    const copyBtn = document.getElementById('copy-btn');
    const printBtn = document.getElementById('print-btn');
    const useDensityCheckbox = document.getElementById('use-density');
    const clearRecipeBtn = document.getElementById('clear-recipe-btn');
    const exampleNote = document.getElementById('example-note');

    let currentMultiplier = 1;

    // Seeded example for a first visit: fractions, eggs, a package size and an oven temp.
    // Serves four, matching the default Original Servings.
    const EXAMPLE_RECIPE = [
        '1 1/2 lb ground beef',
        '1/2 cup breadcrumbs',
        '1/3 cup milk',
        '2 eggs',
        '1/2 cup chopped onion',
        '1 (8 ounce) can tomato sauce',
        '2 tbsp brown sugar',
        '1 tsp salt',
        '1/2 tsp black pepper',
        'Bake at 350°F'
    ].join('\n');

    function autoResizeInput() {
        recipeInput.style.height = 'auto';
        recipeInput.style.height = recipeInput.scrollHeight + 'px';
    }

    // Load saved recipe from local storage. Nothing saved yet (a first visit) opens on the
    // example; an empty save means the user cleared it, so it stays empty.
    let savedRecipe = null;
    try {
        savedRecipe = localStorage.getItem('savedRecipe');
    } catch (e) { /* storage blocked (private mode): still open on the example */ }
    if (savedRecipe !== null) {
        recipeInput.value = savedRecipe;
    } else {
        recipeInput.value = EXAMPLE_RECIPE;
    }
    autoResizeInput();

    function esc(s) {
        return String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
    }

    // Parse string to float
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

    // Float to readable fraction (approximating to practical cooking measurements).
    // A fraction is used only when it's within 5% (and 0.1) of the real amount. Teaspoons
    // (eighths) also get 1/8, 3/8, 5/8 and 7/8 and always take the nearest one,
    // since nothing finer than 1/8 tsp gets measured.
    function toFraction(num, eighths) {
        if (isNaN(num) || num <= 0) return '';
        
        const tolerance = 1.0E-6;
        const fractions = [
            { val: 0, text: '' },
            { val: 1/4, text: '1/4' },
            { val: 1/3, text: '1/3' },
            { val: 1/2, text: '1/2' },
            { val: 2/3, text: '2/3' },
            { val: 3/4, text: '3/4' },
            { val: 1, text: '' } // handle rounding up to next whole
        ];
        if (eighths) {
            fractions.push({ val: 1/8, text: '1/8' }, { val: 3/8, text: '3/8' }, { val: 5/8, text: '5/8' }, { val: 7/8, text: '7/8' });
        }

        let whole = Math.floor(num + tolerance);
        let decimal = num - whole;
        
        if (1 - decimal < tolerance) {
            whole += 1;
            decimal = 0;
        }

        let closestFraction = fractions[0];
        let minDiff = 1;

        for (let f of fractions) {
            const diff = Math.abs(decimal - f.val);
            if (diff < minDiff) {
                minDiff = diff;
                closestFraction = f;
            }
        }

        if (closestFraction.val === 1) {
            whole += 1;
            closestFraction = fractions[0];
        }

        if (eighths ? (whole === 0 && closestFraction.val === 0) : minDiff > Math.min(0.1, num * 0.05)) {
            // If it doesn't cleanly round to a practical cooking fraction, try to just show sensible decimals.
            let res = Number.isInteger(num) ? num.toString() : num.toFixed(2).replace(/\.?0+$/, '');
            return res;
        }

        if (closestFraction.val === 0) {
            return whole > 0 ? whole.toString() : '0';
        }

        if (whole === 0) {
            return closestFraction.text;
        }

        return `${whole} ${closestFraction.text}`;
    }

    // US cups and spoons, written the way a standard measuring set holds them
    // (1 cup = 16 tbsp = 48 tsp): cups down to 1/4 cup, then whole or half
    // tablespoons down to 1 tbsp, then teaspoons. A smaller measure is added only
    // when the bigger one alone would be more than 5% off, so 1/3 cup halved is
    // 2 tbsp + 2 tsp (not 1/4 cup) and 3/4 tsp halved is 3/8 tsp.
    function toUsVolume(amount, unit, unitText) {
        const tsp = amount * (unit === 'cup' ? 48 : unit === 'tbsp' ? 3 : 1);
        const tol = tsp * 0.05;
        const parts = [];
        let rest = tsp;
        if (unit === 'cup') {
            const cups = rest / 48;
            const whole = Math.floor(cups);
            let near = whole, below = whole;
            [1/4, 1/3, 1/2, 2/3, 3/4, 1].forEach(f => {
                if (Math.abs(cups - whole - f) < Math.abs(cups - near)) near = whole + f;
                if (whole + f <= cups) below = whole + f;
            });
            if (near >= 1/4 && Math.abs(cups - near) * 48 <= tol) return `${toFraction(near)} ${unitText}`;
            if (below > 0) {
                parts.push(`${toFraction(below)} ${unitText}`);
                rest -= below * 48;
            }
        }
        if (unit !== 'tsp') {
            const tbspText = unit === 'tbsp' ? unitText : 'tbsp';
            const half = Math.round(rest / 1.5) / 2;
            if (half >= 1 && Math.abs(rest - half * 3) <= tol) {
                parts.push(`${toFraction(half)} ${tbspText}`);
                rest = 0;
            } else if (rest >= 3) {
                const wholeTbsp = Math.floor(rest / 3);
                parts.push(`${wholeTbsp} ${tbspText}`);
                rest -= wholeTbsp * 3;
            }
        }
        if (!parts.length || rest > 1/16) {
            parts.push(`${toFraction(rest, true)} ${unit === 'tsp' ? unitText : 'tsp'}`);
        }
        return parts.join(' + ');
    }

    function scaleRecipe() {
        const text = recipeInput.value;
        // The untouched example is never saved, so it only ever stands in for "nothing saved yet"
        try {
            if (text === EXAMPLE_RECIPE) localStorage.removeItem('savedRecipe');
            else localStorage.setItem('savedRecipe', text);
        } catch (e) { /* storage blocked: scaling still works, it just isn't remembered */ }
        if (exampleNote) exampleNote.style.display = text === EXAMPLE_RECIPE ? 'block' : 'none';

        const eggTipBox = document.getElementById('egg-tip-box');
        const volumetricWarningBox = document.getElementById('volumetric-warning-box');

        if (!text.trim()) {
            recipeOutput.innerHTML = '<p class="placeholder-text">Your scaled ingredients will appear here...</p>';
            if (eggTipBox) eggTipBox.style.display = 'none';
            if (volumetricWarningBox) volumetricWarningBox.style.display = 'none';
            return;
        }

        const convertToMetric = (currentUnit === 'metric');
        const useDensity = useDensityCheckbox ? useDensityCheckbox.checked : false;
        const lines = text.split('\n');
        
        recipeOutput.innerHTML = ''; // Clear previous output
        
        let hasFractionalEggs = false;
        let hasVolumetricUnits = false;

        const unitRegex = /(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.\d+|\d+)\s*(cups?|c\.?|tablespoons?|tbsps?\.?|teaspoons?|tsps?\.?|fluid\s*ounces?|fl\.?\s*oz\.?|ounces?|ozs?\.?|grams?|g\.?|milliliters?|ml\.?|kilograms?|kgs?|liters?|litres?|l|pounds?|lbs?\.?|quarts?|qts?\.?|pints?|pts?\.?|gallons?|gals?\.?|°?f|fahrenheit|°?c|celsius|inches|inch|in\.?|cm|centimeters?|pinch(?:es)?|dash(?:es)?|cloves?|pieces?)\b/gi;
        const startNumberRegex = /^(\s*)(\d+\s+\d+\/\d+|\d+\/\d+|\d*\.\d+|\d+)(?!\s*(?:cups?|c\.?|tablespoons?|tbsps?\.?|teaspoons?|tsps?\.?|fluid\s*ounces?|fl\.?\s*oz\.?|ounces?|ozs?\.?|grams?|g\.?|milliliters?|ml\.?|kilograms?|kgs?|liters?|litres?|l|pounds?|lbs?\.?|quarts?|qts?\.?|pints?|pts?\.?|gallons?|gals?\.?|°?f|fahrenheit|inches|inch|in\.?|pinch(?:es)?|dash(?:es)?|cloves?|pieces?)\b)/i;

        lines.forEach(line => {
            if (!line.trim()) {
                recipeOutput.appendChild(document.createElement('br'));
                return;
            }

            // The user's text is escaped before any highlight markup is added around amounts
            let processedLine = esc(line);
            const isEggLine = /\beggs?\b/i.test(line);
            let lineHasFraction = false;
            const densityMatch = useDensity ? findIngredientDensity(line) : null;

            // "1 (14.5 ounce) can tomatoes": the parenthetical is the package size as
            // printed, not an amount. It still gets unit conversion but is never
            // multiplied; the leading count scales below.
            const pkgMatch = /^\s*(?:\d+\s+\d+\/\d+|\d+\/\d+|\d*\.\d+|\d+)\s*\([^)]*\d[^)]*\)/.exec(processedLine);
            const pkgPrefix = pkgMatch ? pkgMatch[0] : '';
            let unitMultiplier = currentMultiplier;

            // Globally replace all quantities with known units
            const scaleUnits = (match, originalNumStr, unitStr, offset, whole) => {
                let num = parseNumber(originalNumStr);
                if (isNaN(num)) return match;

                let unit = unitStr.toLowerCase();
                let isF = /^(°?f|fahrenheit)$/.test(unit);
                let isIn = /^(inches|inch|in\.?)$/.test(unit);
                // A bare "c" is the cup abbreviation ("1 c broth"); it means Celsius only with a
                // degree sign, the word "celsius", or when the words just before the amount set up a
                // temperature ("Roast at 200 C", "Bake 180 C", "350 F / 180 C"). After "to" it takes
                // 20 or more, so "Heat oil to 180 C" is Celsius but "1 to 2 c broth" and
                // "reduced to 1 c" stay cups.
                const before = whole.slice(0, offset);
                let isC = /^(°c|celsius)$/.test(unit) ||
                    (unit === 'c' && (/(\b(at|bake|oven|preheat)|\d\s*°?\s*f\W*)\s*$/i.test(before) ||
                        (num >= 20 && /\bto\s*$/i.test(before))));
                let isCm = /^(centimeters?|cm\.?)$/.test(unit);

                // Multiplier conditionally applied
                let scaledNum = num;
                if (!isF && !isIn && !isC && !isCm) {
                    scaledNum = num * unitMultiplier;
                }

                if (isEggLine) {
                    const isFraction = Math.abs(scaledNum - Math.round(scaledNum)) > 0.01;
                    if (isFraction) {
                        lineHasFraction = true;
                        hasFractionalEggs = true;
                    }
                }

                let outUnit = unitStr; // preserve original case if possible
                let useFraction = true;

                // Normalize unit for conversion logic
                let isQt = /^(quarts?|qts?\.?)$/.test(unit);
                let isPt = /^(pints?|pts?\.?)$/.test(unit);
                let isGal = /^(gallons?|gals?\.?)$/.test(unit);
                let isCup = !isC && /^(cups?|c\.?)$/.test(unit);
                let isTbsp = /^(tablespoons?|tbsps?\.?)$/.test(unit);
                let isTsp = /^(teaspoons?|tsps?\.?)$/.test(unit);
                if (isCup || isTbsp || isTsp) hasVolumetricUnits = true;
                let isOz = /^(ounces?|ozs?\.?)$/.test(unit);
                let isFlOz = /^(fluid\s*ounces?|fl\.?\s*oz\.?)$/.test(unit);
                let isLb = /^(pounds?|lbs?\.?)$/.test(unit);
                let isG = /^(grams?|g\.?)$/.test(unit);
                let isMl = /^(milliliters?|ml\.?)$/.test(unit);
                let isKg = /^(kilograms?|kgs?)$/.test(unit);
                let isL = /^(liters?|litres?|l)$/.test(unit);

                if (densityMatch && (isTsp || isTbsp || isFlOz || isCup || isPt || isQt || isGal || isOz || isLb || isG || isMl || isL || isKg)) {
                    const density = densityMatch.density;
                    if (convertToMetric) {
                        // Volume to Weight
                        let volumeMl = 0;
                        if (isTsp) volumeMl = scaledNum * 4.92892;
                        else if (isTbsp) volumeMl = scaledNum * 14.7868;
                        else if (isFlOz) volumeMl = scaledNum * 29.5735;
                        else if (isCup) volumeMl = scaledNum * 240;
                        else if (isPt) volumeMl = scaledNum * 473.176;
                        else if (isQt) volumeMl = scaledNum * 946.353;
                        else if (isGal) volumeMl = scaledNum * 3785.41;
                        else if (isMl) volumeMl = scaledNum;
                        else if (isL) volumeMl = scaledNum * 1000;

                        if (volumeMl > 0) {
                            scaledNum = volumeMl * density;
                            outUnit = 'g';
                            useFraction = false;
                            scaledNum = Math.round(scaledNum);
                            if (scaledNum >= 1000) {
                                scaledNum /= 1000;
                                outUnit = 'kg';
                                scaledNum = Number(scaledNum.toFixed(2));
                            }
                        } else {
                            // Weight to Weight (just use normal logic)
                            if (isOz) { scaledNum *= 28.3495; outUnit = 'g'; useFraction = false; }
                            else if (isLb) { scaledNum *= 453.592; outUnit = 'g'; useFraction = false; }
                            else if (isKg) { scaledNum *= 1000; outUnit = 'g'; useFraction = false; }
                            if (scaledNum >= 1000) {
                                scaledNum /= 1000;
                                outUnit = 'kg';
                                scaledNum = Number(scaledNum.toFixed(2));
                            } else {
                                scaledNum = Math.round(scaledNum);
                            }
                        }
                    } else {
                        // Weight to Volume
                        let weightG = 0;
                        if (isG) weightG = scaledNum;
                        else if (isKg) weightG = scaledNum * 1000;
                        else if (isOz) weightG = scaledNum * 28.3495;
                        else if (isLb) weightG = scaledNum * 453.592;

                        if (weightG > 0) {
                            let volumeMl = weightG / density;
                            let cups = volumeMl / 240;
                            if (cups >= 0.25) {
                                scaledNum = cups;
                                outUnit = scaledNum <= 1 ? 'cup' : 'cups';
                            } else {
                                let tbsp = volumeMl / 14.7868;
                                if (tbsp >= 0.5) {
                                    scaledNum = tbsp;
                                    outUnit = 'tbsp';
                                } else {
                                    scaledNum = volumeMl / 4.92892;
                                    outUnit = 'tsp';
                                }
                            }
                            useFraction = true;
                        } else {
                            // Volume to Volume (just use normal logic)
                            if (isMl || isL) {
                                if (isL) scaledNum *= 1000;
                                let cups = scaledNum / 240;
                                if (cups >= 0.25) { scaledNum = cups; outUnit = scaledNum <= 1 ? 'cup' : 'cups'; }
                                else {
                                    let tbsp = scaledNum / 15;
                                    if (tbsp >= 0.5) { scaledNum = tbsp; outUnit = 'tbsp'; }
                                    else { scaledNum = scaledNum / 5; outUnit = 'tsp'; }
                                }
                                useFraction = true;
                            }
                        }
                    }
                } else {
                    // Original non-density logic
                    if (convertToMetric) {
                        if (isTsp) { scaledNum *= 5; outUnit = 'ml'; useFraction = false; }
                        else if (isTbsp) { scaledNum *= 15; outUnit = 'ml'; useFraction = false; }
                        else if (isFlOz) { scaledNum *= 30; outUnit = 'ml'; useFraction = false; }
                        else if (isCup) { scaledNum *= 240; outUnit = 'ml'; useFraction = false; }
                        else if (isPt) { scaledNum *= 475; outUnit = 'ml'; useFraction = false; }
                        else if (isQt) { scaledNum *= 950; outUnit = 'ml'; useFraction = false; }
                        else if (isGal) { scaledNum *= 3.8; outUnit = 'L'; useFraction = false; }
                        else if (isOz) { scaledNum *= 28; outUnit = 'g'; useFraction = false; }
                        else if (isLb) { scaledNum *= 454; outUnit = 'g'; useFraction = false; }
                        else if (isKg) { scaledNum *= 1000; outUnit = 'g'; useFraction = false; }
                        else if (isL) { scaledNum *= 1000; outUnit = 'ml'; useFraction = false; }
                        else if (isIn) { scaledNum *= 2.5; outUnit = 'cm'; useFraction = false; }
                        else if (isF) {
                            scaledNum = (scaledNum - 32) * 5 / 9;
                            // Below 120°C (internal temps, early sugar stages) keep the exact
                            // degree: 165°F = 74°C, not a rounded-down 70°C that's below the
                            // poultry minimum. Hotter candy stages and oven temps round to 5°C.
                            scaledNum = scaledNum < 120 ? Math.round(scaledNum) : Math.round(scaledNum / 5) * 5;
                            outUnit = '°C';
                            useFraction = false;
                        }
                        
                        if (!useFraction) {
                            // Smart Formatting Rollovers
                            if (outUnit === 'ml' && scaledNum >= 1000) {
                                scaledNum /= 1000;
                                outUnit = 'L';
                            }
                            if (outUnit === 'g' && scaledNum >= 1000) {
                                scaledNum /= 1000;
                                outUnit = 'kg';
                            }

                            // Decimal strictness
                            if (outUnit === 'L') {
                                scaledNum = Number(scaledNum.toFixed(isL ? 2 : 1));
                            } else if (outUnit === 'kg') {
                                scaledNum = Number(scaledNum.toFixed(2));
                            } else if (outUnit === 'ml' || outUnit === 'g' || outUnit === '°C' || outUnit === '°F') {
                                scaledNum = Math.round(scaledNum);
                            } else {
                                // Default fallback e.g. for cm, in, or gal
                                scaledNum = Number(scaledNum.toFixed(1));
                            }
                        }
                    } else {
                        // Metric to US Customary
                        if (isMl || isL) {
                            if (isL) scaledNum *= 1000;
                            let cups = scaledNum / 240;
                            if (cups >= 0.25) { scaledNum = cups; outUnit = scaledNum <= 1 ? 'cup' : 'cups'; }
                            else {
                                let tbsp = scaledNum / 15;
                                if (tbsp >= 0.5) { scaledNum = tbsp; outUnit = 'tbsp'; }
                                else { scaledNum = scaledNum / 5; outUnit = 'tsp'; }
                            }
                        } else if (isG || isKg) {
                            if (isKg) scaledNum *= 1000;
                            scaledNum /= 28.35; outUnit = 'oz';
                            useFraction = false;
                            scaledNum = Number(scaledNum.toFixed(1));
                        } else if (isC) {
                            scaledNum = (scaledNum * 9 / 5) + 32;
                            scaledNum = Math.round(scaledNum / 5) * 5;
                            outUnit = '°F';
                            useFraction = false;
                        } else if (isCm) {
                            scaledNum = scaledNum / 2.54;
                            outUnit = 'in';
                            useFraction = false;
                        }
                    }
                }

                // US cups and spoons can drop to a smaller measure (see toUsVolume)
                let usVolume = '';
                if (useFraction && !isC) {
                    if (/^(cups?|c\.?)$/i.test(outUnit)) usVolume = 'cup';
                    else if (/^(tablespoons?|tbsps?\.?)$/i.test(outUnit)) usVolume = 'tbsp';
                    else if (/^(teaspoons?|tsps?\.?)$/i.test(outUnit)) usVolume = 'tsp';
                }
                if (usVolume && scaledNum > 0) {
                    return `<span class="highlight">${toUsVolume(scaledNum, usVolume, outUnit)}</span>`;
                }

                let valStr = useFraction ? toFraction(scaledNum) : scaledNum.toString();
                // Ensure a single space between number and unit
                return `<span class="highlight">${valStr} ${outUnit}</span>`;
            };

            unitMultiplier = 1;
            const pkgOut = pkgPrefix.replace(unitRegex, scaleUnits);
            unitMultiplier = currentMultiplier;
            processedLine = pkgOut + processedLine.substring(pkgPrefix.length).replace(unitRegex, scaleUnits);

            // Check if there's a unitless number at the start of the line that wasn't covered above
            let startMatch = startNumberRegex.exec(processedLine);
            if (startMatch) {
                const spaces = startMatch[1];
                const originalNumStr = startMatch[2];
                const num = parseNumber(originalNumStr);
                if (!isNaN(num)) {
                    const scaledNum = num * currentMultiplier;
                    const fractionStr = toFraction(scaledNum);
                    
                    if (isEggLine) {
                        const isFraction = Math.abs(scaledNum - Math.round(scaledNum)) > 0.01;
                        if (isFraction) {
                            lineHasFraction = true;
                            hasFractionalEggs = true;
                        }
                    }

                    processedLine = processedLine.substring(0, startMatch.index) + 
                                    spaces + `<span class="highlight">${fractionStr}</span>` + 
                                    processedLine.substring(startMatch.index + spaces.length + originalNumStr.length);
                }
            }

            // Create interactive checkbox row
            const label = document.createElement('label');
            label.className = 'recipe-line';
            if (isEggLine && lineHasFraction) {
                label.classList.add('fractional-egg-row');
            }
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            
            const span = document.createElement('span');
            span.className = 'recipe-text';
            span.innerHTML = processedLine;
            
            label.appendChild(checkbox);
            label.appendChild(span);
            
            recipeOutput.appendChild(label);
        });

        // Set egg tip display state
        if (eggTipBox) {
            eggTipBox.style.display = hasFractionalEggs ? 'block' : 'none';
        }

        // Volumetric scaling check (set by scaleUnits for cup/tbsp/tsp amounts)
        if (volumetricWarningBox) {
            volumetricWarningBox.style.display = (currentMultiplier >= 3 && hasVolumetricUnits) ? 'block' : 'none';
        }
    }

    function setUnitSystem(unit) {
        currentUnit = unit;
        if (unit === 'metric') {
            unitMetricBtn.classList.add('active');
            unitImperialBtn.classList.remove('active');
        } else {
            unitImperialBtn.classList.add('active');
            unitMetricBtn.classList.remove('active');
        }
        scaleRecipe();
    }

    if (unitImperialBtn) unitImperialBtn.addEventListener('click', () => setUnitSystem('imperial'));
    if (unitMetricBtn) unitMetricBtn.addEventListener('click', () => setUnitSystem('metric'));
    if (useDensityCheckbox) useDensityCheckbox.addEventListener('change', scaleRecipe);
    recipeInput.addEventListener('input', scaleRecipe);
    recipeInput.addEventListener('input', autoResizeInput);
    recipeInput.addEventListener('paste', () => {
        setTimeout(autoResizeInput, 0);
    });

    scaleButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            scaleButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            currentMultiplier = parseFloat(e.target.dataset.scale);
            currentMultiplierDisplay.textContent = `${currentMultiplier}x`;
            
            scaleRecipe();
        });
    });

    customScaleBtn.addEventListener('click', () => {
        const orig = parseFloat(originalServings.value);
        const target = parseFloat(targetServings.value);
        
        if (orig > 0 && target > 0) {
            currentMultiplier = target / orig;
            
            scaleButtons.forEach(b => b.classList.remove('active'));
            
            let displayMult = Number.isInteger(currentMultiplier) ? currentMultiplier : currentMultiplier.toFixed(2);
            currentMultiplierDisplay.textContent = `${displayMult}x`;
            
            scaleRecipe();
        }
    });

    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const lines = document.querySelectorAll('.recipe-text');
            const textToCopy = Array.from(lines).map(l => l.innerText).join('\n');
            navigator.clipboard.writeText(textToCopy).then(() => {
                const origText = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                setTimeout(() => copyBtn.textContent = origText, 2000);
            });
        });
    }

    if (printBtn) {
        printBtn.addEventListener('click', () => {
            window.print();
        });
    }

    // Clear the box to start your own recipe: the untouched example goes without asking,
    // anything the user typed asks first
    if (clearRecipeBtn) {
        clearRecipeBtn.addEventListener('click', () => {
            const text = recipeInput.value;
            if (text.trim() && text !== EXAMPLE_RECIPE && !window.confirm('Clear your recipe and start over?')) return;
            recipeInput.value = '';
            autoResizeInput();
            scaleRecipe();
            recipeInput.focus();
        });
    }

    // Initial active state
    document.querySelector('.scale-btn[data-scale="1"]').classList.add('active');
    
    // Trigger initial scale
    scaleRecipe();
});
