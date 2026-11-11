// Theme (Light / Dark) is handled globally by ../kinetic.js

// Calculator Logic
const origShape = document.getElementById('orig-shape');
const targetShape = document.getElementById('target-shape');
const origDims = document.getElementById('orig-dims');
const targetDims = document.getElementById('target-dims');
const multiplierOutput = document.getElementById('multiplier-output');
const areaOutput = document.getElementById('area-output');
const timeOutput = document.getElementById('time-output');
const unitImperialBtn = document.getElementById('unit-imperial');
const unitMetricBtn = document.getElementById('unit-metric');
let currentUnit = 'imperial';

const unitToggle = {
  get checked() {
    return currentUnit === 'metric';
  }
};

// Converts a length by factor, rounded to the inputs' 0.5 step.
function convertLength(value, factor) {
  return Math.round(value * factor * 2) / 2;
}

// Reads a size input. After a unit toggle the box shows a rounded number, so until it's edited, use the exact conversion.
function lengthOf(input) {
  return input.value === input.dataset.shown ? parseFloat(input.dataset.exact) : parseFloat(input.value);
}

function getInputsHtml(shape, prefix) {
  const unitStr = unitToggle && unitToggle.checked ? '(cm)' : '(in)';
  // Default sizes are in inches; show them in centimeters when metric is on.
  const def = inches => (unitToggle && unitToggle.checked) ? convertLength(inches, 2.54) : inches;
  const depthHtml = `
      <div class="input-group">
        <label class="input-label" for="${prefix}-depth">Depth ${unitStr}</label>
        <input type="number" id="${prefix}-depth" class="form-input" value="${def(shape === 'loaf' ? 3 : 2)}" min="1" step="0.5">
      </div>`;
  if (shape === 'muffin' || shape === 'bundt') {
    return '';
  } else if (shape === 'round') {
    return `
      <div class="input-group">
        <label class="input-label" for="${prefix}-dim1">Diameter ${unitStr}</label>
        <input type="number" id="${prefix}-dim1" class="form-input" value="${def(8)}" min="1" step="0.5">
      </div>${depthHtml}`;
  } else if (shape === 'square') {
    return `
      <div class="input-group">
        <label class="input-label" for="${prefix}-dim1">Side ${unitStr}</label>
        <input type="number" id="${prefix}-dim1" class="form-input" value="${def(8)}" min="1" step="0.5">
      </div>${depthHtml}`;
  } else if (shape === 'rectangular' || shape === 'loaf') {
    const isLoaf = shape === 'loaf';
    return `
      <div class="input-group">
        <label class="input-label" for="${prefix}-dim1">Length ${unitStr}</label>
        <input type="number" id="${prefix}-dim1" class="form-input" value="${def(isLoaf ? 9 : 13)}" min="1" step="0.5">
      </div>
      <div class="input-group">
        <label class="input-label" for="${prefix}-dim2">Width ${unitStr}</label>
        <input type="number" id="${prefix}-dim2" class="form-input" value="${def(isLoaf ? 5 : 9)}" min="1" step="0.5">
      </div>${depthHtml}`;
  }
}

function updateInputs() {
  origDims.innerHTML = getInputsHtml(origShape.value, 'orig');
  targetDims.innerHTML = getInputsHtml(targetShape.value, 'target');
  
  // Attach listeners to new inputs
  document.querySelectorAll('#orig-dims input, #target-dims input').forEach(input => {
    input.addEventListener('input', () => {
      // A typed value replaces the exact size kept from a unit toggle.
      delete input.dataset.shown;
      calculate();
    });
  });
  
  calculate();
}

function getArea(shape, prefix) {
  if (shape === 'muffin') {
    // Rounded sq-cm constants (64 sq in ≈ 412.9).
    // Intentionally rounded; any future depth-warning logic extended to muffin must account for this rounding rather than reusing the ÷6.4516 normalization directly.
    return (unitToggle && unitToggle.checked) ? 412 : 64;
  } else if (shape === 'bundt') {
    // Rounded sq-cm constants (117 sq in ≈ 754.8).
    // Intentionally rounded; any future depth-warning logic extended to bundt must account for this rounding rather than reusing the ÷6.4516 normalization directly.
    return (unitToggle && unitToggle.checked) ? 754 : 117;
  }

  const dim1El = document.getElementById(`${prefix}-dim1`);
  const dim1 = dim1El ? lengthOf(dim1El) || 0 : 0;
  
  if (shape === 'round') {
    const radius = dim1 / 2;
    return Math.PI * radius * radius;
  } else if (shape === 'square') {
    return dim1 * dim1;
  } else if (shape === 'rectangular' || shape === 'loaf') {
    const dim2El = document.getElementById(`${prefix}-dim2`);
    const dim2 = dim2El ? lengthOf(dim2El) || 0 : 0;
    return dim1 * dim2;
  }
  return 0;
}

function getDepth(prefix) {
  const depthEl = document.getElementById(`${prefix}-depth`);
  return depthEl ? lengthOf(depthEl) || 0 : 0;
}

function getVolume(shape, prefix) {
  if (shape === 'muffin' || shape === 'bundt') {
    // No sizes to enter, so use brim-full capacity: 12 x 1/2 cup = 6 cups (Joy of Baking) or the 10-cup Bundt.
    // Length x width x depth runs about 13% over a measured pan's capacity (Joy of Baking chart average),
    // so scale by 1.13 to compare on the same basis. 14.4375 cu in per US cup, 16.387064 cu cm per cu in.
    const cuIn = (shape === 'muffin' ? 6 : 10) * 14.4375 * 1.13;
    return (unitToggle && unitToggle.checked) ? cuIn * 16.387064 : cuIn;
  }
  return getArea(shape, prefix) * getDepth(prefix);
}

function calculate() {
  const area1 = getArea(origShape.value, 'orig');
  const area2 = getArea(targetShape.value, 'target');
  const depth1 = getDepth('orig');
  const depth2 = getDepth('target');
  const volume1 = getVolume(origShape.value, 'orig');
  const volume2 = getVolume(targetShape.value, 'target');
  const cuStr = unitToggle && unitToggle.checked ? 'cu cm' : 'cu in';

  if (volume1 > 0 && volume2 > 0) {
    // Scale by volume so the target pan fills to the same level as the original.
    const multiplier = volume2 / volume1;
    // format to 2 decimal places
    multiplierOutput.textContent = (Math.round(multiplier * 100) / 100).toFixed(2) + 'x';
    areaOutput.textContent = `Original: ${Math.round(volume1 * 10) / 10} ${cuStr} | Target: ${Math.round(volume2 * 10) / 10} ${cuStr}`;

    // At the same fill level, batter depth changes with pan depth. Muffin and Bundt depths are nominal, so they don't count.
    const isFixed = shape => shape === 'muffin' || shape === 'bundt';
    const hasFixed = isFixed(origShape.value) || isFixed(targetShape.value);
    const depthRatio = hasFixed ? 1 : depth2 / depth1;
    const areaRatio = area2 / area1;

    // Warning logic
    if (depthRatio > 1.1) {
      timeOutput.textContent = 'The target pan is deeper, so the batter sits deeper and bake time will be longer. Monitor closely.';
      timeOutput.style.color = 'var(--text-soft)';
    } else if (depthRatio < 0.9) {
      timeOutput.textContent = 'The target pan is shallower, so the batter sits thinner and bake time will be shorter. Check early!';
      timeOutput.style.color = 'var(--text-soft)';
    } else if (!hasFixed) {
      // Both depths are entered and within 10%, so the area-based hedges below don't apply.
      timeOutput.textContent = 'Similar pan depth, so the batter sits about as deep. Bake time should remain roughly the same (monitor closely).';
      timeOutput.style.color = 'var(--text-soft)';
    } else if (areaRatio > 1.1) {
      timeOutput.textContent = 'If the target pan is shallower, bake time may be shorter. Check early!';
      timeOutput.style.color = 'var(--text-soft)';
    } else if (areaRatio < 0.9) {
      timeOutput.textContent = 'If the target pan is deeper, bake time may be longer. Monitor closely.';
      timeOutput.style.color = 'var(--text-soft)';
    } else {
      timeOutput.textContent = 'Similar area. Bake time should remain roughly the same (monitor depth).';
      timeOutput.style.color = 'var(--text-soft)';
    }

    // Depth warning check: the scaled batter sits at least a quarter deeper, in a deep (2.5 in+) pan.
    const depth2In = (unitToggle && unitToggle.checked) ? depth2 / 2.54 : depth2;
    const isMuchDeeper = depthRatio >= 1.25 && depth2In >= 2.5;

    const depthWarningBox = document.getElementById('depth-warning-box');
    if (depthWarningBox) {
      if (isMuchDeeper) {
        depthWarningBox.style.display = 'grid';
      } else {
        depthWarningBox.style.display = 'none';
      }
    }
  } else {
    multiplierOutput.textContent = '0.00x';
    areaOutput.textContent = `Original: 0.0 ${cuStr} | Target: 0.0 ${cuStr}`;
    timeOutput.textContent = 'Enter valid dimensions to calculate.';
    
    const depthWarningBox = document.getElementById('depth-warning-box');
    if (depthWarningBox) {
      depthWarningBox.style.display = 'none';
    }
  }
}

origShape.addEventListener('change', updateInputs);
targetShape.addEventListener('change', updateInputs);
function setUnitSystem(unit) {
  if (unit !== currentUnit) {
    // Convert the sizes already entered so they still describe the same pans.
    const factor = unit === 'metric' ? 2.54 : 1 / 2.54;
    document.querySelectorAll('#orig-dims input, #target-dims input').forEach(input => {
      const val = lengthOf(input);
      if (!isNaN(val)) {
        input.value = convertLength(val, factor);
        // Keep the unrounded size so toggling back restores the typed value and the result doesn't drift.
        input.dataset.exact = val * factor;
        input.dataset.shown = input.value;
      }
    });
  }
  currentUnit = unit;
  if (unit === 'metric') {
      unitMetricBtn.classList.add('active');
      unitImperialBtn.classList.remove('active');
  } else {
      unitImperialBtn.classList.add('active');
      unitMetricBtn.classList.remove('active');
  }
  const unitStr = (currentUnit === 'metric') ? '(cm)' : '(in)';
  document.querySelectorAll('.input-label').forEach(label => {
    if(label.textContent.includes('(in)') || label.textContent.includes('(cm)')) {
      label.textContent = label.textContent.replace(/\(in\)|\(cm\)/, unitStr);
    }
  });
  calculate();
}

if (unitImperialBtn) unitImperialBtn.addEventListener('click', () => setUnitSystem('imperial'));
if (unitMetricBtn) unitMetricBtn.addEventListener('click', () => setUnitSystem('metric'));

// Share links: ?units=in|cm&from=<shape>&from_l=&from_w=&from_d=&to=<shape>&to_l=&to_w=&to_d=
// (l = diameter, side or length; w = width; d = depth). Only built when "Copy link" is clicked,
// never written to the address bar. The dough tool's ?doughWeight=&unit= hand-off stays unread.
const SHARE_PANS = [['orig', 'from'], ['target', 'to']];
const SHARE_DIMS = [['dim1', 'l'], ['dim2', 'w'], ['depth', 'd']];

// One rule for link sizes, used when copying and when opening: plain numbers above 0 and up to 1000.
function isShareSize(raw) {
  return /^\d+(\.\d+)?$/.test(raw) && Number(raw) > 0 && Number(raw) <= 1000;
}

// Initialize: a shared link's units and shapes, then the default sizes, then its sizes.
const shared = new URLSearchParams(location.search);
if (shared.get('units') === 'cm') setUnitSystem('metric');
SHARE_PANS.forEach(([prefix, name]) => {
  const select = document.getElementById(`${prefix}-shape`);
  if (Array.from(select.options).some(o => o.value === shared.get(name))) select.value = shared.get(name);
});
updateInputs();
SHARE_PANS.forEach(([prefix, name]) => {
  SHARE_DIMS.forEach(([dim, key]) => {
    const input = document.getElementById(`${prefix}-${dim}`);
    const raw = shared.get(`${name}_${key}`);
    // Only plain sizes above 0 and up to 1000 are used; anything else keeps the default.
    if (input && isShareSize(raw)) {
      // Show at most 4 decimals but compute from the full size, as after a unit toggle.
      input.value = +Number(raw).toFixed(4);
      input.dataset.exact = raw;
      input.dataset.shown = input.value;
    }
  });
});
calculate();

const copyBtn = document.getElementById('copy-btn');
if (copyBtn) {
  copyBtn.addEventListener('click', () => {
    const multi = multiplierOutput.textContent;
    const area = areaOutput.textContent;
    const time = timeOutput.textContent;
    const summary = `Recipe Multiplier: ${multi}. Volume Comparison: ${area}. Note: ${time}`;
    
    navigator.clipboard.writeText(summary).then(() => {
      const origText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = origText;
      }, 2000);
    });
  });
}

const copyLinkBtn = document.getElementById('copy-link-btn');
const copyLinkStatus = document.getElementById('copy-link-status');
let copyLinkTimer = null;

// Returns null when a size box holds something a link can't carry, so the link never opens to other numbers.
function shareParams() {
  const params = new URLSearchParams();
  let ok = true;
  params.set('units', currentUnit === 'metric' ? 'cm' : 'in');
  SHARE_PANS.forEach(([prefix, name]) => {
    params.set(name, document.getElementById(`${prefix}-shape`).value);
    SHARE_DIMS.forEach(([dim, key]) => {
      const input = document.getElementById(`${prefix}-${dim}`);
      if (!input) return;
      // The exact size in use (after a unit toggle the box shows it rounded), in full so the link computes the same.
      const val = String(lengthOf(input));
      if (isShareSize(val)) params.set(`${name}_${key}`, val);
      else ok = false;
    });
  });
  return ok ? params.toString() : null;
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
  const params = shareParams();
  if (!params) {
    showCopyLinkStatus('Enter sizes above 0 and up to 1000 to copy a link');
    return;
  }
  const url = location.origin + location.pathname + '?' + params;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => showCopyLinkStatus('Link copied'), () => fallbackCopyLink(url));
  } else {
    fallbackCopyLink(url);
  }
});
