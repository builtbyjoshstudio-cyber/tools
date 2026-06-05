// Theme (Light / Mist / Dark) is handled globally by ../kinetic.js
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
const duckMrOpt = document.getElementById('duck-mr');
const duckMedOpt = document.getElementById('duck-med');
const bbqSafeOpt = document.getElementById('bbq-safe');
const cookingMethod = document.getElementById('cooking-method');
const brisketSafeOpt = document.getElementById('brisket-safe');
const duckBreastMrOpt = document.getElementById('duck-breast-mr');
const cutBrisket = document.getElementById('cut-brisket');
const cutDuckBreast = document.getElementById('cut-duck-breast');

function updateDonenessOptionTexts(isCelsius) {
    const options = finalDoneness.options;
    for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        if (opt.id === 'poultry-safe') {
            opt.textContent = isCelsius ? 'Safe (74°C)' : 'Safe (165°F / 74°C)';
        } else if (opt.id === 'fish-safe') {
            opt.textContent = isCelsius ? 'Flaky/Opaque (60°C)' : 'Flaky/Opaque (140°F / 60°C)';
        } else if (opt.id === 'duck-mr') {
            opt.textContent = isCelsius ? 'Medium-Rare (54°C)' : 'Medium-Rare (130°F / 54°C)';
        } else if (opt.id === 'duck-med') {
            opt.textContent = isCelsius ? 'Medium (60°C)' : 'Medium (140°F / 60°C)';
        } else if (opt.id === 'bbq-safe') {
            opt.textContent = isCelsius ? 'Probe Tender (93°C - 96°C)' : 'Probe Tender (200°F - 205°F)';
        } else if (opt.id === 'brisket-safe') {
            opt.textContent = isCelsius ? 'Collagen Breakdown (95°C)' : 'Collagen Breakdown (203°F / 95°C)';
        } else if (opt.id === 'duck-breast-mr') {
            opt.textContent = isCelsius ? 'Medium-Rare (57°C)' : 'Medium-Rare (135°F / 57°C)';
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
    
    if (isBrisketOverride) {
        for (let i = 0; i < options.length; i++) {
            if (options[i].id !== 'brisket-safe') {
                options[i].style.display = 'none';
            }
        }
        brisketSafeOpt.style.display = '';
        finalDoneness.value = "203";
    } else if (isDuckBreastOverride) {
        for (let i = 0; i < options.length; i++) {
            if (options[i].id !== 'duck-breast-mr') {
                options[i].style.display = 'none';
            }
        }
        duckBreastMrOpt.style.display = '';
        finalDoneness.value = "135";
    } else if (meatType.value === 'turkey' || meatType.value === 'chicken') {
        for (let i = 0; i < options.length; i++) {
            if (options[i].id !== 'poultry-safe') {
                options[i].style.display = 'none';
            }
        }
        poultrySafeOpt.style.display = '';
        finalDoneness.value = "165";
    } else if (meatType.value === 'seafood') {
        for (let i = 0; i < options.length; i++) {
            if (options[i].id !== 'fish-safe') {
                options[i].style.display = 'none';
            }
        }
        fishSafeOpt.style.display = '';
        finalDoneness.value = "140";
    } else if (meatType.value === 'duck-goose') {
        for (let i = 0; i < options.length; i++) {
            if (options[i].id !== 'duck-mr' && options[i].id !== 'duck-med') {
                options[i].style.display = 'none';
            }
        }
        duckMrOpt.style.display = '';
        duckMedOpt.style.display = '';
        if (finalDoneness.value !== "130" && finalDoneness.value !== "140") {
            finalDoneness.value = "130";
        }
    } else if (meatType.value === 'pork-shoulder') {
        for (let i = 0; i < options.length; i++) {
            if (options[i].id !== 'bbq-safe') {
                options[i].style.display = 'none';
            }
        }
        bbqSafeOpt.style.display = '';
        finalDoneness.value = "200";
    } else {
        // Hide all special options, show standard options
        const specialIds = ['poultry-safe', 'fish-safe', 'duck-mr', 'duck-med', 'bbq-safe', 'brisket-safe', 'duck-breast-mr'];
        for (let i = 0; i < options.length; i++) {
            if (!specialIds.includes(options[i].id)) {
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

        if (['165', '140', '130', '200', '203', '135'].includes(finalDoneness.value)) {
            finalDoneness.value = "145";
        }
    }
}

// Math Engine
function convertToCelsius(f) {
    const c = (f - 32) * 5 / 9;
    return Math.round(c * 10) / 10;
}

function calculate() {
    const isCelsius = (currentUnit === 'metric');
    const isPoultry = (meatType.value === 'turkey' || meatType.value === 'chicken');
    const isFish = (meatType.value === 'seafood');
    const isGame = (meatType.value === 'game-meat');
    const isDuck = (meatType.value === 'duck-goose');
    const isBbq = (meatType.value === 'pork-shoulder');
    
    const isBrisketOverride = (meatType.value === 'beef-brisket');
    const isDuckBreastOverride = (meatType.value === 'duck-goose' && cutSize.value === 'duck_breast');
    
    let targetTempF = parseInt(finalDoneness.value);
    
    // Enforce logic rule minimums defensively
    if (isPoultry) targetTempF = 165;
    if (isFish) targetTempF = 140;
    if (isBbq) targetTempF = 200;
    if (isBrisketOverride) targetTempF = 203;
    if (isDuckBreastOverride) targetTempF = 135; // Medium-Rare target

    let carryoverSubF = 0;
    let restTimeStr = "";
    const method = cookingMethod.value; // 'standard', 'high', 'low'
    
    if (isBrisketOverride) {
        carryoverSubF = 5; // Pull at 198°F (203 - 5 = 198)
    } else if (isDuckBreastOverride) {
        carryoverSubF = 5; // Pull at 130°F (135 - 5 = 130)
    } else if (isFish) {
        carryoverSubF = 3;
        restTimeStr = "a few minutes";
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
                    carryoverSubF = 5;
                    restTimeStr = "5 mins for thin cuts";
                    break;
            }
        }
    }

    const pullTempF = targetTempF - carryoverSubF;
    
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
            ? `<strong>Chef's Note:</strong> For premium duck breast, bypass generic well-done poultry guidelines to preserve succulence. Pull at 54.4°C (130°F) for medium-rare and rest for 8 minutes.`
            : `<strong>Chef's Note:</strong> For premium duck breast, bypass generic well-done poultry guidelines to preserve succulence. Pull at 130°F (54.4°C) for medium-rare and rest for 8 minutes.`;
    } else if (isGame) {
        restWarning.innerHTML = isCelsius
            ? `<strong>Chef's Note:</strong> Game meat is extremely lean. It is highly recommended not to target above Medium-Rare (57°C) or it will dry out. Rest 5-10 minutes.`
            : `<strong>Chef's Note:</strong> Game meat is extremely lean. It is highly recommended not to target above Medium-Rare (135°F) or it will dry out. Rest 5-10 minutes.`;
    } else if (isBbq) {
        restWarning.innerHTML = isCelsius
            ? `<strong>Chef's Note:</strong> Barbecue cuts are cooked for tenderness, not temperature. Pull when a probe slides in like warm butter (usually around 90.6°C-95°C). You MUST rest these large cuts in an insulated cooler for 1 to 2 hours before slicing.`
            : `<strong>Chef's Note:</strong> Barbecue cuts are cooked for tenderness, not temperature. Pull when a probe slides in like warm butter (usually around 195°F-203°F). You MUST rest these large cuts in an insulated cooler for 1 to 2 hours before slicing.`;
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

meatType.addEventListener('change', () => {
    updateUI();
});

cutSize.addEventListener('change', () => {
    updateUI();
});

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

    updateUI();

    if (protein) {
        calculate();
    }
}

parseUrlParameters();
