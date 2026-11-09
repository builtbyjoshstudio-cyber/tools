document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------
    // Theme Management
    // ---------------------------------------------------------
    // Theme (Light / Mist / Dark) handled globally by ../kinetic.js

    // ---------------------------------------------------------
    // Data Dictionary
    // ---------------------------------------------------------
    // restTime is set only where the rest is fixed (barbecue cooler holds, fish);
    // every other profile rests by weight in generateTimeline().
    // bands: [from lbs, up to lbs, minutes] at the top of each charted range.
    const roastingData = {
        'turkey': {
            name: 'Turkey (Whole or Breast)',
            // USDA FSIS unstuffed timetable at 325°F: breast 4-6 and 6-8 lb, then whole birds
            bands: [[4, 6, 135], [6, 8, 195], [8, 12, 180], [12, 14, 225], [14, 18, 255], [18, 20, 270], [20, 24, 300]],
            temp: '325°F (165°C)'
        },
        'chicken': {
            name: 'Chicken (Whole or Pieces)',
            minsPerPound: 20,
            temp: '375°F (190°C)'
        },
        'duck-goose': {
            name: 'Duck & Goose',
            minsPerPound: 20,
            temp: '375°F (190°C)'
        },
        'beef-roast': {
            name: 'Beef Roasts (Prime Rib)',
            // USDA chart: bone-in rib roast at 325°F, 23 to 25 min per lb
            minsPerPound: 25,
            temp: '325°F (165°C)'
        },
        'beef-tri-tip': {
            name: 'Beef Tri-Tip Roast',
            // Beef checkoff oven chart at 425°F, to medium: 1.5-2 lb 40-50 min, 2-3 lb 50-60 min
            bands: [[1.5, 2, 50], [2, 3, 60]],
            temp: '425°F (220°C)'
        },
        'beef-brisket': {
            name: 'Beef Brisket (Low & Slow)',
            minsPerPound: 60,
            restTime: 120,
            temp: '250°F (120°C)'
        },
        'beef-steak': {
            name: 'Steaks & Chops (Individual)',
            minsPerPound: 25,
            temp: '225°F (105°C)'
        },
        'pork-shoulder': {
            name: 'Pork Shoulder (Boston Butt)',
            minsPerPound: 45,
            restTime: 60,
            temp: '350°F (175°C)'
        },
        'pork-loin': {
            name: 'Pork Loin Roast',
            minsPerPound: 20,
            temp: '350°F (175°C)'
        },
        'ham': {
            name: 'Ham (Whole or Half)',
            minsPerPound: 20,
            temp: '325°F (165°C)'
        },
        'lamb': {
            name: 'Lamb Leg or Rack',
            minsPerPound: 20,
            temp: '325°F (165°C)'
        },
        'ground-meat': {
            name: 'Ground Beef, Pork & Lamb',
            minsPerPound: 20,
            temp: '350°F (175°C)'
        },
        'ground-poultry': {
            name: 'Ground Turkey & Chicken',
            minsPerPound: 20,
            temp: '350°F (175°C)'
        },
        'game-meat': {
            name: 'Venison & Bison (Lean Game)',
            minsPerPound: 25,
            temp: '300°F (150°C)'
        },
        'seafood': {
            name: 'Fish & Seafood',
            minsPerPound: 12,
            restTime: 5,
            temp: '400°F (200°C)'
        }
    };

    // ---------------------------------------------------------
    // DOM Elements
    // ---------------------------------------------------------
    const meatTypeInput = document.getElementById('protein-type');
    const meatWeightInput = document.getElementById('meat-weight');
    const targetTimeInput = document.getElementById('target-time');
    const generateBtn = document.getElementById('generate-btn');
    const timelineOutput = document.getElementById('timeline-output');
    const copyBtn = document.getElementById('copy-btn');

    const unitImperialBtn = document.getElementById('unit-imperial');
    const unitMetricBtn = document.getElementById('unit-metric');
    let currentUnit = 'imperial';

    // ---------------------------------------------------------
    // Event Listeners for UI
    // ---------------------------------------------------------
    meatTypeInput.addEventListener('change', () => {
        const data = roastingData[meatTypeInput.value];
        if (data && data.fixedTimeMins) {
            meatWeightInput.disabled = true;
            meatWeightInput.style.opacity = '0.5';
        } else {
            meatWeightInput.disabled = false;
            meatWeightInput.style.opacity = '1';
        }
    });

    // ---------------------------------------------------------
    // Core Logic
    // ---------------------------------------------------------
    function formatTime(dateObj, serveDate) {
        let hours = dateObj.getHours();
        let minutes = dateObj.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        
        // Label steps that fall on an earlier calendar day than the meal
        const stepDay = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
        const serveDay = new Date(serveDate.getFullYear(), serveDate.getMonth(), serveDate.getDate());
        const daysBefore = Math.round((serveDay - stepDay) / 86400000);
        const dayLabel = daysBefore === 1 ? ' (day before)' : daysBefore > 1 ? ` (${daysBefore} days before)` : '';
        
        return `${hours}:${minutes} ${ampm}${dayLabel}`;
    }

    // Charted total time for the weight; past either end of the chart, scale that end's time by weight
    function bandCookTime(bands, weight) {
        const first = bands[0];
        const last = bands[bands.length - 1];
        if (weight < first[0]) return Math.round(first[2] * weight / first[0]);
        // A weight where two bands meet (8 lb: breast or whole bird) takes the shorter time, which sits inside both ranges
        const fits = bands.filter(band => weight >= band[0] && weight <= band[1]);
        if (fits.length) return Math.min(...fits.map(band => band[2]));
        return Math.round(last[2] * weight / last[1]);
    }

    function generateTimeline() {
        const meatKey = meatTypeInput.value;
        const weightInputVal = parseFloat(meatWeightInput.value);
        const targetTimeStr = targetTimeInput.value; // e.g. "18:00"

        if (!meatKey || !targetTimeStr) {
            alert('Please enter a valid meat type and target time.');
            return;
        }

        const data = roastingData[meatKey];
        if (!data) return;

        let totalCookTimeMins;
        let weightDesc = "";
        
        // Convert to lbs internally if metric for formulas
        const weight = currentUnit === 'metric' ? weightInputVal * 2.20462 : weightInputVal;

        if (data.fixedTimeMins) {
            totalCookTimeMins = data.fixedTimeMins;
            weightDesc = `1 rack of`;
        } else {
            if (isNaN(weightInputVal) || weightInputVal <= 0) {
                alert('Please enter a valid weight.');
                return;
            }
            totalCookTimeMins = data.bands ? bandCookTime(data.bands, weight) : Math.round(weight * data.minsPerPound);
            weightDesc = `${weightInputVal} ${currentUnit === 'metric' ? 'kg' : 'lbs'} of`;
        }
        
        // Dynamic resting calculation (profiles with their own restTime keep it)
        let restTime = data.restTime;
        if (!data.fixedTimeMins && !restTime) {
            if (weight < 2) {
                restTime = 10;
            } else if (weight <= 8) {
                restTime = 20;
            } else {
                restTime = 40;
            }
        }

        // Step 4 (Serve): Target Dinner Time
        // Create a date object for today at the specific time
        const [targetHours, targetMinutes] = targetTimeStr.split(':').map(Number);
        const serveTime = new Date();
        serveTime.setHours(targetHours, targetMinutes, 0, 0);

        // Step 3 (Rest)
        // Subtract rest time to get the "Pull from Oven" time
        const pullTime = new Date(serveTime.getTime() - (restTime * 60000));

        // Step 2 (Cook)
        // Set cook time based on fixed time or weight. Subtract from pullTime.
        const ovenTime = new Date(pullTime.getTime() - (totalCookTimeMins * 60000));

        // Preheat & Recovery calculations
        const hasBuffer = (!data.fixedTimeMins && weight > 5);
        
        let preheatTime, recoveryStartTime, roastingTime;
        if (hasBuffer) {
            // The 15-minute recovery is the start of the charted cook time, not extra time on top of it
            recoveryStartTime = ovenTime;
            roastingTime = new Date(ovenTime.getTime() + (15 * 60000));
            preheatTime = new Date(recoveryStartTime.getTime() - (30 * 60000));
        } else {
            preheatTime = new Date(ovenTime.getTime() - (30 * 60000));
        }

        // Barbecue cuts hold in a cooler, matching the Perfect Roast Pull Temp Calculator
        const restDesc = restTime >= 60
            ? `Pull from oven and hold in an insulated cooler for ${restTime} mins before slicing.`
            : `Pull from oven and let rest for ${restTime} mins.`;

        // Render to DOM
        if (hasBuffer) {
            timelineOutput.innerHTML = `
                <li>
                    <div class="timeline-step">Step 1: Preheat (Start Preparation Time)</div>
                    <div class="timeline-time">${formatTime(preheatTime, serveTime)}</div>
                    <div class="timeline-desc">Preheat Oven/Smoker to ${data.temp}.</div>
                </li>
                <li>
                    <div class="timeline-step">Step 2: Oven Recovery & Initial Searing Buffer</div>
                    <div class="timeline-time">${formatTime(recoveryStartTime, serveTime)}</div>
                    <div class="timeline-desc">Put meat in the oven. Ambient temperature will drop; this 15-minute buffer allows the oven to recover heat and begin initial searing.</div>
                </li>
                <li>
                    <div class="timeline-step">Step 3: Put in Oven & Roast</div>
                    <div class="timeline-time">${formatTime(roastingTime, serveTime)}</div>
                    <div class="timeline-desc">Main roasting phase: Roast ${weightDesc} ${data.name} for ~${totalCookTimeMins - 15} mins.</div>
                </li>
                <li>
                    <div class="timeline-step">Step 4: Rest</div>
                    <div class="timeline-time">${formatTime(pullTime, serveTime)}</div>
                    <div class="timeline-desc">${restDesc}</div>
                </li>
                <li>
                    <div class="timeline-step">Step 5: Serve</div>
                    <div class="timeline-time">${formatTime(serveTime, serveTime)}</div>
                    <div class="timeline-desc">Carve and enjoy your perfect ${data.name}!</div>
                </li>
            `;
        } else {
            timelineOutput.innerHTML = `
                <li>
                    <div class="timeline-step">Step 1: Preheat (Start Preparation Time)</div>
                    <div class="timeline-time">${formatTime(preheatTime, serveTime)}</div>
                    <div class="timeline-desc">Preheat Oven/Smoker to ${data.temp}.</div>
                </li>
                <li>
                    <div class="timeline-step">Step 2: Put in Oven</div>
                    <div class="timeline-time">${formatTime(ovenTime, serveTime)}</div>
                    <div class="timeline-desc">Roast ${weightDesc} ${data.name} for ~${totalCookTimeMins} mins.</div>
                </li>
                <li>
                    <div class="timeline-step">Step 3: Rest</div>
                    <div class="timeline-time">${formatTime(pullTime, serveTime)}</div>
                    <div class="timeline-desc">${restDesc}</div>
                </li>
                <li>
                    <div class="timeline-step">Step 4: Serve</div>
                    <div class="timeline-time">${formatTime(serveTime, serveTime)}</div>
                    <div class="timeline-desc">Carve and enjoy your perfect ${data.name}!</div>
                </li>
            `;
        }
    }

    generateBtn.addEventListener('click', generateTimeline);

    function setUnitSystem(unit) {
        currentUnit = unit;
        const weightLabel = document.querySelector('label[for="meat-weight"]');
        if (unit === 'metric') {
            unitMetricBtn.classList.add('active');
            unitImperialBtn.classList.remove('active');
            if (weightLabel) weightLabel.textContent = "Weight (kg)";
        } else {
            unitImperialBtn.classList.add('active');
            unitMetricBtn.classList.remove('active');
            if (weightLabel) weightLabel.textContent = "Weight (lbs)";
        }
        const items = timelineOutput.querySelectorAll('li');
        if (items.length > 0 && !items[0].classList.contains('placeholder-text')) {
            generateTimeline();
        }
    }

    if (unitImperialBtn) unitImperialBtn.addEventListener('click', () => setUnitSystem('imperial'));
    if (unitMetricBtn) unitMetricBtn.addEventListener('click', () => setUnitSystem('metric'));

    // ---------------------------------------------------------
    // Clipboard Logic
    // ---------------------------------------------------------
    copyBtn.addEventListener('click', () => {
        const items = timelineOutput.querySelectorAll('li');
        if (items.length === 0 || items[0].classList.contains('placeholder-text')) {
            alert('Please generate a timeline first.');
            return;
        }

        let clipboardText = "Cooking Timeline\n----------------\n";
        items.forEach(item => {
            const step = item.querySelector('.timeline-step').innerText;
            const time = item.querySelector('.timeline-time').innerText;
            const desc = item.querySelector('.timeline-desc').innerText;
            clipboardText += `${time} | ${step}\n  - ${desc}\n\n`;
        });

        navigator.clipboard.writeText(clipboardText).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy text.');
        });
    });

    // Ingestion of URL Parameters
    function parseUrlParameters() {
        const params = new URLSearchParams(window.location.search);
        const weight = params.get('weight');
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
            // Trigger change event to disable/enable weight input appropriately
            const data = roastingData[select.value];
            if (data && data.fixedTimeMins) {
                meatWeightInput.disabled = true;
                meatWeightInput.style.opacity = '0.5';
            } else {
                meatWeightInput.disabled = false;
                meatWeightInput.style.opacity = '1';
            }
        }

        if (weight) {
            meatWeightInput.value = parseFloat(weight) || 5;
        }

        // Set target time to 6:00 PM if it's not set
        if (!targetTimeInput.value) {
            targetTimeInput.value = "18:00";
        }

        if (protein || weight) {
            generateTimeline();
        }
    }

    parseUrlParameters();
});
