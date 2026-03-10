// ===== CONFIGURATION =====
let SCRIPT_URL = localStorage.getItem('gasUrl') || '';

// ===== DATA STRUCTURE =====
const AREAS_TURBINE = {
  "Steam Inlet Turbine": [
    "MPS Inlet 30-TP-6101 PI-6114 (kg/cm2)",
    "MPS Inlet 30-TP-6101 TI-6153 (°C)",
    "MPS Inlet 30-TP-6101 PI-6116 (kg/cm2)",
    "LPS Extrac 30-TP-6101 PI-6123 (kg/cm2)",
    "Gland Steam TI-6156 (°C)",
    "MPS Inlet 30-TP-6101 PI-6108 (Kg/cm2)",
    "Exhaust Steam PI-6111 (kg/cm2)",
    "Gland Steam PI-6118 (Kg/cm2)"
  ],
  "Low Pressure Steam": [
    "LPS from U-6101 PI-6104 (kg/cm2)",
    "LPS from U-6101 TI-6102 (°C)",
    "LPS Header PI-6106 (Kg/cm2)",
    "LPS Header TI-6107 (°C)"
  ],
  "Lube Oil System": [
    "Lube Oil 30-TK-6102 LI-6104 (%)",
    "Lube Oil 30-TK-6102 TI-6125 (°C)",
    "Lube Oil 30-C-6101 (On/Off)",
    "Lube Oil 30-EH-6102 (On/Off)",
    "Lube Oil Carrtridge FI-6143 (%)",
    "Lube Oil Carrtridge PI-6148 (mmH2O)",
    "Lube Oil Carrtridge PI-6149 (mmH2O)",
    "Lube Oil PI-6145 (kg/cm2)",
    "Lube Oil E-6104 (A/B)",
    "Lube Oil TI-6127 (°C)",
    "Lube Oil FIL-6101 (A/B)",
    "Lube Oil PDI-6146 (Kg/cm2)",
    "Lube Oil PI-6143 (Kg/cm2)",
    "Lube Oil TI-6144 (°C)",
    "Lube Oil TI-6146 (°C)",
    "Lube Oil TI-6145 (°C)",
    "Lube Oil FG-6144 (%)",
    "Lube Oil FG-6146 (%)",
    "Lube Oil TI-6121 (°C)",
    "Lube Oil TI-6116 (°C)",
    "Lube Oil FG-6121 (%)",
    "Lube Oil FG-6116 (%)"
  ],
  "Control Oil System": [
    "Control Oil 30-TK-6103 LI-6106 (%)",
    "Control Oil 30-TK-6103 TI-6128 (°C)",
    "Control Oil P-6106 (A/B)",
    "Control Oil FIL-6103 (A/B)",
    "Control Oil PI-6152 (Bar)"
  ]
};

// ===== INITIALIZATION =====
window.onload = function() {
  if (SCRIPT_URL) {
    showForm();
  }
};

function saveConfig() {
  const url = document.getElementById('scriptUrl').value.trim();
  
  if (!url || !url.includes('script.google.com')) {
    alert('Masukkan URL Google Apps Script yang valid!');
    return;
  }
  
  localStorage.setItem('gasUrl', url);
  SCRIPT_URL = url;
  showForm();
}

function resetConfig() {
  localStorage.removeItem('gasUrl');
  location.reload();
}

function showForm() {
  document.getElementById('settingsCard').classList.add('hidden');
  document.getElementById('pwa-form').classList.remove('hidden');
  generateForm();
}

// ===== GENERATE FORM =====
function generateForm() {
  const container = document.getElementById('form-fields');
  container.innerHTML = '';

  for (const [section, fields] of Object.entries(AREAS_TURBINE)) {
    const sectionDiv = document.createElement('div');
    sectionDiv.className = 'section-card';
    
    let html = `<h3>${section}</h3>`;
    
    fields.forEach(field => {
      // Extract unit from field name
      const unitMatch = field.match(/\(([^)]+)\)$/);
      const unit = unitMatch ? unitMatch[1] : '';
      const label = field.replace(/\s*\([^)]*\)$/, '');
      
      html += `
        <div class="input-group">
          <label>${label} <span style="color: #667eea; font-size: 0.8rem;">(${unit})</span></label>
          <input type="text" 
                 name="${field}" 
                 placeholder="Masukkan nilai..."
                 autocomplete="off">
        </div>
      `;
    });
    
    sectionDiv.innerHTML = html;
    container.appendChild(sectionDiv);
  }
}

// ===== SUBMIT HANDLER =====
document.getElementById('pwa-form').addEventListener('submit', function(e) {
  e.preventDefault();
  
  const btn = document.getElementById('btnSubmit');
  const loading = document.getElementById('loading');
  
  btn.disabled = true;
  btn.innerText = 'Mengirim...';
  loading.classList.add('active');

  // Collect form data
  const formData = new FormData(this);
  const data = {};
  
  // Add timestamp
  data["Timestamp"] = new Date().toISOString();
  
  // Add all form fields
  formData.forEach((value, key) => {
    data[key] = value;
  });

  console.log('Sending data:', data);

  // Send to GAS
  fetch(SCRIPT_URL, {
    method: 'POST',
    mode: 'no-cors', // ⭐ Penting: Bypass CORS
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
  .then(() => {
    // Mode no-cors tidak return response, tapi request sukses
    loading.classList.remove('active');
    alert('✅ Data berhasil dikirim ke Spreadsheet!');
    document.getElementById('pwa-form').reset();
  })
  .catch(error => {
    loading.classList.remove('active');
    console.error('Error:', error);
    alert('❌ Error: ' + error.message);
  })
  .finally(() => {
    btn.disabled = false;
    btn.innerText = '💾 Kirim ke Spreadsheet';
  });
});
