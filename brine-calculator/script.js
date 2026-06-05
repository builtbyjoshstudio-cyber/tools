const TYNKR_REGISTRY = {
    scaler: "../universal-recipe-scaler/",
    reverseRoast: "../reverse-roasting-calculator/",
    panSwap: "../pan-swap-calculator/",
    roastPull: "../perfect-roast-pull-temp-calculator/",
    brine: "../brine-calculator/",
    thawing: "../meat-thawing-planner/",
    hub: "https://builtbyjoshstudio.com/tools/"
};

function getToolUrl(toolId, params = {}) {
    let baseUrl = TYNKR_REGISTRY[toolId] || TYNKR_REGISTRY['hub'];
    if (Object.keys(params).length > 0) {
        const queryString = new URLSearchParams(params).toString();
        baseUrl += `?${queryString}`;
    }
    return baseUrl;
}

document.addEventListener("DOMContentLoaded", () => {
    // Theme (Light / Mist / Dark) is handled globally by ../kinetic.js

    // Inputs
    const brineTypeWetBtn = document.getElementById("brine-type-wet");
    const brineTypeDryBtn = document.getElementById("brine-type-dry");
    const unitImperialBtn = document.getElementById("unit-imperial");
    const unitMetricBtn = document.getElementById("unit-metric");
    const volumeUnitImperialBtn = document.getElementById("volume-unit-imperial");
    const volumeUnitMetricBtn = document.getElementById("volume-unit-metric");

    let currentBrineType = 'wet';
    let currentWeightUnit = 'lbs';
    let currentVolumeUnit = 'imperial';

    const isDryBrineToggle = {
      get checked() { return currentBrineType === 'dry'; }
    };
    const isKgToggle = {
      get checked() { return currentWeightUnit === 'kg'; }
    };
    const volumeUnitToggle = {
      get checked() { return currentVolumeUnit === 'metric'; }
    };
    const proteinType = document.getElementById("protein-type");
    const meatWeight = document.getElementById("meat-weight");
    const meatWeightLabel = document.getElementById("meat-weight-label");
    const saltType = document.getElementById("salt-type");
    const brineStrength = document.getElementById("brine-strength");
    const briningMethodContainer = document.getElementById("brining-method-container");
    const briningMethod = document.getElementById("brining-method");
    const includeSugar = document.getElementById("include-sugar");

    // Outputs
    const saltVolumeOutput = document.getElementById("salt-volume-output");
    const saltWeightOutput = document.getElementById("salt-weight-output");
    const waterSection = document.getElementById("water-section");
    const waterOutput = document.getElementById("water-output");
    const sugarSection = document.getElementById("sugar-section");
    const sugarOutput = document.getElementById("sugar-output");
    const timeOutput = document.getElementById("time-output");
    const notesOutput = document.getElementById("notes-output");
    
    const turkeyHelperContainer = document.getElementById("turkey-helper-container");
    const turkeyHelperToggle = document.getElementById("turkey-helper-toggle");
    const turkeyHelperNote = document.getElementById("turkey-helper-note");
    const saltWarningNode = document.getElementById("salt-warning-node");
    
    const calculateBtn = document.getElementById("calculate-btn");
    const copyBtn = document.getElementById("copy-btn");
    
    // Timer state
    let maxHoursForTimer = 0;
    const startTimerBtn = document.getElementById("start-timer-btn");
    const stopTimerBtn = document.getElementById("stop-timer-btn");
    const timerContainer = document.getElementById("timer-container");
    const liveTimerDisplay = document.getElementById("live-timer-display");
    let timerInterval = null;

    function updatePipelineLinks() {
        const pipelineLinkThawing = document.getElementById("pipeline-link-thawing");
        const pipelineLinkRoast = document.getElementById("pipeline-link-roast");
        
        const currentWeight = parseFloat(meatWeight.value) || 0;
        const currentUnit = isKgToggle.checked ? "kg" : "lbs";
        const currentProtein = proteinType.value;
        
        if (pipelineLinkThawing) {
            pipelineLinkThawing.href = getToolUrl('thawing', { weight: currentWeight, unit: currentUnit, protein: currentProtein });
        }
        if (pipelineLinkRoast) {
            pipelineLinkRoast.href = getToolUrl('roastPull', { weight: currentWeight, unit: currentUnit, protein: currentProtein });
        }
    }

    function updateUI() {
        if (isDryBrineToggle.checked) {
            waterSection.style.display = "none";
            briningMethodContainer.style.display = "none";
        } else {
            waterSection.style.display = "block";
            briningMethodContainer.style.display = "flex";
        }
        
        if (includeSugar.checked) {
            sugarSection.style.display = "block";
        } else {
            sugarSection.style.display = "none";
        }
        
        if (proteinType.value === "turkey") {
            turkeyHelperContainer.style.display = "flex";
        } else {
            turkeyHelperContainer.style.display = "none";
            turkeyHelperToggle.checked = false;
        }
        
        if (turkeyHelperToggle.checked) {
            turkeyHelperNote.style.display = "block";
        } else {
            turkeyHelperNote.style.display = "none";
        }
        
        if (saltType.value === "table" || saltType.value === "dense") {
            saltWarningNode.style.display = "block";
            saltWarningNode.textContent = "Note: Table salt and dense granular kosher salt are significantly heavier by volume than coarse flaky kosher salt. Make sure you select the correct texture to avoid a massive salt bomb!";
        } else {
            saltWarningNode.style.display = "none";
        }
        
        // Update labels based on unit toggle
        if (isKgToggle.checked) {
            meatWeightLabel.textContent = "Meat Weight (kg)";
        } else {
            meatWeightLabel.textContent = "Meat Weight (lbs)";
        }

        updatePipelineLinks();
    }

    function setBrineType(type) {
        currentBrineType = type;
        if (type === 'dry') {
            brineTypeDryBtn.classList.add('active');
            brineTypeWetBtn.classList.remove('active');
        } else {
            brineTypeWetBtn.classList.add('active');
            brineTypeDryBtn.classList.remove('active');
        }
        updateUI();
    }

    function setWeightUnit(unit) {
        currentWeightUnit = unit;
        if (unit === 'kg') {
            unitMetricBtn.classList.add('active');
            unitImperialBtn.classList.remove('active');
        } else {
            unitImperialBtn.classList.add('active');
            unitMetricBtn.classList.remove('active');
        }
        updateUI();
    }

    function setVolumeUnit(unit) {
        currentVolumeUnit = unit;
        if (unit === 'metric') {
            volumeUnitMetricBtn.classList.add('active');
            volumeUnitImperialBtn.classList.remove('active');
        } else {
            volumeUnitImperialBtn.classList.add('active');
            volumeUnitMetricBtn.classList.remove('active');
        }
        updateUI();
    }

    if (brineTypeWetBtn) brineTypeWetBtn.addEventListener('click', () => setBrineType('wet'));
    if (brineTypeDryBtn) brineTypeDryBtn.addEventListener('click', () => setBrineType('dry'));
    if (unitImperialBtn) unitImperialBtn.addEventListener('click', () => setWeightUnit('lbs'));
    if (unitMetricBtn) unitMetricBtn.addEventListener('click', () => setWeightUnit('kg'));
    if (volumeUnitImperialBtn) volumeUnitImperialBtn.addEventListener('click', () => setVolumeUnit('imperial'));
    if (volumeUnitMetricBtn) volumeUnitMetricBtn.addEventListener('click', () => setVolumeUnit('metric'));
    includeSugar.addEventListener("change", updateUI);
    proteinType.addEventListener("change", updateUI);
    turkeyHelperToggle.addEventListener("change", updateUI);
    saltType.addEventListener("change", updateUI);
    briningMethod.addEventListener("change", updateUI);
    meatWeight.addEventListener("input", updateUI);

    function formatTbsp(totalTbsp) {
        if (totalTbsp >= 16) {
            const cups = totalTbsp / 16;
            if (Number.isInteger(cups)) return `${cups} Cup${cups > 1 ? 's' : ''}`;
            return `${cups.toFixed(2)} Cups`;
        }
        
        if (totalTbsp < 1) {
            return `${(totalTbsp * 3).toFixed(1)} tsp`;
        }
        
        return `${totalTbsp.toFixed(1)} Tbsp`;
    }

    function calculate() {
        const weight = parseFloat(meatWeight.value) || 0;
        if (weight <= 0) return;

        const isDry = isDryBrineToggle.checked;
        const isKg = isKgToggle.checked;
        const isMetricLiquid = volumeUnitToggle.checked;
        const protein = proteinType.value;
        const salt = saltType.value;
        const strength = brineStrength.value;
        const hasSugar = includeSugar.checked;

        // Convert weight to grams
        const weightGrams = isKg ? weight * 1000 : weight * 453.592;
        const weightLbs = isKg ? weight * 2.20462 : weight;

        let saltGrams = 0;
        let waterGrams = 0;
        const isEQ = briningMethod.value === 'eq';

        if (isDry) {
            // Dry Brine Math
            let ratio = 0.01; // Standard 1%
            if (strength === 'light') ratio = 0.0075;
            if (strength === 'strong') ratio = 0.0125;
            
            saltGrams = weightGrams * ratio;
        } else {
            // Wet Brine Math
            // Water volume is 50% of meat weight to submerge
            waterGrams = weightGrams * 0.5;
            
            if (isEQ) {
                const totalWeight = weightGrams + waterGrams;
                saltGrams = totalWeight * 0.015;
            } else {
                // Equilibrium target in water (5% standard)
                let wetRatio = 0.05;
                if (strength === 'light') wetRatio = 0.04;
                if (strength === 'strong') wetRatio = 0.06;
                
                saltGrams = waterGrams * wetRatio;
            }
        }

        // Salt Density Conversions
        let gramsPerTbsp = 15; // default
        if (salt === 'coarse') gramsPerTbsp = 8.44; // 135g/cup (approx coarse flaky)
        else if (salt === 'dense') gramsPerTbsp = 15.6; // 250g/cup (approx dense granular)
        else if (salt === 'table') gramsPerTbsp = 18.1; // 290g/cup
        else if (salt === 'sea') gramsPerTbsp = 15.6; // 250g/cup

        const tbspNeeded = saltGrams / gramsPerTbsp;

        // Render Salt
        if (isMetricLiquid) {
            saltVolumeOutput.textContent = `${saltGrams.toFixed(1)} g`;
            const mlNeeded = tbspNeeded * 15;
            saltWeightOutput.textContent = mlNeeded >= 100 ? `${mlNeeded.toFixed(0)} ml` : `${mlNeeded.toFixed(1)} ml`;
        } else {
            saltVolumeOutput.textContent = formatTbsp(tbspNeeded);
            saltWeightOutput.textContent = `${saltGrams.toFixed(1)} g`;
        }

        // Render Water
        if (!isDry) {
            const liters = waterGrams / 1000;
            const quarts = liters * 1.05669;
            
            if (isMetricLiquid) {
                const totalVol = liters < 1 ? `${(liters * 1000).toFixed(0)} ml` : `${liters.toFixed(2)} L`;
                const step1Vol = (liters * 0.25) < 1 ? `${((liters * 0.25) * 1000).toFixed(0)} ml` : `${(liters * 0.25).toFixed(2)} L`;
                const step2Vol = (liters * 0.75) < 1 ? `${((liters * 0.75) * 1000).toFixed(0)} ml` : `${(liters * 0.75).toFixed(2)} L`;
                
                waterOutput.innerHTML = `
                    <div style="font-size: 24px; font-weight: 600; margin-bottom: 8px;">${totalVol} Total</div>
                    <div style="font-size: 13px; color: var(--text-soft); font-weight: 400; line-height: 1.4; text-align: left; font-family: var(--font-ui);">
                        <strong style="color: var(--text);">Step 1:</strong> Bring ${step1Vol} of water to a boil to completely dissolve the salt and sugar.<br><br>
                        <strong style="color: var(--text);">Step 2:</strong> Add ${step2Vol} of ice/cold water to safely chill the brine to fridge temperature before adding the meat.
                    </div>
                `;
            } else {
                waterOutput.innerHTML = `
                    <div style="font-size: 24px; font-weight: 600; margin-bottom: 8px;">${quarts.toFixed(1)} Quarts (${liters.toFixed(1)} L)</div>
                    <div style="font-size: 13px; color: var(--text-soft); font-weight: 400; line-height: 1.4; text-align: left; font-family: var(--font-ui);">
                        <strong style="color: var(--text);">Step 1:</strong> Bring 25% of the total water volume to a boil to completely dissolve the salt and sugar.<br><br>
                        <strong style="color: var(--text);">Step 2:</strong> Add the remaining 75% of the volume as Ice and Cold Water to safely chill the brine to fridge temperature before adding the meat.
                    </div>
                `;
            }
        }

        // Render Sugar
        if (hasSugar) {
            const sugarGrams = saltGrams * 0.5;
            sugarOutput.textContent = `${sugarGrams.toFixed(1)} g`;
        }

        // Render Time
        let timeStr = "";
        let hoursMax = 0;
        
        if (isDry) {
            let hoursMin = Math.round(weightLbs * 1);
            hoursMax = Math.round(weightLbs * 2);
            
            if (protein === 'turkey' || protein === 'chicken' || protein === 'duck-goose') {
                if (hoursMax > 24) hoursMax = 24;
            }
            if (hoursMin === hoursMax) {
                timeStr = `${hoursMin} hours (or overnight)`;
            } else {
                timeStr = `${hoursMin} - ${hoursMax} hours (or overnight)`;
            }
        } else {
            hoursMax = Math.round(weightLbs * 1);
            if (protein === 'turkey' || protein === 'chicken' || protein === 'duck-goose') {
                if (hoursMax > 24) hoursMax = 24;
            }
            timeStr = `${hoursMax} hour${hoursMax !== 1 ? 's' : ''}`;
        }
        timeOutput.textContent = timeStr;
        maxHoursForTimer = hoursMax;

        // Render Notes
        let notes = "Warning: Do not brine meat that is labeled as 'enhanced', 'basted', or 'pre-seasoned' (like most frozen turkeys), as it will be incredibly salty.<br><br>";
        if (isDry) {
            notes += "<strong>Method:</strong> Pat meat completely dry before applying salt. Rest uncovered on a wire rack in the fridge.";
        } else {
            if (isEQ) {
                notes = "<strong>Equilibrium Mode Active:</strong> The meat will absorb exactly 1.5% salt and cannot become over-salted, even if left in the brine for multiple days. Ideal for long-term curing and ultra-precise BBQ control.<br><br>";
            } else {
                notes += "<strong>Method:</strong> Always rinse the meat and pat completely dry after removing from a wet brine.";
            }
        }
        notesOutput.innerHTML = notes;
        
        // Centralized Routing Updates
        updatePipelineLinks();
    }

    calculateBtn.addEventListener("click", calculate);

    copyBtn.addEventListener("click", () => {
        let text = `Brine Recipe (${proteinType.options[proteinType.selectedIndex].text}, ${meatWeight.value} ${isKgToggle.checked ? 'kg' : 'lbs'}):\n`;
        text += `Salt: ${saltVolumeOutput.textContent} (${saltWeightOutput.textContent}) of ${saltType.options[saltType.selectedIndex].text}\n`;
        
        if (!isDryBrineToggle.checked) {
            text += `Water: ${waterOutput.textContent}\n`;
        }
        
        if (includeSugar.checked) {
            text += `Sugar: ${sugarOutput.textContent}\n`;
        }
        
        text += `Time: ${timeOutput.textContent}\n`;
        text += `Notes: ${notesOutput.innerText}`;

        navigator.clipboard.writeText(text).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = "Copied!";
            setTimeout(() => copyBtn.textContent = originalText, 2000);
        });
    });
    
    // Timer Functions
    function formatTime(ms) {
        if (ms <= 0) return "00:00:00";
        const totalSecs = Math.floor(ms / 1000);
        const hours = Math.floor(totalSecs / 3600);
        const mins = Math.floor((totalSecs % 3600) / 60);
        const secs = totalSecs % 60;
        return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function updateTimer() {
        const endTime = parseInt(localStorage.getItem('brineTimerEnd'));
        if (!endTime || isNaN(endTime)) {
            timerContainer.style.display = 'none';
            if (timerInterval) clearInterval(timerInterval);
            return;
        }
        
        timerContainer.style.display = 'block';
        const now = Date.now();
        const remaining = endTime - now;
        
        if (remaining <= 0) {
            liveTimerDisplay.textContent = "00:00:00";
            liveTimerDisplay.style.color = "var(--warn)";
            clearInterval(timerInterval);
            alert("Brining time is up! Please remove your meat from the brine immediately to prevent over-salting.");
        } else {
            liveTimerDisplay.textContent = formatTime(remaining);
            liveTimerDisplay.style.color = "var(--accent)";
        }
    }

    startTimerBtn.addEventListener("click", () => {
        if (maxHoursForTimer > 0) {
            const endTime = Date.now() + (maxHoursForTimer * 3600 * 1000);
            localStorage.setItem('brineTimerEnd', endTime.toString());
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(updateTimer, 1000);
            updateTimer();
        } else {
            alert("Please calculate a brine first to set the timer duration.");
        }
    });

    stopTimerBtn.addEventListener("click", () => {
        localStorage.removeItem('brineTimerEnd');
        if (timerInterval) clearInterval(timerInterval);
        timerContainer.style.display = 'none';
    });

    if (localStorage.getItem('brineTimerEnd')) {
        timerInterval = setInterval(updateTimer, 1000);
        updateTimer();
    }

    // Ingestion of URL Parameters
    function parseUrlParameters() {
        const params = new URLSearchParams(window.location.search);
        const weight = params.get('weight');
        const unit = params.get('unit');
        const protein = params.get('protein');

        if (unit && (unit.toLowerCase() === 'kg' || unit.toLowerCase() === 'metric')) {
            setWeightUnit('kg');
        } else if (unit && (unit.toLowerCase() === 'lbs' || unit.toLowerCase() === 'imperial')) {
            setWeightUnit('lbs');
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

        if (weight) {
            meatWeight.value = parseFloat(weight) || 10;
        }

        updateUI();

        if (protein || weight) {
            calculate();
        }
    }

    // Init
    parseUrlParameters();
});