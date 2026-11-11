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

// Global state variables
let currentUnit = 'lbs'; // 'lbs' or 'kg'

// A link weight must be a positive number; anything else is ignored
const MAX_LINK_WEIGHT = 1000000;
function linkWeight(raw) {
    if (raw === null || raw.length > 32) return null;
    const n = parseFloat(raw);
    return isFinite(n) && n > 0 ? Math.min(n, MAX_LINK_WEIGHT) : null;
}

// "Cooking on" is local wall-clock time (the datetime-local value), never parsed as UTC
function parseCookTime(raw) {
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(raw || "");
    if (!m || +m[4] > 23 || +m[5] > 59) return null;
    const d = new Date(+m[1], m[2] - 1, +m[3], +m[4], +m[5]);
    return d.getFullYear() === +m[1] && d.getMonth() === m[2] - 1 && d.getDate() === +m[3] ? d : null;
}

function cookTimeValue(d) {
    const p = n => (n < 10 ? "0" : "") + n;
    return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate()) + "T" + p(d.getHours()) + ":" + p(d.getMinutes());
}

// Ingestion of URL Parameters
function parseUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    const weight = params.get('weight');
    const unit = params.get('unit');
    const protein = params.get('protein');

    if (unit && (unit.toLowerCase() === 'kg' || unit.toLowerCase() === 'metric')) {
        currentUnit = 'kg';
        document.getElementById("unit-imperial").classList.remove("active");
        document.getElementById("unit-metric").classList.add("active");
        document.getElementById("weight-label").textContent = "Weight (kg)";
    } else {
        currentUnit = 'lbs';
        document.getElementById("unit-metric").classList.remove("active");
        document.getElementById("unit-imperial").classList.add("active");
        document.getElementById("weight-label").textContent = "Weight (lbs)";
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
        const linked = linkWeight(weight);
        document.getElementById("meat-weight").value = linked !== null ? linked : 12;
    }

    const cook = params.get('cook');
    if (cook && parseCookTime(cook)) {
        document.getElementById("cook-time").value = cook;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Theme (Light / Dark) is handled globally by ../kinetic.js

    // Parse incoming params
    parseUrlParameters();

    // Inputs
    const unitImperialBtn = document.getElementById("unit-imperial");
    const unitMetricBtn = document.getElementById("unit-metric");
    const proteinType = document.getElementById("protein-type");
    const meatWeight = document.getElementById("meat-weight");
    const weightLabel = document.getElementById("weight-label");
    const calculateBtn = document.getElementById("calculate-btn");

    // Outputs
    const fridgeTimeOutput = document.getElementById("fridge-time-output");
    const waterTimeOutput = document.getElementById("water-time-output");
    const safetyWarningContainer = document.getElementById("safety-warning-container");
    const waterCard = document.getElementById("water-card");
    const seafoodWarningContainer = document.getElementById("seafood-warning-container");
    const cookTime = document.getElementById("cook-time");
    const fridgeStartOutput = document.getElementById("fridge-start-output");
    const waterStartOutput = document.getElementById("water-start-output");
    const waterStartNote = document.getElementById("water-start-note");
    const scheduleWarningContainer = document.getElementById("schedule-warning-container");
    let cookSeeded = false;

    // Unit toggle event listeners
    unitImperialBtn.addEventListener("click", () => {
        if (currentUnit !== 'lbs') {
            currentUnit = 'lbs';
            unitImperialBtn.classList.add("active");
            unitMetricBtn.classList.remove("active");
            weightLabel.textContent = "Weight (lbs)";
            
            // Auto convert value
            const currentVal = parseFloat(meatWeight.value) || 0;
            if (currentVal > 0) {
                meatWeight.value = (currentVal * 2.20462).toFixed(1);
            }
            calculateThawing();
        }
    });

    unitMetricBtn.addEventListener("click", () => {
        if (currentUnit !== 'kg') {
            currentUnit = 'kg';
            unitMetricBtn.classList.add("active");
            unitImperialBtn.classList.remove("active");
            weightLabel.textContent = "Weight (kg)";
            
            // Auto convert value
            const currentVal = parseFloat(meatWeight.value) || 0;
            if (currentVal > 0) {
                meatWeight.value = (currentVal / 2.20462).toFixed(1);
            }
            calculateThawing();
        }
    });

    // Main calculation function
    function calculateThawing() {
        const weightInput = parseFloat(meatWeight.value) || 0;
        const protein = proteinType.value;

        if (weightInput <= 0) {
            fridgeTimeOutput.textContent = "--";
            waterTimeOutput.textContent = "--";
            safetyWarningContainer.style.display = "none";
            if (seafoodWarningContainer) seafoodWarningContainer.style.display = "none";
            fridgeStartOutput.textContent = "--";
            waterStartOutput.textContent = "--";
            waterStartNote.textContent = "(cook immediately after)";
            scheduleWarningContainer.style.display = "none";
            return;
        }

        // Convert weight to lbs internally for calculation standard rules
        let weightLbs = weightInput;
        if (currentUnit === 'kg') {
            weightLbs = weightInput * 2.20462;
        }

        // Determine thawing rates based on specific protein characteristics
        let fridgeRateLbsPerDay = 5.0; // Default: 24 hours per 5 lbs (USDA standard)
        let waterRateHoursPerLb = 0.5; // Default: 30 mins/lb
        let minFridgeHours = 24; // USDA: even small amounts (a pound of ground meat or boneless chicken breasts) need a full day

        if (protein === 'turkey' || protein === 'duck-goose') {
            fridgeRateLbsPerDay = 4.0; // Whole dense birds / thick poultry (4 lbs/day)
            waterRateHoursPerLb = 0.6; // 36 mins/lb
        } else if (protein === 'chicken') {
            fridgeRateLbsPerDay = 5.0; // 5 lbs/day
            waterRateHoursPerLb = 0.5; // 30 mins/lb
        } else if (protein === 'beef-roast' || protein === 'beef-brisket' || protein === 'pork-shoulder' || protein === 'lamb') {
            fridgeRateLbsPerDay = 5.0; // Large roasts/joints (5 lbs/day)
            waterRateHoursPerLb = 0.5; // 30 mins/lb
        } else if (protein === 'game-meat') {
            fridgeRateLbsPerDay = 5.5; // Lean venison/bison (5.5 lbs/day)
            waterRateHoursPerLb = 0.45; // 27 mins/lb
        } else if (protein === 'seafood') {
            fridgeRateLbsPerDay = 8.0; // Fish & seafood thaws much faster (8 lbs/day)
            minFridgeHours = 12; // FDA: thaw seafood in the refrigerator overnight
            waterRateHoursPerLb = 0.3; // 18 mins/lb
        } else if (protein === 'beef-steak') {
            fridgeRateLbsPerDay = 5.0; // 5 lbs/day for bigger packs of cuts
            minFridgeHours = 12; // At least overnight for individual cuts
            waterRateHoursPerLb = 0.4; // 24 mins/lb
        } else if (protein === 'ground-meat' || protein === 'ground-poultry') {
            fridgeRateLbsPerDay = 5.0; // 5 lbs/day for bulk packs
            waterRateHoursPerLb = 0.5; // 30 mins/lb
        }

        // Calculate refrigerator thawing time
        const fridgeHours = Math.max(minFridgeHours, (weightLbs / fridgeRateLbsPerDay) * 24);

        // Calculate cold water thawing time
        const waterHours = weightLbs * waterRateHoursPerLb;

        // Display results
        fridgeTimeOutput.textContent = formatFridgeTime(fridgeHours);
        waterTimeOutput.textContent = formatWaterTime(waterHours);

        // Safety warning trigger: Cold water thawing duration exceeds 6 hours
        if (waterHours > 6) {
            safetyWarningContainer.innerHTML = `⚠️ Safety Warning: Cold water thawing for proteins of this size exceeds 6 hours. To prevent exponential bacterial growth in the 'Danger Zone' (40°F to 140°F), refrigerator thawing is strictly recommended for this weight class.`;
            safetyWarningContainer.style.display = "block";
            waterCard.style.borderColor = "color-mix(in oklab, var(--neg) 50%, transparent)";
        } else {
            safetyWarningContainer.style.display = "none";
            waterCard.style.borderColor = "color-mix(in oklab, var(--neg) 30%, transparent)";
        }

        // Seafood Botulism Safety Warning
        if (seafoodWarningContainer) {
            if (protein === 'seafood') {
                seafoodWarningContainer.style.display = "block";
            } else {
                seafoodWarningContainer.style.display = "none";
            }
        }

        // Count back from "Cooking on" using the same rounded times shown above
        const fridgeMs = Math.ceil(fridgeHours) * 3600000;
        const waterMs = Math.round(waterHours * 60) * 60000;
        if (!cookSeeded) {
            cookSeeded = true;
            if (!parseCookTime(cookTime.value)) cookTime.value = cookTimeValue(seedCookTime(fridgeMs));
        }
        updateSchedule(fridgeMs, waterMs, waterHours > 6);

        // Update pipeline links in real-time
        updatePipelineLinks(weightInput, currentUnit, protein);
    }

    // First view: the next Thursday at 2 PM that still leaves the full fridge time
    function seedCookTime(fridgeMs) {
        const now = new Date();
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (11 - now.getDay()) % 7, 14, 0);
        while (d.getTime() - fridgeMs < now.getTime()) d.setDate(d.getDate() + 7);
        return d;
    }

    function formatWhen(d) {
        return d.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    }

    function updateSchedule(fridgeMs, waterMs, waterTooLong) {
        const cook = parseCookTime(cookTime.value);
        waterStartNote.textContent = waterTooLong
            ? "(cook immediately after; over 6 hours in water, so the refrigerator is the safer choice)"
            : "(cook immediately after)";
        if (!cook) {
            fridgeStartOutput.textContent = "--";
            waterStartOutput.textContent = "--";
            scheduleWarningContainer.style.display = "none";
            return;
        }
        const fridgeStart = new Date(cook.getTime() - fridgeMs);
        const waterStart = new Date(cook.getTime() - waterMs);
        const now = Date.now();
        fridgeStartOutput.textContent = formatWhen(fridgeStart);
        waterStartOutput.textContent = formatWhen(waterStart);

        // Cold water is always faster than the fridge, so a missed water start means both are missed
        if (waterStart.getTime() < now) {
            scheduleWarningContainer.textContent = "⚠️ Both start times have already passed for this cook time. Move your cook time later.";
        } else if (fridgeStart.getTime() < now && waterTooLong) {
            scheduleWarningContainer.textContent = "⚠️ The time to move it to the fridge has already passed, and cold water would run over 6 hours at this weight, so the refrigerator is still the safer choice. Move your cook time later if you can.";
        } else if (fridgeStart.getTime() < now) {
            scheduleWarningContainer.textContent = `⚠️ The time to move it to the fridge has already passed. Thaw it in cold water instead, starting by ${formatWhen(waterStart)}, and cook it immediately after, or move your cook time later.`;
        } else {
            scheduleWarningContainer.style.display = "none";
            return;
        }
        scheduleWarningContainer.style.display = "block";
    }

    // Helper to format fridge time
    function formatFridgeTime(totalHours) {
        const roundedHours = Math.ceil(totalHours); // Round before splitting so 47.6 hrs reads "2 days", not "1 day, 24 hrs"
        if (roundedHours < 24) {
            return `${roundedHours} ${roundedHours === 1 ? 'hr' : 'hrs'}`;
        }
        const days = Math.floor(roundedHours / 24);
        const remainingHours = roundedHours % 24;
        if (remainingHours === 0) {
            return `${days} ${days === 1 ? 'day' : 'days'}`;
        }
        return `${days} ${days === 1 ? 'day' : 'days'}, ${remainingHours} ${remainingHours === 1 ? 'hr' : 'hrs'}`;
    }

    // Helper to format water time
    function formatWaterTime(totalHours) {
        const totalMinutes = Math.round(totalHours * 60); // Round before splitting so 1.99 hrs reads "2 hrs", not "1 hr, 60 mins"
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours === 0) {
            return `${minutes} ${minutes === 1 ? 'min' : 'mins'}`;
        }
        if (minutes === 0) {
            return `${hours} ${hours === 1 ? 'hr' : 'hrs'}`;
        }
        return `${hours} ${hours === 1 ? 'hr' : 'hrs'}, ${minutes} ${minutes === 1 ? 'min' : 'mins'}`;
    }

    // Dynamic next-steps update
    function updatePipelineLinks(weight, unit, protein) {
        const pipelineLinkBrine = document.getElementById("pipeline-link-brine");
        const pipelineLinkReverse = document.getElementById("pipeline-link-reverse");

        if (pipelineLinkBrine) {
            pipelineLinkBrine.href = getToolUrl('brine', { weight: weight, unit: unit, protein: protein });
        }
        if (pipelineLinkReverse) {
            pipelineLinkReverse.href = getToolUrl('reverseRoast', { weight: weight, unit: unit, protein: protein });
        }
    }

    // Share links: only built when "Copy link" is clicked, never written to the
    // address bar. ?weight=&unit=&protein= are the existing hand-off params from
    // the other meat tools, so a copied link reads back through parseUrlParameters.
    const copyLinkBtn = document.getElementById("copy-link-btn");
    const copyLinkStatus = document.getElementById("copy-link-status");
    let copyLinkTimer = null;

    function shareParams() {
        const params = new URLSearchParams();
        const weight = linkWeight(String(parseFloat(meatWeight.value)));
        if (weight !== null) params.set('weight', weight);
        params.set('unit', currentUnit);
        params.set('protein', proteinType.value);
        if (parseCookTime(cookTime.value)) params.set('cook', cookTime.value);
        return params.toString();
    }

    function showCopyLinkStatus(msg) {
        copyLinkStatus.textContent = msg;
        clearTimeout(copyLinkTimer);
        copyLinkTimer = setTimeout(() => copyLinkStatus.textContent = "", 3000);
    }

    function fallbackCopyLink(text) {
        const ta = document.createElement("textarea");
        let ok = false;
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        copyLinkBtn.focus();
        showCopyLinkStatus(ok ? "Link copied" : "Couldn't copy the link");
    }

    copyLinkBtn.addEventListener("click", () => {
        const url = location.origin + location.pathname + '?' + shareParams();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(() => showCopyLinkStatus("Link copied"), () => fallbackCopyLink(url));
        } else {
            fallbackCopyLink(url);
        }
    });

    // Calculate on button click or input changes
    calculateBtn.addEventListener("click", calculateThawing);
    proteinType.addEventListener("change", calculateThawing);
    meatWeight.addEventListener("input", calculateThawing);
    cookTime.addEventListener("input", calculateThawing);

    // Initial calculation on load
    calculateThawing();
});
