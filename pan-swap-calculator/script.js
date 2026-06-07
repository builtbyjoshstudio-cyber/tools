// Theme (Light / Mist / Dark) is handled globally by ../kinetic.js

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

function getInputsHtml(shape, prefix) {
  const unitStr = unitToggle && unitToggle.checked ? '(cm)' : '(in)';
  if (shape === 'muffin' || shape === 'bundt') {
    return '';
  } else if (shape === 'round') {
    return `
      <div class="input-group">
        <span class="input-label">Diameter ${unitStr}</span>
        <input type="number" id="${prefix}-dim1" class="form-input" value="8" min="1" step="0.5">
      </div>`;
  } else if (shape === 'square') {
    return `
      <div class="input-group">
        <span class="input-label">Side ${unitStr}</span>
        <input type="number" id="${prefix}-dim1" class="form-input" value="8" min="1" step="0.5">
      </div>`;
  } else if (shape === 'rectangular') {
    return `
      <div class="input-group">
        <span class="input-label">Length ${unitStr}</span>
        <input type="number" id="${prefix}-dim1" class="form-input" value="13" min="1" step="0.5">
      </div>
      <div class="input-group">
        <span class="input-label">Width ${unitStr}</span>
        <input type="number" id="${prefix}-dim2" class="form-input" value="9" min="1" step="0.5">
      </div>`;
  }
}

function updateInputs() {
  origDims.innerHTML = getInputsHtml(origShape.value, 'orig');
  targetDims.innerHTML = getInputsHtml(targetShape.value, 'target');
  
  // Attach listeners to new inputs
  document.querySelectorAll('#orig-dims input, #target-dims input').forEach(input => {
    input.addEventListener('input', calculate);
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
  const dim1 = dim1El ? parseFloat(dim1El.value) || 0 : 0;
  
  if (shape === 'round') {
    const radius = dim1 / 2;
    return Math.PI * radius * radius;
  } else if (shape === 'square') {
    return dim1 * dim1;
  } else if (shape === 'rectangular') {
    const dim2El = document.getElementById(`${prefix}-dim2`);
    const dim2 = dim2El ? parseFloat(dim2El.value) || 0 : 0;
    return dim1 * dim2;
  }
  return 0;
}

function getDim(prefix, index) {
  const el = document.getElementById(`${prefix}-dim${index}`);
  let val = el ? parseFloat(el.value) || 0 : 0;
  if (unitToggle && unitToggle.checked) {
    val = val / 2.54;
  }
  return val;
}

function calculate() {
  const area1 = getArea(origShape.value, 'orig');
  const area2 = getArea(targetShape.value, 'target');
  const sqStr = unitToggle && unitToggle.checked ? 'sq cm' : 'sq in';

  if (area1 > 0 && area2 > 0) {
    const multiplier = area2 / area1;
    // format to 2 decimal places
    multiplierOutput.textContent = (Math.round(multiplier * 100) / 100).toFixed(2) + 'x';
    areaOutput.textContent = `Original: ${Math.round(area1 * 10) / 10} ${sqStr} | Target: ${Math.round(area2 * 10) / 10} ${sqStr}`;
    
    // Warning logic
    if (multiplier > 1.1) {
      timeOutput.textContent = 'If the target pan is shallower, bake time may be shorter. Check early!';
      timeOutput.style.color = 'var(--text-soft)';
    } else if (multiplier < 0.9) {
      timeOutput.textContent = 'If the target pan is deeper, bake time may be longer. Monitor closely.';
      timeOutput.style.color = 'var(--text-soft)';
    } else {
      timeOutput.textContent = 'Similar area. Bake time should remain roughly the same (monitor depth).';
      timeOutput.style.color = 'var(--text-soft)';
    }

    // Depth warning check
    const isOrigWide = (
        (origShape.value === 'rectangular' && (area1 / (unitToggle && unitToggle.checked ? 6.4516 : 1)) >= 63) ||
        (origShape.value === 'square' && getDim('orig', 1) >= 7.9) ||
        (origShape.value === 'round' && getDim('orig', 1) >= 8.9)
    );
    
    const isTargetDeepNarrow = (
        (targetShape.value === 'rectangular' && getDim('target', 1) > 0 && getDim('target', 2) > 0 && getDim('target', 2) <= 5.5) ||
        (targetShape.value === 'round' && getDim('target', 1) > 0 && getDim('target', 1) <= 8)
    );

    const depthWarningBox = document.getElementById('depth-warning-box');
    if (depthWarningBox) {
      if (isOrigWide && isTargetDeepNarrow) {
        depthWarningBox.style.display = 'grid';
      } else {
        depthWarningBox.style.display = 'none';
      }
    }
  } else {
    multiplierOutput.textContent = '0.00x';
    areaOutput.textContent = `Original: 0.0 ${sqStr} | Target: 0.0 ${sqStr}`;
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

// Initialize
updateInputs();

const copyBtn = document.getElementById('copy-btn');
if (copyBtn) {
  copyBtn.addEventListener('click', () => {
    const multi = multiplierOutput.textContent;
    const area = areaOutput.textContent;
    const time = timeOutput.textContent;
    const summary = `Recipe Multiplier: ${multi}. Area Comparison: ${area}. Note: ${time}`;
    
    navigator.clipboard.writeText(summary).then(() => {
      const origText = copyBtn.textContent;
      copyBtn.textContent = 'Copied!';
      setTimeout(() => {
        copyBtn.textContent = origText;
      }, 2000);
    });
  });
}
