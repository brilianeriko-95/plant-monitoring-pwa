const CONFIG = {
    GAS_URL: 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec',
    AREAS_TURBINE: {
        "Steam Inlet Turbine": ["MPS Inlet 30-TP-6101 PI-6114 (kg/cm2)", "MPS Inlet 30-TP-6101 TI-6153 (°C)"],
        "Low Pressure Steam": ["LPS from U-6101 PI-6104 (kg/cm2)", "LPS from U-6101 TI-6102 (°C)"],
        "Lube Oil": ["Lube Oil 30-TK-6102 LI-6104 (%)", "Lube Oil 30-TK-6102 TI-6125 (°C)"],
        "Control Oil": ["Control Oil 30-TK-6103 LI-6106 (%)", "Control Oil 30-TK-6103 TI-6128 (°C)"]
    },
    AREAS_CT: {
        "BASIN SA": ["D-6511 LEVEL BASIN", "D-6511 BLOWDOWN", "D-6511 PH BASIN"],
        "BASIN SU": ["D-6521 LEVEL BASIN", "D-6521 BLOWDOWN", "D-6521 PH BASIN"],
        "LH & TH": ["LH C-6701 A", "LH C-6701 B"],
        "COMPRESSOR": ["C-6701 A STATUS", "C-6701 A PRESSURE"]
    },
    AREAS_OLI: {
        "OLI GEARBOX SA": ["MT-6511 A", "MT-6511 B", "MT-6511 C"],
        "OLI GEARBOX SU": ["MT-6521 B", "MT-6521 C", "MT-6521 D"]
    }
};

const state = {
    currentUser: null,
    currentMode: null,
    currentArea: null,
    currentIndex: 0,
    values: {},
    selectedShift: null,
    pendingParam: null,
    pendingValue: null
};

const app = {
    init: () => {
        const savedUser = localStorage.getItem('username');
        if (savedUser) {
            state.currentUser = savedUser;
            document.getElementById('user-display').textContent = savedUser;
            app.showScreen('menu');
        } else {
            app.showScreen('login');
        }
    },

    showScreen: (screenId) => {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
    },

    login: () => {
        const username = document.getElementById('username').value.trim();
        if (username) {
            state.currentUser = username;
            localStorage.setItem('username', username);
            document.getElementById('user-display').textContent = username;
            app.showScreen('menu');
            app.showToast(`Selamat datang, ${username}!`);
        }
    },

    logout: () => {
        localStorage.removeItem('username');
        state.currentUser = null;
        app.showScreen('login');
    },

    showMenu: () => app.showScreen('menu'),
    
    showLogsheet: (mode) => {
        state.currentMode = mode;
        state.values = {};
        const areas = mode === 'CT' ? CONFIG.AREAS_CT : 
                     mode === 'OLI' ? CONFIG.AREAS_OLI : CONFIG.AREAS_TURBINE;
        
        document.getElementById('area-title').textContent = `Pilih Area ${mode}`;
        const container = document.getElementById('area-list');
        container.innerHTML = '';
        
        Object.keys(areas).forEach(area => {
            const btn = document.createElement('button');
            btn.className = 'area-btn';
            btn.textContent = area;
            btn.onclick = () => app.selectArea(area);
            container.appendChild(btn);
        });
        
        app.showScreen('area-select');
    },

    selectArea: (area) => {
        state.currentArea = area;
        state.currentIndex = 0;
        const areas = state.currentMode === 'CT' ? CONFIG.AREAS_CT : 
                     state.currentMode === 'OLI' ? CONFIG.AREAS_OLI : CONFIG.AREAS_TURBINE;
        app.showParamInput(areas[area]);
    },

    showParamInput: (params) => {
        if (state.currentIndex >= params.length) {
            app.saveLogsheet();
            return;
        }

        const param = params[state.currentIndex];
        document.getElementById('input-area').textContent = state.currentArea;
        document.getElementById('param-name').textContent = param;
        document.getElementById('progress').textContent = `${state.currentIndex + 1}/${params.length}`;
        document.getElementById('param-input').value = '';
        
        const quickBtns = document.getElementById('quick-buttons');
        if (param.includes('ON/OFF') || param.includes('STATUS')) {
            quickBtns.style.display = 'flex';
        } else {
            quickBtns.style.display = 'none';
        }

        const prevVal = localStorage.getItem(`prev_${param}`) || '-';
        document.getElementById('prev-value').textContent = prevVal;
        document.getElementById('btn-prev').style.display = prevVal !== '-' ? 'block' : 'none';
        document.getElementById('prev-value-box').style.display = prevVal !== '-' ? 'flex' : 'none';

        app.showScreen('input');
    },

    setValue: (val) => {
        document.getElementById('param-input').value = val;
    },

    usePrevious: () => {
        const prevText = document.getElementById('prev-value').textContent;
        document.getElementById('param-input').value = prevText;
    },

    nextParam: () => {
        const val = document.getElementById('param-input').value.trim();
        if (!val) {
            app.showToast('Mohon isi nilai');
            return;
        }

        const areas = state.currentMode === 'CT' ? CONFIG.AREAS_CT : 
                     state.currentMode === 'OLI' ? CONFIG.AREAS_OLI : CONFIG.AREAS_TURBINE;
        const param = areas[state.currentArea][state.currentIndex];
        
        const abnormal = ['RUSAK', 'BROKEN', 'MATI', 'ERROR', 'LEAK'];
        if (abnormal.some(k => val.toUpperCase().includes(k))) {
            state.pendingParam = param;
            state.pendingValue = val;
            app.showScreen('anomali-photo');
            app.initCamera();
            return;
        }

        state.values[param] = val;
        localStorage.setItem(`prev_${param}`, val);
        state.currentIndex++;
        app.showParamInput(areas[state.currentArea]);
    },

    skipParam: () => {
        const areas = state.currentMode === 'CT' ? CONFIG.AREAS_CT : 
                     state.currentMode === 'OLI' ? CONFIG.AREAS_OLI : CONFIG.AREAS_TURBINE;
        state.currentIndex++;
        app.showParamInput(areas[state.currentArea]);
    },

    backToArea: () => {
        app.showLogsheet(state.currentMode);
    },

    initCamera: async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            document.getElementById('camera').srcObject = stream;
            window.currentStream = stream;
            document.getElementById('camera').style.display = 'block';
            document.getElementById('photo-preview').style.display = 'none';
            document.getElementById('btn-capture').style.display = 'block';
            document.getElementById('btn-retake').style.display = 'none';
            document.getElementById('btn-confirm').style.display = 'none';
        } catch (err) {
            app.showToast('Kamera tidak tersedia');
        }
    },

    takePhoto: () => {
        const video = document.getElementById('camera');
        const canvas = document.getElementById('canvas');
        const preview = document.getElementById('photo-preview');
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        
        preview.src = canvas.toDataURL('image/jpeg');
        preview.style.display = 'block';
        video.style.display = 'none';
        
        document.getElementById('btn-capture').style.display = 'none';
        document.getElementById('btn-retake').style.display = 'block';
        document.getElementById('btn-confirm').style.display = 'block';
        
        if (window.currentStream) {
            window.currentStream.getTracks().forEach(track => track.stop());
        }
    },

    retake: () => {
        app.initCamera();
    },

    skipPhoto: () => {
        app.saveAnomali(null);
    },

    confirmAnomali: () => {
        const canvas = document.getElementById('canvas');
        const photoData = canvas.toDataURL('image/jpeg');
        app.saveAnomali(photoData);
    },

    cancelAnomali: () => {
        const areas = state.currentMode === 'CT' ? CONFIG.AREAS_CT : 
                     state.currentMode === 'OLI' ? CONFIG.AREAS_OLI : CONFIG.AREAS_TURBINE;
        app.showParamInput(areas[state.currentArea]);
    },

    saveAnomali: async (photoData) => {
        const ket = document.getElementById('anomali-ket').value;
        const areas = state.currentMode === 'CT' ? CONFIG.AREAS_CT : 
                     state.currentMode === 'OLI' ? CONFIG.AREAS_OLI : CONFIG.AREAS_TURBINE;
        
        state.values[state.pendingParam] = state.pendingValue;
        state.currentIndex++;
        
        app.showToast('Temuan tersimpan!');
        document.getElementById('anomali-ket').value = '';
        app.showParamInput(areas[state.currentArea]);
    },

    saveLogsheet: async () => {
        app.showToast('Logsheet berhasil disimpan!');
        app.showMenu();
    },

    showLaporan: () => {
        app.showScreen('laporan');
        document.querySelectorAll('.shift-btn').forEach(btn => btn.classList.remove('active'));
        state.selectedShift = null;
    },

    selectShift: (shift) => {
        state.selectedShift = shift;
        document.querySelectorAll('.shift-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.shift === shift);
        });
    },

    saveLaporan: () => {
        const area = document.getElementById('laporan-area').value;
        const text = document.getElementById('laporan-text').value;
        
        if (!state.selectedShift || !text) {
            app.showToast('Lengkapi data laporan');
            return;
        }

        app.showToast('Laporan tersimpan!');
        document.getElementById('laporan-text').value = '';
    },

    showDashboard: () => {
        app.showScreen('dashboard');
        document.getElementById('dash-open').textContent = '2';
        document.getElementById('dash-progress').textContent = '3';
        document.getElementById('dash-closed').textContent = '15';
        
        const container = document.getElementById('ticket-list');
        container.innerHTML = `
            <div class="ticket-item open">
                <div class="ticket-header-row">
                    <span class="ticket-id">BOT-001</span>
                    <span class="ticket-status status-open">OPEN</span>
                </div>
                <div class="ticket-desc">MPS Inlet 30-TP-6101 PI-6114: ERROR</div>
                <div class="ticket-meta">👤 Operator A - 11/03 08:30</div>
            </div>
            <div class="ticket-item progress">
                <div class="ticket-header-row">
                    <span class="ticket-id">BOT-002</span>
                    <span class="ticket-status status-progress">PROGRESS</span>
                </div>
                <div class="ticket-desc">Lube Oil 30-TK-6102 LI-6104: RUSAK</div>
                <div class="ticket-meta">👤 Operator B - 11/03 09:15</div>
            </div>
        `;
    },

    refreshDashboard: () => {
        app.showToast('Data diperbarui!');
    },

    showAnomali: () => {
        state.pendingParam = 'Manual Input';
        state.pendingValue = 'Unsafe Condition';
        app.showScreen('anomali-photo');
        app.initCamera();
    },

    showListAnomali: () => {
        app.showScreen('list-anomali');
        document.getElementById('anomali-container').innerHTML = `
            <div class="ticket-item open">
                <div class="ticket-header-row">
                    <span class="ticket-id">BOT-001</span>
                    <span class="ticket-status status-open">OPEN</span>
                </div>
                <div class="ticket-desc">MPS Inlet 30-TP-6101 PI-6114: ERROR</div>
                <div class="ticket-meta">👤 Operator A - 11/03 08:30</div>
            </div>
        `;
    },

    showRekapData: (mode) => {
        document.getElementById('rekap-title').textContent = `Rekap ${mode}`;
        document.getElementById('rekap-content').textContent = `Data rekap ${mode} akan ditampilkan di sini...`;
        app.showScreen('rekap-view');
    },

    showToast: (message) => {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }
};

document.addEventListener('DOMContentLoaded', app.init);
