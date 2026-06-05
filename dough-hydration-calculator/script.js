const TYNKR_REGISTRY = {
    scaler: "../universal-recipe-scaler/",
    reverseRoast: "../reverse-roasting-calculator/",
    panSwap: "../pan-swap-calculator/",
    roastPull: "../perfect-roast-pull-temp-calculator/",
    brine: "../brine-calculator/",
    thawing: "../meat-thawing-planner/",
    dough: "../dough-hydration-calculator/",
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

    // State Variables
    let currentUnit = 'oz'; // 'oz' (imperial) or 'g' (metric)

    // Elements
    const unitMetricBtn = document.getElementById("unit-metric");
    const unitImperialBtn = document.getElementById("unit-imperial");
    
    const flourType = document.getElementById("flour-type");
    const bakingPreset = document.getElementById("baking-preset");
    const calcMode = document.getElementById("calc-mode");
    const targetLabel = document.getElementById("target-label");
    const targetValueInput = document.getElementById("target-value");
    
    const hydrationSlider = document.getElementById("hydration-slider");
    const hydrationBubble = document.getElementById("hydration-bubble");
    
    const totalYieldOutput = document.getElementById("total-yield-output");
    const flourOutput = document.getElementById("flour-output");
    const waterOutput = document.getElementById("water-output");
    const saltOutput = document.getElementById("salt-output");
    const yeastOutput = document.getElementById("yeast-output");
    const waterPctLabel = document.getElementById("water-pct-label");
    const yeastLabel = document.getElementById("yeast-label");
    const yeastPctLabel = document.getElementById("yeast-pct-label");
    const warningContainer = document.getElementById("absorbency-warning-container");
    const eggNoteContainer = document.getElementById("egg-note-container");
    const pipelineLinkPan = document.getElementById("pipeline-link-pan");

    // Presets mapping
    const presets = {
        neapolitan: 60,
        sourdough: 72,
        baguette: 65,
        ciabatta: 82,
        "tokyo-ramen": 35,
        soba: 40
    };

    // Set weight unit state
    function setWeightUnit(unit) {
        if (unit === 'g') {
            currentUnit = 'g';
            unitMetricBtn.classList.add("active");
            unitImperialBtn.classList.remove("active");
            targetValueInput.step = "1";
            if (calcMode.value === 'total-dough') {
                targetLabel.textContent = "Target Dough Weight (g)";
            } else {
                targetLabel.textContent = "Target Flour Mass (g)";
            }
        } else {
            currentUnit = 'oz';
            unitImperialBtn.classList.add("active");
            unitMetricBtn.classList.remove("active");
            targetValueInput.step = "0.1";
            if (calcMode.value === 'total-dough') {
                targetLabel.textContent = "Target Dough Weight (oz)";
            } else {
                targetLabel.textContent = "Target Flour Mass (oz)";
            }
        }
    }

    // Toggle metric
    unitMetricBtn.addEventListener("click", () => {
        if (currentUnit !== 'g') {
            const val = parseFloat(targetValueInput.value) || 0;
            // Convert oz to g
            targetValueInput.value = Math.round(val * 28.3495);
            setWeightUnit('g');
            calculateRatios();
        }
    });

    // Toggle imperial
    unitImperialBtn.addEventListener("click", () => {
        if (currentUnit !== 'oz') {
            const val = parseFloat(targetValueInput.value) || 0;
            // Convert g to oz
            targetValueInput.value = (Math.round(val / 28.3495 * 10) / 10).toFixed(1);
            setWeightUnit('oz');
            calculateRatios();
        }
    });

    // Mode Selector change
    calcMode.addEventListener("change", () => {
        if (calcMode.value === 'total-dough') {
            targetLabel.textContent = currentUnit === 'g' ? "Target Dough Weight (g)" : "Target Dough Weight (oz)";
            targetValueInput.value = currentUnit === 'g' ? "1000" : "35.3";
        } else {
            targetLabel.textContent = currentUnit === 'g' ? "Target Flour Mass (g)" : "Target Flour Mass (oz)";
            targetValueInput.value = currentUnit === 'g' ? "600" : "21.2";
        }
        calculateRatios();
    });

    // Preset Selection
    bakingPreset.addEventListener("change", () => {
        const presetVal = bakingPreset.value;
        if (presetVal !== "custom" && presets[presetVal] !== undefined) {
            hydrationSlider.value = presets[presetVal];
            hydrationBubble.textContent = `${presets[presetVal]}%`;
        }
        calculateRatios();
    });

    // Slider Interaction
    hydrationSlider.addEventListener("input", () => {
        hydrationBubble.textContent = `${hydrationSlider.value}%`;
        bakingPreset.value = "custom";
        calculateRatios();
    });

    // Inputs listener
    targetValueInput.addEventListener("input", calculateRatios);
    flourType.addEventListener("change", () => {
        const selectedFlour = flourType.value;
        if (selectedFlour === 'buckwheat-soba') {
            hydrationSlider.value = 40;
            hydrationBubble.textContent = "40%";
            bakingPreset.value = "soba";
        } else if (selectedFlour === 'ramen-alkaline') {
            hydrationSlider.value = 35;
            hydrationBubble.textContent = "35%";
            bakingPreset.value = "tokyo-ramen";
        } else if (selectedFlour === 'pasta-semolina') {
            hydrationSlider.value = 45;
            hydrationBubble.textContent = "45%";
            bakingPreset.value = "custom";
        } else if (selectedFlour === 'tipo-00') {
            hydrationSlider.value = 60;
            hydrationBubble.textContent = "60%";
            bakingPreset.value = "neapolitan";
        }
        calculateRatios();
    });

    // Baker's Percentage Core Engine
    function calculateRatios() {
        const targetVal = parseFloat(targetValueInput.value) || 0;
        const hydration = parseInt(hydrationSlider.value) || 72;
        const mode = calcMode.value;
        const selectedFlour = flourType.value;

        // Constants: Salt (2%), Yeast (1% unless unleavened noodle)
        const saltPct = 2;
        const hasYeast = !(selectedFlour === "buckwheat-soba" || selectedFlour === "pasta-semolina");
        const yeastPct = hasYeast ? 1 : 0;

        let flourMass = 0;
        let waterMass = 0;
        let saltMass = 0;
        let yeastMass = 0;
        let totalDoughWeight = 0;

        if (mode === "total-dough") {
            // Total % = 100 + hydration + salt + yeast
            const totalPct = 100 + hydration + saltPct + yeastPct;
            flourMass = (targetVal * 100) / totalPct;
            waterMass = (flourMass * hydration) / 100;
            saltMass = (flourMass * saltPct) / 100;
            yeastMass = hasYeast ? (flourMass * yeastPct) / 100 : 0;
            totalDoughWeight = targetVal;
        } else {
            // mode === "flour-mass"
            flourMass = targetVal;
            waterMass = (flourMass * hydration) / 100;
            saltMass = (flourMass * saltPct) / 100;
            yeastMass = hasYeast ? (flourMass * yeastPct) / 100 : 0;
            totalDoughWeight = flourMass + waterMass + saltMass + yeastMass;
        }

        // Format outputs
        const unitSuffix = ` ${currentUnit}`;
        const decimals = currentUnit === 'g' ? 0 : 1;

        totalYieldOutput.textContent = formatVal(totalDoughWeight, decimals) + unitSuffix;
        flourOutput.textContent = formatVal(flourMass, decimals) + unitSuffix;
        waterOutput.textContent = formatVal(waterMass, decimals) + unitSuffix;
        saltOutput.textContent = formatVal(saltMass, decimals) + unitSuffix;
        yeastOutput.textContent = formatVal(yeastMass, decimals) + unitSuffix;
        waterPctLabel.textContent = `${hydration}% hydration`;

        // Yeast Mass Visibility Toggle (Hidden for unleavened buckwheat-soba and pasta-semolina)
        const yeastRow = yeastOutput.closest(".anatomy-row");
        if (yeastRow) {
            yeastRow.style.display = hasYeast ? "flex" : "none";
        }

        // Special Rule for Ramen: Kansui substitution
        if (selectedFlour === "ramen-alkaline") {
            yeastLabel.textContent = "Kansui (Alkaline Salts)";
            yeastPctLabel.textContent = "1% of flour weight";
        } else {
            yeastLabel.textContent = "Yeast Mass";
            yeastPctLabel.textContent = "1% base weight";
        }

        // Special Rule for Pasta: Egg conversion note
        if (selectedFlour === "pasta-semolina") {
            const eggWeight = currentUnit === 'g' ? 50 : 1.76;
            const eggsCount = (waterMass / eggWeight).toFixed(1);
            eggNoteContainer.innerHTML = `🥚 <strong>Chef's Egg Conversion:</strong> For traditional egg pasta, you can replace the water weight (${formatVal(waterMass, decimals)}${unitSuffix}) with whole eggs. At approximately 50g (1.8 oz) per large egg, this recipe requires about <strong>${eggsCount} large eggs</strong> to reach the target hydration.`;
            eggNoteContainer.style.display = "block";
        } else {
            eggNoteContainer.style.display = "none";
        }

        // Absorbency Interceptor (Hydration caps/bounds)
        let warningText = "";
        const isNoodleFlour = ["buckwheat-soba", "ramen-alkaline", "pasta-semolina"].includes(selectedFlour);

        if (isNoodleFlour && hydration > 48) {
            warningText = "⚠️ Structural Warning: Noodle and pasta doughs require low hydration (typically under 48%). Exceeding this limit will make the dough too soft and sticky, causing it to lose its firm, bite-resistant chew and preventing it from rolling and cutting into clean noodle strands.";
        } else if (selectedFlour === "ap-flour" && hydration > 65) {
            warningText = "⚠️ Structural Warning: Hydration above 65% exceeds the optimal physical capacity of All-Purpose Flour. The dough may become overly sticky and lose its structure, making it difficult to knead or shape.";
        } else if (selectedFlour === "tipo-00" && hydration > 62) {
            warningText = "⚠️ Structural Warning: Hydration above 62% exceeds the optimal capacity of standard Tipo 00 Flour. The dough may become unmanageably sticky and fail to hold shape without advanced slap-and-fold techniques.";
        } else if (selectedFlour === "gluten-free" && hydration < 75) {
            warningText = "⚠️ Structural Warning: Gluten-free blends require high hydration (at least 75%) to activate binder agents like xanthan gum. Hydration below 75% will cause dry cracking and a crumbly, dry baked texture.";
        }

        if (warningText) {
            warningContainer.textContent = warningText;
            warningContainer.style.display = "block";
        } else {
            warningContainer.style.display = "none";
        }

        // Update pipeline cross-promotion link
        if (pipelineLinkPan) {
            pipelineLinkPan.href = getToolUrl('panSwap', {
                doughWeight: totalDoughWeight.toFixed(decimals),
                unit: currentUnit === 'g' ? 'metric' : 'imperial'
            });
        }
    }

    function formatVal(val, decimals) {
        if (decimals === 0) {
            return Math.round(val);
        }
        return (Math.round(val * 10) / 10).toFixed(decimals);
    }

    // URL Parameter Ingestion
    function parseUrlParameters() {
        const params = new URLSearchParams(window.location.search);
        const weight = params.get('weight');
        const unit = params.get('unit');
        const flour = params.get('flour');
        const preset = params.get('preset');
        const hydration = params.get('hydration');
        const mode = params.get('mode');

        if (unit) {
            if (unit.toLowerCase() === 'g' || unit.toLowerCase() === 'metric') {
                setWeightUnit('g');
            } else if (unit.toLowerCase() === 'oz' || unit.toLowerCase() === 'imperial') {
                setWeightUnit('oz');
            }
        } else {
            setWeightUnit('oz');
        }

        if (mode && (mode === 'total-dough' || mode === 'flour-mass')) {
            calcMode.value = mode;
            if (mode === 'total-dough') {
                targetLabel.textContent = currentUnit === 'g' ? "Target Dough Weight (g)" : "Target Dough Weight (oz)";
            } else {
                targetLabel.textContent = currentUnit === 'g' ? "Target Flour Mass (g)" : "Target Flour Mass (oz)";
            }
        }

        if (weight) {
            targetValueInput.value = weight;
        } else {
            targetValueInput.value = currentUnit === 'g' ? "1000" : "35.3";
        }

        if (flour) {
            const selectVal = flour.toLowerCase();
            const validFlours = [
                'ap-flour', 'bread-flour', 'whole-wheat', 'rye-flour', 
                'ancient-grain', 'tipo-00', 'high-gluten', 
                'buckwheat-soba', 'ramen-alkaline', 'pasta-semolina', 'gluten-free'
            ];
            if (validFlours.includes(selectVal)) {
                flourType.value = selectVal;
            }
        }

        if (preset) {
            const selectPreset = preset.toLowerCase();
            const validPresets = ['neapolitan', 'sourdough', 'baguette', 'ciabatta', 'tokyo-ramen', 'soba', 'custom'];
            if (validPresets.includes(selectPreset)) {
                bakingPreset.value = selectPreset;
                if (selectPreset !== 'custom' && presets[selectPreset] !== undefined) {
                    hydrationSlider.value = presets[selectPreset];
                    hydrationBubble.textContent = `${presets[selectPreset]}%`;
                }
            }
        }

        if (hydration) {
            const hydVal = parseInt(hydration);
            if (hydVal >= 30 && hydVal <= 95) {
                hydrationSlider.value = hydVal;
                hydrationBubble.textContent = `${hydVal}%`;
                bakingPreset.value = "custom";
            }
        }

        calculateRatios();
    }

    // Initialize
    parseUrlParameters();
});
