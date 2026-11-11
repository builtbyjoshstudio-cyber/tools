// Theme (Light / Dark) is handled globally by ../kinetic.js
// — unified 3-mode switch with View-Transition wipe.

// DOM Elements
const unitImperialBtn = document.getElementById('unit-imperial');
const unitMetricBtn = document.getElementById('unit-metric');
let currentUnit = 'imperial';

const meatType = document.getElementById('protein-type');
const cutSize = document.getElementById('cut-size');
const finalDoneness = document.getElementById('final-doneness');
const calculateBtn = document.getElementById('calculate-btn');
const pullTempOutput = document.getElementById('pull-temp-output');
const targetTempOutput = document.getElementById('target-temp-output');
const restWarning = document.getElementById('rest-warning');
const copyBtn = document.getElementById('copy-btn');
const poultrySafeOpt = document.getElementById('poultry-safe');
const fishSafeOpt = document.getElementById('fish-safe');
const groundSafeOpt = document.getElementById('ground-safe');
const bbqSafeOpt = document.getElementById('bbq-safe');
const cookingMethod = document.getElementById('cooking-method');
const brisketSafeOpt = document.getElementById('brisket-safe');
const duckBreastMrOpt = document.getElementById('duck-breast-mr');
const hamCookedOpt = document.getElementById('ham-cooked');
const hamFreshOpt = document.getElementById('ham-fresh');
const cutBrisket = document.getElementById('cut-brisket');
const cutDuckBreast = document.getElementById('cut-duck-breast');

function updateDonenessOptionTexts(isCelsius) {
    const options = finalDoneness.options;
    for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (opt.id === 'poultry-safe') {
            opt.textContent = isCelsius ? 'Safe (74°C)' : 'Safe (165°F / 74°C)';
        } else if (opt.id === 'fish-safe') {
            opt.textContent = isCelsius ? 'Flaky/Opaque (63°C)' : 'Flaky/Opaque (145°F / 63°C)';
        } else if (opt.id === 'ground-safe') {
            opt.textContent = isCelsius ? 'Safe (71°C)' : 'Safe (160°F / 71°C)';
        } else if (opt.id === 'bbq-safe') {
            opt.textContent = isCelsius ? 'Probe Tender (93°C - 96°C)' : 'Probe Tender (200°F - 205°F)';
        } else if (opt.id === 'brisket-safe') {
            opt.textContent = isCelsius ? 'Collagen Breakdown (95°C)' : 'Collagen Breakdown (203°F / 95°C)';
        } else if (opt.id === 'duck-breast-mr') {
            opt.textContent = isCelsius ? 'Medium-Rare (57°C)' : 'Medium-Rare (135°F / 57°C)';
        } else if (opt.id === 'ham-cooked') {
            opt.textContent = isCelsius ? 'Fully Cooked, Reheat (60°C)' : 'Fully Cooked, Reheat (140°F / 60°C)';
        } else if (opt.id === 'ham-fresh') {
            opt.textContent = isCelsius ? 'Fresh or Cook-Before-Eating (63°C)' : 'Fresh or Cook-Before-Eating (145°F / 63°C)';
        } else {
            const labels = {
                '125': 'Rare',
                '135': 'Medium-Rare',
                '145': 'Medium',
                '150': 'Medium-Well',
                '160': 'Well Done'
            };
            const baseText = labels[opt.value] || opt.text.split(' (')[0];
            const tempF = parseInt(opt.value);
            if (isCelsius) {
                const tempC = Math.round((tempF - 32) * 5 / 9);
                opt.textContent = `${baseText} (${tempC}°C)`;
            } else {
                opt.textContent = `${baseText} (${tempF}°F)`;
            }
        }
    }
}

function updateCookingMethodOptionTexts(isCelsius) {
    const options = cookingMethod.options;
    for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (opt.value === 'high') {
            opt.textContent = isCelsius ? 'High Heat Roasting (200°C+)' : 'High Heat Roasting (400°F+)';
        } else if (opt.value === 'standard') {
            opt.textContent = isCelsius ? 'Standard Baking / Pan Sear (175°C)' : 'Standard Baking/Pan Sear (350°F)';
        } else if (opt.value === 'low') {
            opt.textContent = isCelsius ? 'Low & Slow / Smoking (110°C)' : 'Low & Slow / Smoking (225°F)';
        }
    }
}

// UI Logic
function updateUI() {
    const isCelsius = (currentUnit === 'metric');
    updateDonenessOptionTexts(isCelsius);
    updateCookingMethodOptionTexts(isCelsius);
    const isBrisketOverride = (meatType.value === 'beef-brisket');
    const isDuckBreastOverride = (meatType.value === 'duck-goose' && cutSize.value === 'duck_breast');

    // Manage special cuts visibility in cutSize dropdown
    if (meatType.value === 'duck-goose') {
        cutBrisket.style.display = 'none';
        cutDuckBreast.style.display = '';
    } else {
        cutBrisket.style.display = 'none';
        cutDuckBreast.style.display = 'none';
        if (cutSize.value === 'brisket' || cutSize.value === 'duck_breast') {
            cutSize.value = 'large';
        }
    }

    const options = finalDoneness.options;
    
    // Options are selected by element, not by value: several share a value
    // (160 = Well Done and Safe-for-ground; 135 = Medium-Rare and duck breast),
    // and setting .value would pick whichever comes first, even a hidden one.
    function showOnly(opt) {
        for (let i = 0; i < options.length; i++) {
            options[i].style.display = (options[i] === opt) ? '' : 'none';
        }
        opt.selected = true;
    }

    if (isBrisketOverride) {
        showOnly(brisketSafeOpt);
    } else if (isDuckBreastOverride) {
        showOnly(duckBreastMrOpt);
    } else if (isPoultryType()) {
        showOnly(poultrySafeOpt);
    } else if (meatType.value === 'ground-meat') {
        showOnly(groundSafeOpt);
    } else if (meatType.value === 'seafood') {
        showOnly(fishSafeOpt);
    } else if (meatType.value === 'pork-shoulder') {
        showOnly(bbqSafeOpt);
    } else if (meatType.value === 'ham') {
        for (let i = 0; i < options.length; i++) {
            options[i].style.display = (options[i] === hamCookedOpt || options[i] === hamFreshOpt) ? '' : 'none';
        }
        if (!hamCookedOpt.selected && !hamFreshOpt.selected) hamCookedOpt.selected = true;
    } else {
        // Hide all special options, show standard options
        const specialIds = ['poultry-safe', 'fish-safe', 'ground-safe', 'bbq-safe', 'brisket-safe', 'duck-breast-mr', 'ham-cooked', 'ham-fresh'];
        // Pork loin and chops: nothing below the USDA 145°F whole-pork minimum.
        const isPorkLoin = (meatType.value === 'pork-loin');
        for (let i = 0; i < options.length; i++) {
            if (!specialIds.includes(options[i].id) && !(isPorkLoin && parseInt(options[i].value) < 145)) {
                options[i].style.display = '';
            } else {
                options[i].style.display = 'none';
            }
        }

        // Reset disabled states for standard options
        for (let i = 0; i < options.length; i++) {
            if (options[i].style.display !== 'none') {
                options[i].disabled = false;
            }
        }

        // Coming from a special-case meat (or Rare/Medium-Rare into pork loin):
        // fall back to Medium. A visible choice (e.g. Medium-Rare) is kept when
        // only the cut changes.
        if (options[finalDoneness.selectedIndex].style.display === 'none') {
            finalDoneness.value = "145";
        }
    }
}

// Everything held to the USDA 165°F poultry minimum. Duck breast is the one
// exception (chef's medium-rare, handled as its own override).
function isPoultryType() {
    const m = meatType.value;
    if (m === 'duck-goose') return cutSize.value !== 'duck_breast';
    return m === 'turkey' || m === 'chicken' || m === 'ground-poultry';
}

// Math Engine
function convertToCelsius(f) {
    const c = (f - 32) * 5 / 9;
    return Math.round(c * 10) / 10;
}

function calculate() {
    const isCelsius = (currentUnit === 'metric');
    const isPoultry = isPoultryType();
    const isGround = (meatType.value === 'ground-meat');
    const isFish = (meatType.value === 'seafood');
    const isGame = (meatType.value === 'game-meat');
    const isDuck = (meatType.value === 'duck-goose');
    const isBbq = (meatType.value === 'pork-shoulder');
    const isPorkLoin = (meatType.value === 'pork-loin');
    const isHam = (meatType.value === 'ham');

    const isBrisketOverride = (meatType.value === 'beef-brisket');
    const isDuckBreastOverride = (meatType.value === 'duck-goose' && cutSize.value === 'duck_breast');
    
    let targetTempF = parseInt(finalDoneness.value);
    
    // Enforce logic rule minimums defensively
    if (isPoultry) targetTempF = 165;
    if (isGround) targetTempF = 160;
    if (isFish) targetTempF = 145;
    if (isBbq) targetTempF = 200;
    if (isPorkLoin) targetTempF = Math.max(targetTempF, 145);
    if (isHam) targetTempF = hamFreshOpt.selected ? 145 : 140;
    if (isBrisketOverride) targetTempF = 203;
    if (isDuckBreastOverride) targetTempF = 135; // Medium-Rare target

    let carryoverSubF = 0;
    let restTimeStr = "";
    const method = cookingMethod.value; // 'standard', 'high', 'low'
    
    if (isPoultry || isGround) {
        // Food-safety minimums: pull AT the minimum. Carryover is a bonus,
        // never part of the safety math.
        carryoverSubF = 0;
        restTimeStr = cutSize.value === 'large' ? '15-20 minutes'
                    : cutSize.value === 'thick' ? '5-10 minutes' : '5 minutes';
    } else if (isBrisketOverride) {
        carryoverSubF = 5; // Pull at 198°F (203 - 5 = 198)
    } else if (isDuckBreastOverride) {
        carryoverSubF = 5; // Pull at 130°F (135 - 5 = 130)
    } else if (isFish || isHam) {
        // USDA minimums, pulled AT the minimum like poultry.
        carryoverSubF = 0;
    } else if (isBbq) {
        carryoverSubF = targetTempF - 195; // Forces pull temp to 195
    } else {
        if (method === 'high') {
            switch (cutSize.value) {
                case 'large':
                    carryoverSubF = 15;
                    restTimeStr = "15-20 mins for large roasts (intense high-heat carryover)";
                    break;
                case 'thick':
                    carryoverSubF = 12;
                    restTimeStr = "10 mins for thick cuts (high-heat carryover)";
                    break;
                case 'thin':
                    carryoverSubF = 10;
                    restTimeStr = "5-8 mins for thin cuts (high-heat carryover)";
                    break;
            }
        } else if (method === 'low') {
            switch (cutSize.value) {
                case 'large':
                    carryoverSubF = 4;
                    restTimeStr = "10 mins for large roasts (minimal low-gradient carryover)";
                    break;
                case 'thick':
                    carryoverSubF = 3;
                    restTimeStr = "5 mins for thick cuts (minimal low-gradient carryover)";
                    break;
                case 'thin':
                    carryoverSubF = 2;
                    restTimeStr = "3-5 mins for thin cuts (minimal low-gradient carryover)";
                    break;
            }
        } else { // 'standard'
            switch (cutSize.value) {
                case 'large':
                    carryoverSubF = 7;
                    restTimeStr = "15 mins for large roasts";
                    break;
                case 'thick':
                    carryoverSubF = 6;
                    restTimeStr = "5 mins for steaks/chops";
                    break;
                case 'thin':
                    carryoverSubF = 3;
                    restTimeStr = "5 mins for thin cuts";
                    break;
            }
        }
    }

    let pullTempF = targetTempF - carryoverSubF;
    // Pork loin keeps its carryover, but is never pulled below the 145°F minimum.
    if (isPorkLoin) pullTempF = Math.max(pullTempF, 145);

    // Display
    if (isCelsius) {
        let pullTempC = convertToCelsius(pullTempF);
        let targetTempC = convertToCelsius(targetTempF);
        if (isBrisketOverride) {
            pullTempC = 92;
            targetTempC = 95;
        }
        if (isDuckBreastOverride) {
            pullTempC = 54.4;
            targetTempC = 57.2;
        }
        if (isPoultry) {
            // 165°F is 73.9°C; show the 74°C the USDA (and the note below) cite,
            // so a safety number never reads as under the stated minimum.
            pullTempC = 74;
            targetTempC = 74;
        }
        if (isFish || isPorkLoin || isHam) {
            // Same for the 145°F minimum: 62.8°C, shown as the USDA's 63°C.
            if (pullTempF === 145) pullTempC = 63;
            if (targetTempF === 145) targetTempC = 63;
        }
        pullTempOutput.innerText = `${pullTempC}°C`;
        targetTempOutput.innerText = `${targetTempC}°C`;
    } else {
        pullTempOutput.innerText = `${pullTempF}°F`;
        targetTempOutput.innerText = `${targetTempF}°F`;
    }

    if (isBrisketOverride) {
        restWarning.innerHTML = isCelsius
            ? `<strong>Brisket Override:</strong> Pull at 92°C (198°F) and store in an insulated cooler for a minimum of 2 hours.`
            : `<strong>Brisket Override:</strong> Pull at 198°F (92°C) and store in an insulated cooler for a minimum of 2 hours.`;
    } else if (isDuckBreastOverride) {
        restWarning.innerHTML = isCelsius
            ? `<strong>Chef's Note:</strong> Duck breast is classically served medium-rare, a chef's preference below the USDA's 74°C (165°F) poultry guideline. Pull at 54.4°C (130°F) and rest for 8 minutes. Roasting a whole duck or goose? Choose Large Roast / Whole Bird for the 74°C safe target.`
            : `<strong>Chef's Note:</strong> Duck breast is classically served medium-rare, a chef's preference below the USDA's 165°F (74°C) poultry guideline. Pull at 130°F (54.4°C) and rest for 8 minutes. Roasting a whole duck or goose? Choose Large Roast / Whole Bird for the 165°F safe target.`;
    } else if (isPoultry) {
        const where = meatType.value === 'ground-poultry' ? 'the center of the thickest patty or loaf'
                    : cutSize.value === 'large' ? 'the thickest part of the breast and thigh' : 'the thickest part';
        restWarning.innerHTML = isCelsius
            ? `<strong>Food Safety:</strong> Poultry is pulled at the USDA minimum of 74°C (165°F). Carryover is a bonus, not part of the safety math. Check ${where}, then rest ${restTimeStr}.`
            : `<strong>Food Safety:</strong> Poultry is pulled at the USDA minimum of 165°F (74°C). Carryover is a bonus, not part of the safety math. Check ${where}, then rest ${restTimeStr}.`;
    } else if (isGround) {
        restWarning.innerHTML = isCelsius
            ? `<strong>Food Safety:</strong> Ground meat must reach 71°C (160°F) all the way through. Grinding spreads surface bacteria into the center, so there's no safe rare or medium. Check the center of the thickest patty or loaf, then rest ${restTimeStr}.`
            : `<strong>Food Safety:</strong> Ground meat must reach 160°F (71°C) all the way through. Grinding spreads surface bacteria into the center, so there's no safe rare or medium. Check the center of the thickest patty or loaf, then rest ${restTimeStr}.`;
    } else if (isGame) {
        restWarning.innerHTML = isCelsius
            ? `<strong>Chef's Note:</strong> Game meat is extremely lean. It is highly recommended not to target above Medium-Rare (57°C) or it will dry out. Rest 5-10 minutes.`
            : `<strong>Chef's Note:</strong> Game meat is extremely lean. It is highly recommended not to target above Medium-Rare (135°F) or it will dry out. Rest 5-10 minutes.`;
    } else if (isBbq) {
        restWarning.innerHTML = isCelsius
            ? `<strong>Chef's Note:</strong> Barbecue cuts are cooked for tenderness, not temperature. Pull when a probe slides in like warm butter (usually around 90.6°C-95°C). You MUST rest these large cuts in an insulated cooler for 1 to 2 hours before slicing.`
            : `<strong>Chef's Note:</strong> Barbecue cuts are cooked for tenderness, not temperature. Pull when a probe slides in like warm butter (usually around 195°F-203°F). You MUST rest these large cuts in an insulated cooler for 1 to 2 hours before slicing.`;
    } else if (isFish) {
        restWarning.innerHTML = isCelsius
            ? `<strong>Food Safety:</strong> Fish is pulled at the USDA minimum of 63°C (145°F). Without a thermometer, cook until the flesh is opaque and separates easily with a fork. Rest a few minutes before serving.`
            : `<strong>Food Safety:</strong> Fish is pulled at the USDA minimum of 145°F (63°C). Without a thermometer, cook until the flesh is opaque and separates easily with a fork. Rest a few minutes before serving.`;
    } else if (isHam && targetTempF === 145) {
        restWarning.innerHTML = isCelsius
            ? `<strong>Food Safety:</strong> Fresh ham and ham labeled cook before eating are pulled at the USDA minimum of 63°C (145°F), then rested at least 3 minutes before carving.`
            : `<strong>Food Safety:</strong> Fresh ham and ham labeled cook before eating are pulled at the USDA minimum of 145°F (63°C), then rested at least 3 minutes before carving.`;
    } else if (isHam) {
        restWarning.innerHTML = isCelsius
            ? `<strong>Food Safety:</strong> A fully cooked ham packaged in a USDA-inspected plant is reheated to 60°C (140°F). Any other cooked ham, such as leftovers or ham repackaged outside the plant, must reach 74°C (165°F).`
            : `<strong>Food Safety:</strong> A fully cooked ham packaged in a USDA-inspected plant is reheated to 140°F (60°C). Any other cooked ham, such as leftovers or ham repackaged outside the plant, must reach 165°F (74°C).`;
    } else if (isPorkLoin && pullTempF > targetTempF - carryoverSubF) {
        // The 145°F floor raised the pull, so carryover lands above the target.
        const finishF = pullTempF + carryoverSubF;
        restWarning.innerHTML = isCelsius
            ? `<strong>Food Safety:</strong> Pork is never pulled below the USDA minimum of 63°C (145°F), and it needs at least a 3-minute rest. Carryover is a bonus, not part of the safety math: rest it uncovered for <strong>${restTimeStr}</strong> and expect it to finish around ${convertToCelsius(finishF)}°C (${finishF}°F), above your target.`
            : `<strong>Food Safety:</strong> Pork is never pulled below the USDA minimum of 145°F (63°C), and it needs at least a 3-minute rest. Carryover is a bonus, not part of the safety math: rest it uncovered for <strong>${restTimeStr}</strong> and expect it to finish around ${finishF}°F (${convertToCelsius(finishF)}°C), above your target.`;
    } else if (isPorkLoin) {
        restWarning.innerHTML = isCelsius
            ? `<strong>Food Safety:</strong> Pork is never pulled below the USDA minimum of 63°C (145°F), and it needs at least a 3-minute rest. Rest it uncovered for <strong>${restTimeStr}</strong> to reach this final temperature.`
            : `<strong>Food Safety:</strong> Pork is never pulled below the USDA minimum of 145°F (63°C), and it needs at least a 3-minute rest. Rest it uncovered for <strong>${restTimeStr}</strong> to reach this final temperature.`;
    } else {
        restWarning.innerHTML = `<strong>Chef's Note:</strong> You must rest the meat uncovered for at least <strong>${restTimeStr}</strong> to achieve this final temperature. Cutting early halts the cooking process and ruins the calculation.`;
    }
}

// Event Listeners
function setUnitSystem(unit) {
    currentUnit = unit;
    if (unit === 'metric') {
        unitMetricBtn.classList.add('active');
        unitImperialBtn.classList.remove('active');
    } else {
        unitImperialBtn.classList.add('active');
        unitMetricBtn.classList.remove('active');
    }
    updateUI();
    if (pullTempOutput.innerText !== '--°F' && pullTempOutput.innerText !== '--°C') {
        calculate();
    }
}

unitImperialBtn.addEventListener('click', () => setUnitSystem('imperial'));
unitMetricBtn.addEventListener('click', () => setUnitSystem('metric'));

// Once a result is on screen, any input change must refresh it, or a stale
// pull temp (e.g. a beef number after switching to chicken) stays up and in Copy.
function recalcIfShowing() {
    if (pullTempOutput.innerText !== '--°F' && pullTempOutput.innerText !== '--°C') {
        calculate();
    }
}

meatType.addEventListener('change', () => {
    updateUI();
    recalcIfShowing();
});

cutSize.addEventListener('change', () => {
    updateUI();
    recalcIfShowing();
});

finalDoneness.addEventListener('change', recalcIfShowing);

cookingMethod.addEventListener('change', () => {
    if (pullTempOutput.innerText !== '--°F' && pullTempOutput.innerText !== '--°C') {
        calculate();
    }
});

calculateBtn.addEventListener('click', calculate);

// Initial Setup
updateUI();

// Copy to Clipboard logic
copyBtn.addEventListener('click', () => {
    if (pullTempOutput.innerText === '--°F' || pullTempOutput.innerText === '--°C') return;
    
    const isCelsius = (currentUnit === 'metric');
    const textToCopy = `Perfect Roast Pull Temp Calculation:\nMeat: ${meatType.options[meatType.selectedIndex].text}\nCut: ${cutSize.options[cutSize.selectedIndex].text}\nPull From Heat At: ${pullTempOutput.innerText}\nTarget Final Temp: ${targetTempOutput.innerText}\nNote: ${restWarning.innerText}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        const originalText = copyBtn.innerText;
        copyBtn.innerText = 'Copied!';
        setTimeout(() => {
            copyBtn.innerText = originalText;
        }, 2000);
    });
});

// Share links: only built when "Copy link" is clicked, never written to the
// address bar. ?unit=&protein= are the existing hand-off params from the other
// meat tools; cut, method and done name this page's other inputs.
const copyLinkBtn = document.getElementById('copy-link-btn');
const copyLinkStatus = document.getElementById('copy-link-status');
let copyLinkTimer = null;

function shareParams() {
    const params = new URLSearchParams();
    params.set('unit', currentUnit);
    params.set('protein', meatType.value);
    params.set('cut', cutSize.value);
    params.set('method', cookingMethod.value);
    params.set('done', finalDoneness.value);
    return params.toString();
}

function showCopyLinkStatus(msg) {
    copyLinkStatus.textContent = msg;
    clearTimeout(copyLinkTimer);
    copyLinkTimer = setTimeout(() => copyLinkStatus.textContent = '', 3000);
}

function fallbackCopyLink(text) {
    const ta = document.createElement('textarea');
    let ok = false;
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    copyLinkBtn.focus();
    showCopyLinkStatus(ok ? 'Link copied' : "Couldn't copy the link");
}

copyLinkBtn.addEventListener('click', () => {
    const url = location.origin + location.pathname + '?' + shareParams();
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => showCopyLinkStatus('Link copied'), () => fallbackCopyLink(url));
    } else {
        fallbackCopyLink(url);
    }
});

// Ingestion of URL Parameters
function parseUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    const unit = params.get('unit');
    const protein = params.get('protein');

    if (unit && (unit.toLowerCase() === 'kg' || unit.toLowerCase() === 'metric')) {
        setUnitSystem('metric');
    } else if (unit && (unit.toLowerCase() === 'lbs' || unit.toLowerCase() === 'imperial')) {
        setUnitSystem('imperial');
    }

    if (protein) {
        const select = document.getElementById("protein-type");
        const lowerProtein = protein.toLowerCase();
        for (let option of select.options) {
            if (option.value.toLowerCase() === lowerProtein || option.text.toLowerCase().includes(lowerProtein)) {
                select.value = option.value;
                break;
            }
        }
    }

    // Unknown values are ignored, like any choice the dropdowns don't offer.
    const cut = params.get('cut');
    const method = params.get('method');
    const done = params.get('done');
    if (['large', 'thick', 'thin', 'duck_breast'].includes(cut)) cutSize.value = cut;
    if (['standard', 'high', 'low'].includes(method)) cookingMethod.value = method;

    updateUI();

    // Doneness is matched among the options this meat shows: several share a value.
    if (done) {
        const options = finalDoneness.options;
        for (let i = 0; i < options.length; i++) {
            if (options[i].style.display !== 'none' && options[i].value === done) {
                options[i].selected = true;
                break;
            }
        }
    }

    if (protein) {
        calculate();
    }
}

parseUrlParameters();
