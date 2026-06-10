document.addEventListener('DOMContentLoaded', () => {
    // Theme switching is handled globally by ../kinetic.js

    // --- DATASETS ---

    const cookwareMaterials = [
        {
            id: 'stainless-steel',
            name: 'Stainless Steel (Tri-Ply Clad)',
            bestFor: ['Sautéing', 'Pan Sauces', 'Deglazing', 'General Boiling & Searing'],
            avoidFor: ['Delicate foods without fat (e.g., eggs, crepes)'],
            pros: ['Extremely durable and dishwasher safe', 'Completely non-reactive to acidic foods', 'Excellent fond creation (caramelized bits)', 'No seasoning required'],
            cons: ['Food will stick if heat control or fat coverage is poor', 'Takes longer to heat than aluminum or copper'],
            heatRetention: 'Moderate',
            responsiveness: 'High (when clad)',
            stickResistance: 'Low',
            acidReactivity: 'Safe',
            inductionCompatibility: 'Compatible only if magnetic / induction-ready',
            ovenSafety: 'Safe',
            maintenanceLevel: 'Low',
            commonShapes: ['Skillet', 'Sauté Pan', 'Saucepan', 'Stockpot']
        },
        {
            id: 'cast-iron',
            name: 'Bare Cast Iron',
            bestFor: ['High-Heat Searing', 'Baking (Cornbread/Pizza)', 'Shallow & Deep Frying'],
            avoidFor: ['Delicate fish fillets', 'Long tomato sauce or wine reductions', 'Boiling water'],
            pros: ['Excellent heat retention (minimizes temperature drops)', 'Extremely durable and inexpensive', 'Develops a natural semi-nonstick seasoning'],
            cons: ['Heavy and slow to heat evenly', 'Must be seasoned, hand-washed, and dried immediately', 'Acidic foods leach metallic tastes and strip seasoning'],
            heatRetention: 'Excellent',
            responsiveness: 'Low',
            stickResistance: 'Moderate',
            acidReactivity: 'Reactive (Avoid acids)',
            inductionCompatibility: 'Generally Compatible',
            ovenSafety: 'Safe',
            maintenanceLevel: 'High',
            commonShapes: ['Skillet', 'Dutch Oven', 'Griddle']
        },
        {
            id: 'carbon-steel',
            name: 'Carbon Steel',
            bestFor: ['Stir-Frying (Wok)', 'Searing Steaks', 'Frying Eggs & Crepes'],
            avoidFor: ['Long acidic braises', 'Boiling water'],
            pros: ['Lighter weight alternative to cast iron', 'Excellent responsiveness for a seasoned metal', 'Develops a very slick nonstick surface'],
            cons: ['Prone to rust if left wet', 'Requires manual seasoning and maintenance', 'Acidic deglazing can weaken seasoning'],
            heatRetention: 'Moderate-High',
            responsiveness: 'Moderate-High',
            stickResistance: 'Moderate-High',
            acidReactivity: 'Reactive (Avoid acids)',
            inductionCompatibility: 'Generally Compatible',
            ovenSafety: 'Safe',
            maintenanceLevel: 'High',
            commonShapes: ['Skillet', 'Wok', 'Crepe Pan']
        },
        {
            id: 'enameled-cast-iron',
            name: 'Enameled Cast Iron',
            bestFor: ['Braising & Stews', 'Dutch Oven Bread Baking', 'Slow-Simmered Acidic Sauces'],
            avoidFor: ['High-heat dry stir-frying', 'Delicate eggs'],
            pros: ['Excellent heat retention and emissivity', 'Inert enameled coating is 100% acid-safe', 'No seasoning or special maintenance required'],
            cons: ['Very heavy', 'Slow to heat and adjust temperatures', 'Enamel can chip under thermal shock or impact'],
            heatRetention: 'Excellent',
            responsiveness: 'Low',
            stickResistance: 'Moderate',
            acidReactivity: 'Safe',
            inductionCompatibility: 'Generally Compatible',
            ovenSafety: 'Limited; check knob rating',
            maintenanceLevel: 'Low',
            commonShapes: ['Dutch Oven', 'Braiser', 'Skillet']
        },
        {
            id: 'traditional-nonstick',
            name: 'Traditional Nonstick (PTFE)',
            bestFor: ['Eggs & Omelets', 'Delicate Fish Fillets', 'Pancakes', 'Low-Fat Cooking'],
            avoidFor: ['High-heat searing', 'Stir-frying', 'Metal utensil usage'],
            pros: ['Superb stick resistance', 'Very easy cleanup', 'Requires minimal cooking fats'],
            cons: ['Short lifespan (2-5 years)', 'Coating degrades at high heats (500°F+)', 'Easily scratched by metal'],
            heatRetention: 'Low',
            responsiveness: 'High',
            stickResistance: 'Excellent',
            acidReactivity: 'Safe',
            inductionCompatibility: 'Incompatible unless built with an induction base',
            ovenSafety: 'Limited; check manufacturer rating',
            maintenanceLevel: 'Moderate',
            commonShapes: ['Skillet', 'Griddle', 'Saucepan']
        },
        {
            id: 'lined-copper',
            name: 'Lined Copper (Stainless/Tin-Lined)',
            bestFor: ['Delicate Sauces (Béarnaise)', 'Sugar Work & Caramels', 'Precise Sautéing'],
            avoidFor: ['Extremely high-heat searing', 'Metal utensils (if tin-lined)'],
            pros: ['Incredible thermal responsiveness', 'Extremely even heat distribution', 'Beautiful appearance'],
            cons: ['Very expensive', 'Requires exterior polishing', 'Tin linings can melt at 450°F'],
            heatRetention: 'Low',
            responsiveness: 'Excellent',
            stickResistance: 'Low',
            acidReactivity: 'Safe',
            inductionCompatibility: 'Incompatible unless built with an induction base',
            ovenSafety: 'Limited; check manufacturer rating',
            maintenanceLevel: 'High',
            commonShapes: ['Saucepan', 'Sauté Pan', 'Skillet']
        },
        {
            id: 'unlined-copper',
            name: 'Unlined Copper',
            bestFor: ['Beating Egg Whites (foams)', 'Boiling Sugar & Candy Making'],
            avoidFor: ['General Savory Cooking', 'Acidic Ingredients', 'Searing Meat'],
            pros: ['Highest possible heat conductivity', 'Stabilizes egg white proteins'],
            cons: ['Highly reactive; can cause copper toxicity if used with acidic foods', 'Extremely limited cooking utility'],
            heatRetention: 'Low',
            responsiveness: 'Excellent',
            stickResistance: 'Low',
            acidReactivity: 'Reactive (Avoid acids)',
            inductionCompatibility: 'Incompatible unless built with an induction base',
            ovenSafety: 'Safe',
            maintenanceLevel: 'High',
            commonShapes: ['Egg White Bowl', 'Candy Kettle', 'Jam Pan']
        },
        {
            id: 'aluminum-anodized',
            name: 'Aluminum / Hard-Anodized',
            bestFor: ['All-Purpose Sautéing', 'Pancakes', 'Sheet Pan Baking'],
            avoidFor: ['Bare aluminum: acidic cooking'],
            pros: ['Lightweight and budget-friendly', 'Excellent heat distribution', 'Hard-anodizing makes it scratch-resistant and non-reactive'],
            cons: ['Bare aluminum reacts with acids (discolors food)', 'Cannot be cleaned in a dishwasher (discolors anodized coatings)'],
            heatRetention: 'Moderate',
            responsiveness: 'High',
            stickResistance: 'Moderate',
            acidReactivity: 'Safe (Anodized) / Reactive (Bare)',
            inductionCompatibility: 'Incompatible unless built with an induction base',
            ovenSafety: 'Limited; check manufacturer rating',
            maintenanceLevel: 'Low',
            commonShapes: ['Skillet', 'Griddle', 'Saucepan', 'Baking Sheet']
        }
    ];

    const cookwareTasks = [
        {
            id: 'searing-steak',
            taskName: 'Searing Steak / Chops',
            recommendedMaterials: ['Bare Cast Iron', 'Carbon Steel', 'Stainless Steel (Tri-Ply Clad)'],
            acceptableAlternatives: ['Aluminum / Hard-Anodized'],
            materialsToAvoid: ['Traditional Nonstick (PTFE)'],
            recommendedPanShapes: ['10" or 12" Skillet'],
            targetHeatLevel: 'High',
            explanation: 'Searing steaks requires transferring a massive amount of heat quickly to build a Maillard crust. High thermal mass (heat retention) materials like cast iron minimize temperature drops when the cold meat lands, ensuring a rapid sear without overcooking the center.',
            warnings: [
                'Do not use traditional nonstick pans for searing. The dry high heat degrades the nonstick surface and releases toxic fumes.',
                'Ensure your kitchen is well ventilated; high-heat searing will generate smoke.'
            ],
            cleanupNote: 'Allow the pan to cool to room temperature. Wash with hot water. For cast iron or carbon steel, dry completely immediately to prevent rust and wipe with a thin layer of oil.'
        },
        {
            id: 'tomato-sauce',
            taskName: 'Simmering Tomato Sauce / Wine Reductions',
            recommendedMaterials: ['Stainless Steel (Tri-Ply Clad)', 'Enameled Cast Iron'],
            acceptableAlternatives: ['Aluminum / Hard-Anodized', 'Lined Copper'],
            materialsToAvoid: ['Bare Cast Iron', 'Carbon Steel', 'Unlined Copper'],
            recommendedPanShapes: ['Saucepan', 'Dutch Oven', 'Sauté Pan'],
            targetHeatLevel: 'Low to Medium (Simmer)',
            explanation: 'Tomato sauce and wine reductions are highly acidic. Acidic ingredients dissolve metal ions from bare metals. In seasoned pans like cast iron or carbon steel, acids strip the protective seasoning coating, creating sticking problems and leaving metallic off-flavors in your food.',
            warnings: [
                'Long simmers in bare cast iron will turn tomato sauces dark/gray and alter the flavor profile.',
                'Never use unlined copper for acidic sauces; copper ingestion can lead to nausea and copper toxicity.'
            ],
            cleanupNote: 'Soak with warm soapy water to loosen cooked-on sauce. Stainless steel is dishwasher-safe; hand-wash enameled cast iron with a non-scratch sponge.'
        },
        {
            id: 'eggs',
            taskName: 'Frying Eggs / Omelets',
            recommendedMaterials: ['Traditional Nonstick (PTFE)', 'Carbon Steel'],
            acceptableAlternatives: ['Bare Cast Iron (well-seasoned)', 'Aluminum / Hard-Anodized'],
            materialsToAvoid: ['Stainless Steel (Tri-Ply Clad)'],
            recommendedPanShapes: ['8" or 10" Skillet'],
            targetHeatLevel: 'Low to Medium-Low',
            explanation: 'Eggs contain proteins that easily seep into microscopic metal pores, bonding tightly and tearing. A smooth nonstick coating or highly seasoned carbon steel skillet creates a barrier that prevents sticking, allowing eggs to release cleanly.',
            warnings: [
                'Keep heat below medium-low when using traditional nonstick to protect the coating.',
                'Avoid metal spatulas or forks; scratches will degrade nonstick properties.',
                'Do not use aerosol cooking sprays on nonstick pans. They contain propellants that leave a sticky residue that burns and ruins the coating.'
            ],
            cleanupNote: 'Let the pan cool. Wash gently with warm water, mild soap, and a soft sponge. Never use steel wool or abrasive green scrub pads.'
        },
        {
            id: 'stir-fry',
            taskName: 'Stir-Frying',
            recommendedMaterials: ['Carbon Steel'],
            acceptableAlternatives: ['Stainless Steel (Tri-Ply Clad)', 'Aluminum / Hard-Anodized'],
            materialsToAvoid: ['Traditional Nonstick (PTFE)'],
            recommendedPanShapes: ['12" or 14" Wok (Flat-bottom for home stoves)'],
            targetHeatLevel: 'High',
            explanation: 'Authentic stir-frying relies on intense heat and rapid tossing. Carbon steel woks heat up and cool down quickly, responding to heat adjustments while staying lightweight enough to toss foods easily.',
            warnings: [
                'Wok Hei requires extreme heat. Most residential burners lack the BTU output of professional wok ranges; a flat-bottom wok helps maximize heat transfer on home stoves.',
                'Never stir-fry in a nonstick wok at high dry temperatures; the coating will fail.'
            ],
            cleanupNote: 'Rinse with hot water, scrub off residues with a bamboo brush or sponge (no soap is needed if well-seasoned), dry thoroughly on a warm burner, and apply a drop of neutral oil.'
        },
        {
            id: 'delicate-fish',
            taskName: 'Searing Delicate Fish Fillets',
            recommendedMaterials: ['Traditional Nonstick (PTFE)', 'Carbon Steel'],
            acceptableAlternatives: ['Stainless Steel (Tri-Ply Clad)'],
            materialsToAvoid: ['Bare Cast Iron'],
            recommendedPanShapes: ['10" or 12" Skillet', 'Oval Fish Pan'],
            targetHeatLevel: 'Medium',
            explanation: 'Delicate fish skin tears easily under friction. Nonstick or seasoned carbon steel provides the release needed for a clean flip. Stainless steel is an alternative but requires precise heat and oil technique to prevent sticking.',
            warnings: [
                'If using stainless steel, preheat the pan fully until water droplets bead (Leidenfrost effect), add oil, let it shimmer, and do not attempt to flip the fish until it naturally releases from the surface.'
            ],
            cleanupNote: 'Wipe with warm water and soap. Avoid scraping.'
        },
        {
            id: 'pan-sauce',
            taskName: 'Pan Sauce After Searing',
            recommendedMaterials: ['Stainless Steel (Tri-Ply Clad)', 'Enameled Cast Iron'],
            acceptableAlternatives: ['Lined Copper', 'Aluminum / Hard-Anodized'],
            materialsToAvoid: ['Traditional Nonstick (PTFE)', 'Bare Cast Iron', 'Carbon Steel'],
            recommendedPanShapes: ['10" or 12" Skillet', 'Sauté Pan'],
            targetHeatLevel: 'Medium-Low',
            explanation: 'A great pan sauce depends on "fond" (the caramelized brown bits stuck to the pan bottom after searing). Stainless steel creates a moderate bond that builds excellent fond. Deglazing with wine, stock, or vinegar then lifts these bits into the sauce.',
            warnings: [
                'Nonstick pans do not build fond effectively because food does not stick enough to leave caramelization behind.',
                'Avoid bare cast iron and carbon steel for these tasks: acidic deglazing (using wine, lemon juice, or vinegar) can dull or weaken seasoning and may pick up metallic flavors, especially with longer reductions.'
            ],
            cleanupNote: 'The deglazing process does most of the cleaning for you by releasing the food bits! Wash residues off with soap and water.'
        },
        {
            id: 'pancakes',
            taskName: 'Pancakes / Crepes',
            recommendedMaterials: ['Traditional Nonstick (PTFE)', 'Carbon Steel', 'Bare Cast Iron'],
            acceptableAlternatives: ['Aluminum / Hard-Anodized'],
            materialsToAvoid: ['Stainless Steel (Tri-Ply Clad)'],
            recommendedPanShapes: ['Griddle', 'Crepe Pan', '10" or 12" Skillet'],
            targetHeatLevel: 'Medium-Low',
            explanation: 'Pancakes and crepes need low, steady heat distributed evenly across a flat surface. Nonstick or seasoned iron surfaces ensure clean release when flipping, preventing folds and tears.',
            warnings: [
                'Preheat thoroughly on low heat before adding batter. The first pancake is often uneven because the pan has not saturated with heat evenly.',
                'Avoid aerosol oil sprays on nonstick surfaces as they build a sticky residue that burns.'
            ],
            cleanupNote: 'Let the pan cool fully, then wash gently with a soft sponge.'
        },
        {
            id: 'boiling-water',
            taskName: 'Boiling Water (Pasta, Steaming)',
            recommendedMaterials: ['Stainless Steel (Tri-Ply Clad)', 'Aluminum / Hard-Anodized'],
            acceptableAlternatives: ['Enameled Cast Iron'],
            materialsToAvoid: ['Bare Cast Iron', 'Carbon Steel'],
            recommendedPanShapes: ['Stockpot', 'Saucepan'],
            targetHeatLevel: 'High',
            explanation: 'Boiling water requires lightweight, inert materials that conduct heat rapidly and are resistant to rusting. Stainless steel and aluminum heat water quickly without corroding.',
            warnings: [
                'Never leave water sitting in bare cast iron or carbon steel pans. It will cause rust within minutes.',
                'Add salt to water only after it is boiling; salting cold water can cause pitting corrosion on the bottom of stainless steel pans.'
            ],
            cleanupNote: 'Rinse and wipe dry. Stainless steel stockpots are dishwasher-safe.'
        },
        {
            id: 'stewing-braising',
            taskName: 'Stewing / Braising',
            recommendedMaterials: ['Enameled Cast Iron'],
            acceptableAlternatives: ['Stainless Steel (Tri-Ply Clad)', 'Bare Cast Iron'],
            materialsToAvoid: ['Traditional Nonstick (PTFE)', 'Unlined Copper'],
            recommendedPanShapes: ['5-Quart or 6-Quart Dutch Oven', 'Braiser'],
            targetHeatLevel: 'Low (Slow Simmer / Oven)',
            explanation: 'Braising requires searing meat, then simmering it in liquid in the oven for hours. Enameled cast iron is the ultimate choice: it retains heat exceptionally well, holds a steady simmer, and is non-reactive to braising liquids (like wine or tomatoes).',
            warnings: [
                'Avoid thermal shock: never pour cold water into a hot enameled pan, as it can cause the enamel coating to crack or shatter.',
                'Check the lid knob rating; plastic knobs on Dutch ovens are often only safe up to 375°F or 400°F. Replace with a metal knob for high-heat bread baking.'
            ],
            cleanupNote: 'Soak with warm water and baking soda to lift stubborn burnt-on spots. Do not use metal scrubbers.'
        },
        {
            id: 'sauteing-veggies',
            taskName: 'Sautéing Vegetables',
            recommendedMaterials: ['Stainless Steel (Tri-Ply Clad)', 'Aluminum / Hard-Anodized'],
            acceptableAlternatives: ['Carbon Steel', 'Enameled Cast Iron'],
            materialsToAvoid: ['Traditional Nonstick (PTFE)'],
            recommendedPanShapes: ['Sauté Pan', '12" Skillet'],
            targetHeatLevel: 'Medium-High',
            explanation: 'Sautéing vegetables requires medium-high heat, oil, and constant tossing to evaporate moisture and caramelize sugars. Clad stainless and aluminum transfer heat quickly, and sauté pans with straight sides prevent veggies from spilling out.',
            warnings: [
                'Sautéing translates to "to jump." Use a pan with straight, tall sides (a sauté pan) rather than sloped sides if you have a lot of volume to toss.'
            ],
            cleanupNote: 'Allow to cool, wash with soap and water.'
        }
    ];

    // --- DOM ELEMENTS ---

    const tabBtnAdvisor = document.getElementById('tab-btn-advisor');
    const tabBtnExplorer = document.getElementById('tab-btn-explorer');
    const tabBtnMatrix = document.getElementById('tab-btn-matrix');

    const viewAdvisor = document.getElementById('view-advisor');
    const viewExplorer = document.getElementById('view-explorer');
    const viewMatrix = document.getElementById('view-matrix');

    const taskSelect = document.getElementById('task-select');
    const advisorPlaceholder = document.getElementById('advisor-placeholder');
    const advisorResults = document.getElementById('advisor-results');

    // Advisor elements
    const recMaterialName = document.getElementById('rec-material-name');
    const recPanShape = document.getElementById('rec-pan-shape');
    const recHeatLevel = document.getElementById('rec-heat-level');
    const recExplanation = document.getElementById('rec-explanation');
    const recAlternatives = document.getElementById('rec-alternatives');
    const recAvoid = document.getElementById('rec-avoid');
    const recCleanup = document.getElementById('rec-cleanup');
    const advisorAlertsContainer = document.getElementById('advisor-alerts-container');

    // Advisor profile cells
    const specRetention = document.getElementById('spec-retention');
    const specResponsiveness = document.getElementById('spec-responsiveness');
    const specStick = document.getElementById('spec-stick');
    const specAcid = document.getElementById('spec-acid');
    const specInduction = document.getElementById('spec-induction');
    const specOven = document.getElementById('spec-oven');

    // Lists
    const materialsExplorerList = document.getElementById('materials-explorer-list');
    const matrixTbody = document.getElementById('matrix-tbody');

    // --- TAB SWITCHING LOGIC ---

    function switchTab(targetTab) {
        // Reset buttons
        [tabBtnAdvisor, tabBtnExplorer, tabBtnMatrix].forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-selected', 'false');
        });
        // Reset views
        [viewAdvisor, viewExplorer, viewMatrix].forEach(view => {
            view.classList.remove('active');
        });

        if (targetTab === 'advisor') {
            tabBtnAdvisor.classList.add('active');
            tabBtnAdvisor.setAttribute('aria-selected', 'true');
            viewAdvisor.classList.add('active');
        } else if (targetTab === 'explorer') {
            tabBtnExplorer.classList.add('active');
            tabBtnExplorer.setAttribute('aria-selected', 'true');
            viewExplorer.classList.add('active');
        } else if (targetTab === 'matrix') {
            tabBtnMatrix.classList.add('active');
            tabBtnMatrix.setAttribute('aria-selected', 'true');
            viewMatrix.classList.add('active');
        }
    }

    tabBtnAdvisor.addEventListener('click', () => switchTab('advisor'));
    tabBtnExplorer.addEventListener('click', () => switchTab('explorer'));
    tabBtnMatrix.addEventListener('click', () => switchTab('matrix'));

    // --- ADVISOR CONTROLLER ---

    taskSelect.addEventListener('change', () => {
        const taskId = taskSelect.value;
        const task = cookwareTasks.find(t => t.id === taskId);
        if (!task) return;

        // Hide placeholder, show results
        advisorPlaceholder.style.display = 'none';
        advisorResults.style.display = 'block';

        // Load recommended material details
        const recommendedMatName = task.recommendedMaterials[0];
        const materialProfile = cookwareMaterials.find(m => m.name.toLowerCase().includes(recommendedMatName.toLowerCase()) || recommendedMatName.toLowerCase().includes(m.name.toLowerCase()));

        // Populate Main recommendation
        recMaterialName.textContent = recommendedMatName;
        recPanShape.textContent = task.recommendedPanShapes.join(', ');
        recHeatLevel.textContent = task.targetHeatLevel;
        recExplanation.textContent = task.explanation;

        // Populate spec profile cells
        if (materialProfile) {
            specRetention.textContent = materialProfile.heatRetention;
            specResponsiveness.textContent = materialProfile.responsiveness;
            specStick.textContent = materialProfile.stickResistance;
            specAcid.textContent = materialProfile.acidReactivity;
            specInduction.textContent = materialProfile.inductionCompatibility === 'Generally Compatible' ? 'Yes' : (materialProfile.inductionCompatibility === 'Compatible only if magnetic / induction-ready' ? 'Conditionally' : 'No');
            specOven.textContent = materialProfile.ovenSafety;
        } else {
            [specRetention, specResponsiveness, specStick, specAcid, specInduction, specOven].forEach(el => el.textContent = '--');
        }

        // Populate Alternatives
        recAlternatives.innerHTML = '';
        if (task.acceptableAlternatives && task.acceptableAlternatives.length > 0) {
            task.acceptableAlternatives.forEach(alt => {
                const el = document.createElement('div');
                el.className = 'item-badge alt';
                el.textContent = alt;
                recAlternatives.appendChild(el);
            });
        } else {
            const el = document.createElement('div');
            el.className = 'item-badge alt';
            el.textContent = 'None';
            recAlternatives.appendChild(el);
        }

        // Populate Avoid
        recAvoid.innerHTML = '';
        if (task.materialsToAvoid && task.materialsToAvoid.length > 0) {
            task.materialsToAvoid.forEach(av => {
                const el = document.createElement('div');
                el.className = 'item-badge avoid';
                el.textContent = av;
                recAvoid.appendChild(el);
            });
        } else {
            const el = document.createElement('div');
            el.className = 'item-badge avoid';
            el.textContent = 'None';
            recAvoid.appendChild(el);
        }

        // Populate Warnings
        advisorAlertsContainer.innerHTML = '';
        if (task.warnings && task.warnings.length > 0) {
            advisorAlertsContainer.style.display = 'block';
            task.warnings.forEach(warn => {
                const el = document.createElement('div');
                el.className = 'advisor-alert';
                el.innerHTML = `
                    <span class="icon">⚠️</span>
                    <p>${warn}</p>
                `;
                advisorAlertsContainer.appendChild(el);
            });
        } else {
            advisorAlertsContainer.style.display = 'none';
        }

        // Populate Cleanup Note
        recCleanup.textContent = task.cleanupNote;
    });

    // --- MATERIALS EXPLORER GENERATOR ---

    function buildMaterialsExplorer() {
        materialsExplorerList.innerHTML = '';
        cookwareMaterials.forEach(m => {
            const card = document.createElement('div');
            card.className = 'glass type-card material-card';
            
            // Format arrays to strings
            const bestForStr = m.bestFor.join(', ');
            const avoidForStr = m.avoidFor.join(', ');
            const commonShapesStr = m.commonShapes.join(', ');

            // Sub-bullet templates for pros/cons
            let prosLi = m.pros.map(pro => `<li>${pro}</li>`).join('');
            let consLi = m.cons.map(con => `<li>${con}</li>`).join('');

            // Special warnings for Copper & Nonstick
            let warningBannerHtml = '';
            if (m.id === 'unlined-copper') {
                warningBannerHtml = `
                    <div class="advisor-alert" style="margin-top: 14px; margin-bottom: 0;">
                        <span class="icon">⚠️</span>
                        <p><b>Unlined Copper Reactivity Warning:</b> Unlined copper is highly reactive with acidic foods, which can cause copper toxicity. It is strictly limited to specialized tasks like beating egg whites (where copper ions stabilize foams) or sugar work.</p>
                    </div>
                `;
            } else if (m.id === 'traditional-nonstick') {
                warningBannerHtml = `
                    <div class="advisor-alert" style="margin-top: 14px; margin-bottom: 0;">
                        <span class="icon">⚠️</span>
                        <p><b>Nonstick Safety &amp; Care:</b> Never heat nonstick dry or on high heat (above 500°F), which degrades the coating and releases toxic fumes. Never use metal utensils, aerosol cooking sprays (the propellants leave a sticky residue), or continue using a pan once the coating is worn, scratched, or peeling.</p>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="material-card-header">
                    <h2>${m.name}</h2>
                    <span class="material-shapes">${commonShapesStr}</span>
                </div>
                
                <div class="spec-matrix-grid" style="margin-bottom: 18px;">
                    <div class="spec-cell">
                        <span class="lbl">Heat Retention</span>
                        <span class="val">${m.heatRetention}</span>
                    </div>
                    <div class="spec-cell">
                        <span class="lbl">Responsiveness</span>
                        <span class="val">${m.responsiveness}</span>
                    </div>
                    <div class="spec-cell">
                        <span class="lbl">Stick Resistance</span>
                        <span class="val">${m.stickResistance}</span>
                    </div>
                    <div class="spec-cell">
                        <span class="lbl">Acid Reactivity</span>
                        <span class="val">${m.acidReactivity}</span>
                    </div>
                    <div class="spec-cell">
                        <span class="lbl">Induction Friendly</span>
                        <span class="val" style="font-size: 11px; line-height:1.3;">${m.inductionCompatibility}</span>
                    </div>
                    <div class="spec-cell">
                        <span class="lbl">Oven Safety</span>
                        <span class="val" style="font-size: 11px; line-height:1.3;">${m.ovenSafety}</span>
                    </div>
                </div>

                <div class="pros-cons-grid">
                    <div class="pc-col pros">
                        <h4>Pros</h4>
                        <ul>${prosLi}</ul>
                    </div>
                    <div class="pc-col cons">
                        <h4>Cons</h4>
                        <ul>${consLi}</ul>
                    </div>
                </div>

                <div style="font-size: 13px; line-height: 1.5; color: var(--muted); border-top: 1px solid var(--line-2); padding-top: 12px;">
                    <div style="margin-bottom: 4px;"><b style="color:var(--ink);">Best For:</b> ${bestForStr}</div>
                    <div><b style="color:var(--ink);">Avoid For:</b> ${avoidForStr}</div>
                </div>

                ${warningBannerHtml}
            `;
            materialsExplorerList.appendChild(card);
        });
    }

    // --- COMPARISON MATRIX GENERATOR ---

    function buildComparisonMatrix() {
        matrixTbody.innerHTML = '';
        cookwareMaterials.forEach(m => {
            const tr = document.createElement('tr');
            
            // Format properties into short badge formats
            const acidSafeClass = m.acidReactivity === 'Safe' ? 'yes' : 'no';
            const acidSafeLabel = m.acidReactivity === 'Safe' ? 'Yes' : 'No';
            
            let indClass = 'no';
            let indLabel = 'No';
            if (m.inductionCompatibility === 'Generally Compatible') {
                indClass = 'yes';
                indLabel = 'Yes';
            } else if (m.inductionCompatibility === 'Compatible only if magnetic / induction-ready') {
                indClass = 'limited';
                indLabel = 'Magnetic Only';
            } else if (m.inductionCompatibility === 'Incompatible unless built with an induction base') {
                indClass = 'limited';
                indLabel = 'Needs Induction Base';
            }

            let weightLabel = 'Moderate';
            if (m.id.includes('cast-iron')) weightLabel = 'Heavy';
            else if (m.id.includes('copper')) weightLabel = 'Moderate-Heavy';
            else if (m.id.includes('aluminum') || m.id.includes('nonstick')) weightLabel = 'Light';

            const bestUsesStr = m.bestFor.slice(0, 2).join(', ');

            tr.innerHTML = `
                <td>${m.name}</td>
                <td>${m.heatRetention}</td>
                <td>${m.responsiveness}</td>
                <td>${m.stickResistance}</td>
                <td><span class="badge-static ${acidSafeClass}">${acidSafeLabel}</span></td>
                <td>${weightLabel}</td>
                <td>${m.maintenanceLevel}</td>
                <td><span class="badge-static ${indClass}">${indLabel}</span></td>
                <td style="color: var(--muted); font-size:12px;">${bestUsesStr}</td>
            `;
            matrixTbody.appendChild(tr);
        });
    }

    // --- INITIALIZATION ---
    buildMaterialsExplorer();
    buildComparisonMatrix();
});
