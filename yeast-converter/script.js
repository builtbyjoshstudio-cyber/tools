/**
 * Yeast Converter - Core Business Logic
 * Converts between Active Dry, Instant, and Fresh yeast.
 */

// Conversion ratios by weight
const yeastRatios = {
    "active-dry": {
        "instant": 0.75,
        "fresh": 2.5
    },
    "instant": {
        "active-dry": 1.33,
        "fresh": 3.0
    },
    "fresh": {
        "active-dry": 0.4,
        "instant": 0.33
    }
};

// Unit constants
const G_PER_OZ = 28.35;
const G_PER_TSP = 3.1;
const G_PER_PACKET = 7.0;

document.addEventListener("DOMContentLoaded", () => {
    // Theme (Light / Mist / Dark) is handled globally by ../kinetic.js

    // DOM Elements
    const inputAmount = document.getElementById("input-amount");
    const yeastFrom = document.getElementById("yeast-from");
    const inputUnit = document.getElementById("input-unit");

    // Output DOM Elements
    // Result Card 1
    const resultTitle1 = document.getElementById("result-title-1");
    const resultWeight1 = document.getElementById("result-weight-1");
    const resultVolume1 = document.getElementById("result-volume-1");
    const resultVolumeContainer1 = document.getElementById("result-volume-container-1");

    // Result Card 2
    const resultTitle2 = document.getElementById("result-title-2");
    const resultWeight2 = document.getElementById("result-weight-2");
    const resultVolume2 = document.getElementById("result-volume-2");
    const resultVolumeContainer2 = document.getElementById("result-volume-container-2");

    /**
     * Enforces the unit guard: Fresh yeast is weight-only.
     * Teaspoons and packets options are hidden/disabled when Fresh is selected.
     */
    function enforceUnitGuard() {
        const selectedYeast = yeastFrom.value;
        const tspOption = inputUnit.querySelector('option[value="tsp"]');
        const packetOption = inputUnit.querySelector('option[value="packet"]');

        if (selectedYeast === "fresh") {
            // Disable and hide volume options for Fresh yeast
            if (tspOption) {
                tspOption.disabled = true;
                tspOption.style.display = "none";
            }
            if (packetOption) {
                packetOption.disabled = true;
                packetOption.style.display = "none";
            }

            // If the user currently has a volume unit selected, fallback to grams
            if (inputUnit.value === "tsp" || inputUnit.value === "packet") {
                inputUnit.value = "g";
            }
        } else {
            // Enable and show volume options for dry yeasts
            if (tspOption) {
                tspOption.disabled = false;
                tspOption.style.display = "block";
            }
            if (packetOption) {
                packetOption.disabled = false;
                packetOption.style.display = "block";
            }
        }
    }

    /**
     * Performs conversion math and updates the output display cards.
     */
    function calculateConversions() {
        const amount = parseFloat(inputAmount.value) || 0;
        const fromType = yeastFrom.value;
        const unit = inputUnit.value;

        // 1. Convert input amount to base weight in grams
        let baseGrams = 0;
        if (unit === "g") {
            baseGrams = amount;
        } else if (unit === "oz") {
            baseGrams = amount * G_PER_OZ;
        } else if (unit === "tsp") {
            baseGrams = amount * G_PER_TSP;
        } else if (unit === "packet") {
            baseGrams = amount * G_PER_PACKET;
        }

        // Determine targets based on selection
        const targets = [];
        if (fromType === "active-dry") {
            targets.push({ type: "instant", label: "Instant Yeast" });
            targets.push({ type: "fresh", label: "Fresh Yeast" });
        } else if (fromType === "instant") {
            targets.push({ type: "active-dry", label: "Active Dry Yeast" });
            targets.push({ type: "fresh", label: "Fresh Yeast" });
        } else if (fromType === "fresh") {
            targets.push({ type: "active-dry", label: "Active Dry Yeast" });
            targets.push({ type: "instant", label: "Instant Yeast" });
        }

        // 2. Perform conversions and update DOM
        updateResultCard(targets[0], baseGrams, fromType, resultTitle1, resultWeight1, resultVolume1, resultVolumeContainer1);
        updateResultCard(targets[1], baseGrams, fromType, resultTitle2, resultWeight2, resultVolume2, resultVolumeContainer2);
    }

    /**
     * Updates an individual result card container.
     */
    function updateResultCard(target, baseGrams, fromType, titleEl, weightEl, volumeEl, volumeContainerEl) {
        titleEl.textContent = target.label;

        // Calculate converted weight in grams
        const ratio = yeastRatios[fromType][target.type];
        const targetGrams = baseGrams * ratio;
        const targetOunces = targetGrams / G_PER_OZ;

        // Display weight in g & oz (with standard rounded presentation)
        const displayG = targetGrams.toFixed(1).replace(/\.0$/, '');
        const displayOz = targetOunces.toFixed(2).replace(/\.00$/, '');
        weightEl.textContent = `${displayG} g / ${displayOz} oz`;

        // If it is a dry yeast type, show teaspoon and packet equivalents
        if (target.type === "active-dry" || target.type === "instant") {
            const targetTsp = targetGrams / G_PER_TSP;
            const targetPackets = targetGrams / G_PER_PACKET;

            const displayTsp = targetTsp.toFixed(2).replace(/\.00$/, '');
            const displayPackets = targetPackets.toFixed(2).replace(/\.00$/, '');

            volumeEl.textContent = `approx. ${displayTsp} tsp or ${displayPackets} packets`;
            volumeContainerEl.style.display = "block";
        } else {
            // Fresh yeast is weight-only (hide volume block)
            volumeContainerEl.style.display = "none";
        }
    }

    // Event Listeners
    yeastFrom.addEventListener("change", () => {
        enforceUnitGuard();
        calculateConversions();
    });
    inputUnit.addEventListener("change", calculateConversions);
    inputAmount.addEventListener("input", calculateConversions);

    // Parse URL parameters for direct link ingestion
    function parseUrlParameters() {
        const params = new URLSearchParams(window.location.search);
        const amountParam = params.get("amount");
        const typeParam = params.get("type");
        const unitParam = params.get("unit");

        if (amountParam && !isNaN(parseFloat(amountParam))) {
            inputAmount.value = amountParam;
        }

        if (typeParam) {
            const validTypes = ["active-dry", "instant", "fresh"];
            if (validTypes.includes(typeParam.toLowerCase())) {
                yeastFrom.value = typeParam.toLowerCase();
            }
        }

        enforceUnitGuard(); // Guard must run before checking unit

        if (unitParam) {
            const validUnits = ["g", "oz", "tsp", "packet"];
            if (validUnits.includes(unitParam.toLowerCase())) {
                // Check if unit is valid for current selection
                if (yeastFrom.value !== "fresh" || (unitParam !== "tsp" && unitParam !== "packet")) {
                    inputUnit.value = unitParam.toLowerCase();
                }
            }
        }

        calculateConversions();
    }

    // Initialize
    parseUrlParameters();
});
