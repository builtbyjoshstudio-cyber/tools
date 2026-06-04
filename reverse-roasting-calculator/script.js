document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------
    // Theme Management
    // ---------------------------------------------------------
    const themeBtn = document.getElementById('theme-toggle');
    const themes = ['dark', 'light', 'mist'];
    let currentThemeIndex = 0; // Starts at dark

    themeBtn.addEventListener('click', () => {
        currentThemeIndex = (currentThemeIndex + 1) % themes.length;
        const newTheme = themes[currentThemeIndex];
        
        document.documentElement.setAttribute('data-theme', newTheme);
        themeBtn.textContent = 'Theme: ' + newTheme.charAt(0).toUpperCase() + newTheme.slice(1);
    });

    // ---------------------------------------------------------
    // Data Dictionary
    // ---------------------------------------------------------
    const roastingData = {
        'turkey': {
            name: 'Turkey (Whole or Breast)',
            minsPerPound: 15,
            restTime: 30,
            temp: '325°F (165°C)'
        },
        'chicken': {
            name: 'Chicken (Whole or Pieces)',
            minsPerPound: 20,
            restTime: 15,
            temp: '375°F (190°C)'
        },
        'duck-goose': {
            name: 'Duck & Goose',
            minsPerPound: 20,
            restTime: 15,
            temp: '375°F (190°C)'
        },
        'beef-roast': {
            name: 'Beef Roasts (Prime Rib/Tri-Tip)',
            minsPerPound: 15,
            restTime: 30,
            temp: '325°F (165°C)'
        },
        'beef-brisket': {
            name: 'Beef Brisket (Low & Slow)',
            minsPerPound: 60,
            restTime: 60,
            temp: '250°F (120°C)'
        },
        'beef-steak': {
            name: 'Steaks & Chops (Individual)',
            minsPerPound: 25,
            restTime: 10,
            temp: '225°F (105°C)'
        },
        'pork-shoulder': {
            name: 'Pork Shoulder & Hams',
            minsPerPound: 40,
            restTime: 60,
            temp: '250°F (120°C)'
        },
        'lamb': {
            name: 'Lamb Leg or Rack',
            minsPerPound: 20,
            restTime: 20,
            temp: '325°F (165°C)'
        },
        'ground-meat': {
            name: 'Ground Meats (Beef/Pork/Turkey)',
            minsPerPound: 20,
            restTime: 10,
            temp: '350°F (175°C)'
        },
        'game-meat': {
            name: 'Venison & Bison (Lean Game)',
            minsPerPound: 25,
            restTime: 20,
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
    function formatTime(dateObj) {
        let hours = dateObj.getHours();
        let minutes = dateObj.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
        minutes = minutes < 10 ? '0' + minutes : minutes;
        
        return `${hours}:${minutes} ${ampm}`;
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
            totalCookTimeMins = Math.round(weight * data.minsPerPound);
            weightDesc = `${weightInputVal} ${currentUnit === 'metric' ? 'kg' : 'lbs'} of`;
        }
        
        // Dynamic resting calculation
        let restTime = data.restTime;
        if (!data.fixedTimeMins) {
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
            roastingTime = ovenTime;
            recoveryStartTime = new Date(ovenTime.getTime() - (15 * 60000));
            preheatTime = new Date(recoveryStartTime.getTime() - (30 * 60000));
        } else {
            preheatTime = new Date(ovenTime.getTime() - (30 * 60000));
        }

        // Render to DOM
        if (hasBuffer) {
            timelineOutput.innerHTML = `
                <li>
                    <div class="timeline-step">Step 1: Preheat (Start Preparation Time)</div>
                    <div class="timeline-time">${formatTime(preheatTime)}</div>
                    <div class="timeline-desc">Preheat Oven/Smoker to ${data.temp}. (Start preparation time is adjusted backward by 15 minutes to account for heat loss).</div>
                </li>
                <li>
                    <div class="timeline-step">Step 2: Oven Recovery & Initial Searing Buffer</div>
                    <div class="timeline-time">${formatTime(recoveryStartTime)}</div>
                    <div class="timeline-desc">Put meat in the oven. Ambient temperature will drop; this 15-minute buffer allows the oven to recover heat and begin initial searing.</div>
                </li>
                <li>
                    <div class="timeline-step">Step 3: Put in Oven & Roast</div>
                    <div class="timeline-time">${formatTime(roastingTime)}</div>
                    <div class="timeline-desc">Main roasting phase: Roast ${weightDesc} ${data.name} for ~${totalCookTimeMins} mins.</div>
                </li>
                <li>
                    <div class="timeline-step">Step 4: Rest</div>
                    <div class="timeline-time">${formatTime(pullTime)}</div>
                    <div class="timeline-desc">Pull from oven and let rest for ${restTime} mins.</div>
                </li>
                <li>
                    <div class="timeline-step">Step 5: Serve</div>
                    <div class="timeline-time">${formatTime(serveTime)}</div>
                    <div class="timeline-desc">Carve and enjoy your perfect ${data.name}!</div>
                </li>
            `;
        } else {
            timelineOutput.innerHTML = `
                <li>
                    <div class="timeline-step">Step 1: Preheat (Start Preparation Time)</div>
                    <div class="timeline-time">${formatTime(preheatTime)}</div>
                    <div class="timeline-desc">Preheat Oven/Smoker to ${data.temp}.</div>
                </li>
                <li>
                    <div class="timeline-step">Step 2: Put in Oven</div>
                    <div class="timeline-time">${formatTime(ovenTime)}</div>
                    <div class="timeline-desc">Roast ${weightDesc} ${data.name} for ~${totalCookTimeMins} mins.</div>
                </li>
                <li>
                    <div class="timeline-step">Step 3: Rest</div>
                    <div class="timeline-time">${formatTime(pullTime)}</div>
                    <div class="timeline-desc">Pull from oven and let rest for ${restTime} mins.</div>
                </li>
                <li>
                    <div class="timeline-step">Step 4: Serve</div>
                    <div class="timeline-time">${formatTime(serveTime)}</div>
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

        let clipboardText = "Reverse Roasting Timeline\n-------------------------\n";
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
