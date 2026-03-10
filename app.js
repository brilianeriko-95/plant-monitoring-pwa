// ===== CONFIGURATION =====
let SCRIPT_URL = localStorage.getItem('gasUrl') || '';
let headers = [];
let currentStep = 0;
let values = {};
let isReview = false;

// ===== SENSOR DEFINITIONS (Hardcoded untuk performa) =====
const SENSOR_DATA = [
  { category: "MPS Inlet", name: "MPS Inlet 30-TP-6101 PI-6114", unit: "kg/cm2" },
  { category: "MPS Inlet", name: "MPS Inlet 30-TP-6101 TI-6153", unit: "°C" },
  { category: "MPS Inlet", name: "MPS Inlet 30-TP-6101 PI-6116", unit: "kg/cm2" },
  { category: "MPS Inlet", name: "MPS Inlet 30-TP-6101 PI-6108", unit: "Kg/cm2" },
  { category: "LPS Extrac", name: "LPS Extrac 30-TP-6101 PI-6123", unit: "kg/cm2" },
  { category: "LPS Extrac", name: "LPS Extrac 30-TP-6101 TI-6155", unit: "°C" },
  { category: "LPS from U-6101", name: "LPS from U-6101 PI-6104", unit: "kg/cm2" },
  { category: "LPS from U-6101", name: "LPS from U-6101 TI-6102", unit: "°C" },
  { category: "U-6102", name: "from U-6102 TI-6104", unit: "°C" },
  { category: "LPS Header", name: "LPS Header PI-6106", unit: "Kg/cm2" },
  { category: "LPS Header", name: "LPS Header TI-6107", unit: "°C" },
  { category: "Exhaust Steam", name: "Exhaust Steam PI-6111", unit: "kg/cm2" },
  { category: "Gland Steam", name: "Gland Steam PI-6118", unit: "Kg/cm2" },
  { category: "Gland Steam", name: "Gland Steam TI-6156", unit: "°C" },
  { category: "Lube Oil TK", name: "Lube Oil 30-TK-6102 LI-6104", unit: "%" },
  { category: "Lube Oil TK", name: "Lube Oil 30-TK-6102 TI-6125", unit: "°C" },
  { category: "Lube Oil", name: "Lube Oil 30-C-6101", unit: "On/Off" },
  { category: "Lube Oil", name: "Lube Oil 30-EH-6102", unit: "On/Off" },
  { category: "Lube Oil Carr", name: "Lube Oil Carrtridge FI-6143", unit: "%" },
  { category: "Lube Oil Carr", name: "Lube Oil Carrtridge PI-6148", unit: "mmH2O" },
  { category: "Lube Oil Carr", name: "Lube Oil Carrtridge PI-6149", unit: "mmH2O" },
  { category: "Lube Oil", name: "Lube Oil PI-6145", unit: "kg/cm2" },
  { category: "Lube Oil", name: "Lube Oil E-6104", unit: "A/B" },
  { category: "Lube Oil", name: "Lube Oil TI-6127", unit: "°C" },
  { category: "Lube Oil", name: "Lube Oil FIL-6101", unit: "A/B" },
  { category: "Lube Oil", name: "Lube Oil PDI-6146", unit: "Kg/cm2" },
  { category: "Lube Oil", name: "Lube Oil PI-6143", unit: "Kg/cm2" },
  { category: "Lube Oil", name: "Lube Oil TI-6144", unit: "°C" },
  { category: "Lube Oil", name: "Lube Oil TI-6146", unit: "°C" },
  { category: "Lube Oil", name: "Lube Oil TI-6145", unit: "°C" },
  { category: "Lube Oil", name: "Lube Oil FG-6144", unit: "%" },
  { category: "Lube Oil", name: "Lube Oil FG-6146", unit: "%" },
  { category: "Lube Oil", name: "Lube Oil TI-6121", unit: "°C" },
  { category: "Lube Oil", name: "Lube Oil TI-6116", unit: "°C" },
  { category: "Lube Oil", name: "Lube Oil FG-6121", unit: "%" },
  { category: "Lube Oil", name: "Lube Oil FG-6116", unit: "%" },
  { category: "Control Oil", name: "Control Oil 30-TK-6103 LI-6106", unit: "%" },
  { category: "Control Oil", name: "Control Oil 30-TK-6103 TI-6128", unit: "°C" },
  { category: "Control Oil", name: "Control Oil P-6106", unit: "A/B" },
  { category: "Control Oil", name: "Control Oil FIL-6103", unit: "A/B" },
  { category: "Control Oil", name: "Control Oil PI-6152", unit: "Bar" }
];

// ===== INITIALIZATION =====
window.onload = function() {
  if (SCRIPT_URL) {
    document.getElementById('settingsCard').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    headers = SENSOR_DATA.map(s => `${s.name} (${s.unit})`);
    renderStep();
  }
};

// ===== CONFIGURATION FUNCTIONS =====
function saveConfig() {
  const url = document.getElementById('scriptUrl').value.trim();
  
  // Validasi ketat
  if (!url) {
    alert('❌ URL tidak boleh kosong!');
    return;
  }
  
  if (!url.includes('script.google.com')) {
    alert('❌ URL harus dari script.google.com!');
    return;
  }
  
  if (!url.endsWith('/exec')) {
    alert('❌ URL harus diakhiri dengan /exec');
    return;
  }
  
  // Simpan dan reload
  localStorage.setItem('gasUrl', url);
  SCRIPT_URL = url;
  location.reload();
}

function resetConfig() {
  if (confirm('Hapus konfigurasi dan masukkan URL baru?')) {
    localStorage.removeItem('gasUrl');
    location.reload();
  }
}

// ===== TEST CONNECTION =====
async function testConnection() {
  const url = document.getElementById('scriptUrl').value.trim();
  
  if (!url || !url.endsWith('/exec')) {
    alert('Masukkan URL yang valid terlebih dahulu!');
    return;
  }

  const loading = document.getElementById('loading');
  loading.classList.add('active');
  loading.querySelector('.loading-text').textContent = 'Testing koneksi...';

  try {
    console.log('Testing URL:', url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 detik timeout
    
    const response = await fetch(url, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      signal: controller.signal,
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        action: 'test'
      })
    });
    
    clearTimeout(timeoutId);
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      throw new Error('HTTP ' + response.status + ' ' + response.statusText);
    }
    
    const text = await response.text();
    console.log('Raw response:', text);
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error('Response bukan JSON valid: ' + text.substring(0, 100));
    }
    
    loading.classList.remove('active');
    
    if (data.success || data.status === 'OK') {
      alert('✅ Koneksi BERHASIL!\n\nPesan: ' + (data.message || 'OK') + '\n\nKlik "Simpan & Mulai" untuk menggunakan URL ini.');
    } else {
      alert('⚠️ Koneksi OK tapi server error:\n' + data.message);
    }
  } catch (err) {
    loading.classList.remove('active');
    console.error('Test error:', err);
    
    let errorMsg = err.message;
    if (err.name === 'AbortError') {
      errorMsg = 'Request timeout (10 detik). Cek URL dan koneksi internet.';
    } else if (err.message.includes('Failed to fetch')) {
      errorMsg = 'Failed to fetch.\n\nPenyebab umum:\n1. URL salah\n2. Belum deploy GAS dengan "Access: Anyone"\n3. CORS belum di-enable di GAS\n4. Network error';
    }
    
    alert('❌ Koneksi GAGAL!\n\nError: ' + errorMsg + '\n\nCek console (F12) untuk detail teknis.');
  }
}

// ===== RENDER FUNCTIONS =====
function renderStep() {
  const container = document.getElementById('stepContainer');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  if (isReview) {
    renderReview(container);
    progressFill.style.width = '100%';
    const filled = Object.values(values).filter(v => v && v !== '').length;
    progressText.textContent = `Review (${filled}/${SENSOR_DATA.length} terisi)`;
    return;
  }

  const sensor = SENSOR_DATA[currentStep];
  const header = headers[currentStep];
  const progress = ((currentStep + 1) / SENSOR_DATA.length) * 100;
  const currentValue = values[header] || '';

  progressFill.style.width = progress + '%';
  progressText.textContent = `Step ${currentStep + 1} dari ${SENSOR_DATA.length}`;

  const isOnOff = sensor.unit === 'On/Off';
  const isAB = sensor.unit === 'A/B';

  let quickButtonsHtml = '';
  if (isOnOff) {
    quickButtonsHtml = `
      <div class="quick-buttons">
        <button class="quick-btn" onclick="setValue('On')">On</button>
        <button class="quick-btn" onclick="setValue('Off')">Off</button>
      </div>
    `;
  } else if (isAB) {
    quickButtonsHtml = `
      <div class="quick-buttons">
        <button class="quick-btn" onclick="setValue('A')">A</button>
        <button class="quick-btn" onclick="setValue('B')">B</button>
      </div>
    `;
  } else {
    quickButtonsHtml = `
      <div class="quick-buttons">
        <button class="quick-btn" onclick="addValue('-')">-</button>
        <button class="quick-btn" onclick="addValue('0')">0</button>
        <button class="quick-btn" onclick="clearValue()">Clear</button>
      </div>
    `;
  }

  container.innerHTML = `
    <div>
      <span class="category-badge">${sensor.category}</span>
      <span class="step-number">${currentStep + 1}</span>
      <div class="sensor-label">${sensor.name}</div>
      <span class="sensor-unit">${sensor.unit}</span>
      
      <div class="input-group">
        <input type="text" 
               class="input-field" 
               id="valueInput" 
               value="${currentValue}"
               placeholder="Masukkan nilai..."
               onkeypress="handleKeyPress(event)"
               autocomplete="off"
               inputmode="decimal">
        ${quickButtonsHtml}
      </div>

      <div class="skip-option">
        <input type="checkbox" id="skipCheck" onchange="toggleSkip(this)" 
               ${!currentValue ? 'checked' : ''}>
        <label for="skipCheck">Lewati parameter ini (kosongkan)</label>
      </div>
    </div>

    <div class="navigation">
      ${currentStep > 0 ? 
        `<button class="btn btn-secondary" onclick="prevStep()">← Kembali</button>` : 
        `<button class="btn btn-secondary" onclick="goToReview()">Review</button>`
      }
      <button class="btn btn-primary" onclick="nextStep()">
        ${currentStep === SENSOR_DATA.length - 1 ? 'Review →' : 'Lanjut →'}
      </button>
    </div>
  `;

  setTimeout(() => {
    const input = document.getElementById('valueInput');
    const skipCheck = document.getElementById('skipCheck');
    if (!currentValue) {
      skipCheck.checked = true;
      input.disabled = true;
      input.style.opacity = '0.5';
    } else {
      input.focus();
      input.select();
    }
  }, 100);
}

function renderReview(container) {
  let html = `
    <div style="flex: 1;">
      <div style="text-align: center; margin-bottom: 20px;">
        <span class="step-number">✓</span>
        <div class="sensor-label">Review Data</div>
        <p style="color: #666; font-size: 0.9rem;">Klik item untuk mengedit</p>
      </div>
      
      <div class="review-list">
  `;

  SENSOR_DATA.forEach((sensor, index) => {
    const header = headers[index];
    const value = values[header];
    const displayValue = value ? `${value} ${sensor.unit}` : '(kosong)';
    const itemClass = value ? '' : 'empty';
    const valueClass = value ? '' : 'empty';

    html += `
      <div class="review-item ${itemClass}" onclick="editStep(${index})">
        <div>
          <div style="font-size: 0.7rem; color: #667eea; font-weight: 600; margin-bottom: 2px;">
            ${sensor.category}
          </div>
          <div class="review-label">${sensor.name}</div>
        </div>
        <div class="review-value ${valueClass}">${displayValue}</div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
    
    <div class="navigation">
      <button class="btn btn-secondary" onclick="backToInput()">← Kembali</button>
      <button class="btn btn-success" onclick="saveData()">💾 Simpan</button>
    </div>
  `;

  container.innerHTML = html;
}

function renderSuccess(timestamp) {
  const container = document.getElementById('stepContainer');
  document.getElementById('progressText').textContent = 'Selesai';

  container.innerHTML = `
    <div class="success-screen">
      <div class="success-icon"></div>
      <div class="success-title">Berhasil Disimpan!</div>
      <div class="success-message">Data telah tersimpan ke Google Sheets</div>
      <div class="timestamp">${timestamp}</div>
      
      <div class="navigation" style="margin-top: 30px;">
        <button class="btn btn-primary" onclick="resetApp()" style="width: 100%;">
          📝 Input Baru
        </button>
      </div>
    </div>
  `;
}

// ===== INPUT ACTIONS =====
function setValue(val) {
  const input = document.getElementById('valueInput');
  const skipCheck = document.getElementById('skipCheck');
  
  input.value = val;
  skipCheck.checked = false;
  input.disabled = false;
  input.style.opacity = '1';
  
  setTimeout(nextStep, 200);
}

function addValue(val) {
  const input = document.getElementById('valueInput');
  const skipCheck = document.getElementById('skipCheck');
  
  if (skipCheck.checked) {
    skipCheck.checked = false;
    input.disabled = false;
    input.style.opacity = '1';
  }
  
  if (val === '0' && input.value === '') {
    input.value = '0';
  } else if (val === '-') {
    input.value = input.value.includes('-') ? input.value.replace('-', '') : '-' + input.value;
  }
  input.focus();
}

function clearValue() {
  const input = document.getElementById('valueInput');
  input.value = '';
  input.focus();
}

function toggleSkip(checkbox) {
  const input = document.getElementById('valueInput');
  if (checkbox.checked) {
    input.value = '';
    input.disabled = true;
    input.style.opacity = '0.5';
  } else {
    input.disabled = false;
    input.style.opacity = '1';
    input.focus();
  }
}

function handleKeyPress(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    nextStep();
  }
}

// ===== NAVIGATION =====
function nextStep() {
  const input = document.getElementById('valueInput');
  const skipCheck = document.getElementById('skipCheck');
  const header = headers[currentStep];
  
  if (!skipCheck.checked) {
    values[header] = input.value.trim();
  } else {
    values[header] = '';
  }

  if (currentStep < SENSOR_DATA.length - 1) {
    currentStep++;
    renderStep();
  } else {
    isReview = true;
    renderStep();
  }
}

function prevStep() {
  if (currentStep > 0) {
    currentStep--;
    renderStep();
  }
}

function editStep(index) {
  isReview = false;
  currentStep = index;
  renderStep();
}

function backToInput() {
  isReview = false;
  currentStep = SENSOR_DATA.length - 1;
  renderStep();
}

function goToReview() {
  isReview = true;
  renderStep();
}

function resetApp() {
  currentStep = 0;
  values = {};
  isReview = false;
  renderStep();
  document.getElementById('progressFill').style.width = '5%';
}

// ===== SAVE DATA =====
async function saveData() {
  const loading = document.getElementById('loading');
  loading.classList.add('active');
  loading.querySelector('.loading-text').textContent = 'Menyimpan data...';

  try {
    // Validasi
    if (!SCRIPT_URL) {
      throw new Error('URL Google Apps Script belum dikonfigurasi!');
    }

    console.log('Saving to:', SCRIPT_URL);
    console.log('Data payload:', JSON.stringify({action: 'save', values: values}));

    // Prepare data - pastikan semua header ada
    const payload = {};
    headers.forEach(h => {
      payload[h] = values[h] || '';
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 detik timeout

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      signal: controller.signal,
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        action: 'save',
        values: payload
      })
    });
    
    clearTimeout(timeoutId);
    
    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
      throw new Error('HTTP ' + response.status + ': ' + response.statusText);
    }
    
    const text = await response.text();
    console.log('Raw response:', text);
    
    if (!text) {
      throw new Error('Response kosong dari server');
    }
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.error('JSON parse error:', e);
      throw new Error('Response tidak valid JSON: ' + text.substring(0, 200));
    }
    
    loading.classList.remove('active');
    
    if (data.success) {
      renderSuccess(data.timestamp || new Date().toLocaleString('id-ID'));
    } else {
      alert('❌ Server error: ' + (data.message || 'Unknown error'));
    }
    
  } catch (err) {
    loading.classList.remove('active');
    console.error('Save error:', err);
    
    let errorMsg = err.message;
    let solution = '';
    
    if (err.name === 'AbortError') {
      errorMsg = 'Request timeout (30 detik). Server terlalu lambat atau tidak merespons.';
      solution = 'Coba lagi atau cek status server GAS.';
    } else if (err.message.includes('Failed to fetch')) {
      errorMsg = 'Failed to fetch - Tidak bisa terhubung ke server.';
      solution = 'Penyebab umum:\n1. URL salah atau tidak aktif\n2. CORS belum di-enable di GAS (tambahkan doOptions)\n3. Deploy GAS belum di-set "Access: Anyone"\n4. Network/firewall blocking';
    } else if (err.message.includes('NetworkError')) {
      errorMsg = 'Network Error - Periksa koneksi internet.';
      solution = 'Pastikan device terhubung ke internet.';
    }
    
    alert('❌ Error Menyimpan Data!\n\n' + errorMsg + '\n\nSolusi:\n' + solution + '\n\nDetail teknis ada di Console (F12).');
  }
}

// ===== DEBUG UTILITIES =====
function debugShowConfig() {
  console.log('Current config:', {
    SCRIPT_URL: SCRIPT_URL,
    localStorage: localStorage.getItem('gasUrl'),
    values: values,
    currentStep: currentStep
  });
}

function debugClearData() {
  if (confirm('Hapus semua data input?')) {
    values = {};
    currentStep = 0;
    isReview = false;
    renderStep();
    console.log('Data cleared');
  }
}

// Expose debug functions globally
window.debugShowConfig = debugShowConfig;
window.debugClearData = debugClearData;
