// Replace with your Google Apps Script Web App URL
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzGjtviBwaN_nNRKQlKWY-GIlAsouIC8h2EZbmzMQDiY5S6MviWycyR7AOVKt6fN26fqg/exec"; 

async function gasCall(action, data = {}) {
    const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: action, data: data }),
        headers: { 'Content-Type': 'text/plain;charset=utf-8' } // 'text/plain' handles CORS cleanly
    });
    return await response.json();
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = e => resolve({ name: file.name, type: file.type, data: e.target.result });
        reader.onerror = error => reject(error);
        reader.readAsDataURL(file);
    });
}

window.app = {
    switchPortal: function(mode) {
        document.getElementById('view-register').classList.toggle('hidden-view', mode !== 'register');
        document.body.style.overflow = mode === 'register' ? 'hidden' : 'auto';
    },

    promptAdmin: function() {
        // Passcode removed as per user correction request for mobile ease of access
        document.getElementById('view-admin').classList.remove('hidden-view');
        this.loadDashboard();
    },

    toggleAdminView: function(view) {
        document.getElementById('admin-dashboard-panel').classList.toggle('hidden-view', view === 'list');
        // document.getElementById('admin-list-panel').classList.toggle('hidden-view', view !== 'list');
        if (view === 'list') this.loadFullList(); else this.loadDashboard();
    },

    handleBatchLogic: function() {
        const batch = document.getElementById('reg-batch').value;
        const streamContainer = document.getElementById('stream-container');
        const streamInput = document.getElementById('reg-stream');
        
        // Add Stream conditional dropdown for AL 2025
        if (batch === 'AL 2025') {
            streamContainer.classList.remove('hidden');
            streamInput.setAttribute('required', 'true');
        } else {
            streamContainer.classList.add('hidden');
            streamInput.removeAttribute('required');
            streamInput.value = "";
        }
    },

    handleParticipationLogic: function() {
        const val = document.getElementById('reg-participation').value;
        const uploadCont = document.getElementById('pageant-upload-container');
        const fileInput = document.getElementById('reg-pageant-file');
        
        if (val.includes('Yes')) {
            uploadCont.classList.remove('hidden');
            fileInput.setAttribute('required', 'true');
        } else {
            uploadCont.classList.add('hidden');
            fileInput.removeAttribute('required');
        }
    },

    submitRegistration: async function() {
        const btn = document.getElementById('reg-submit-btn');
        const msgBox = document.getElementById('reg-msg');
        const origText = btn.innerHTML;

        const showMsg = (text, type) => {
            msgBox.className = `p-3 rounded text-sm mb-4 ${type === 'error' ? 'bg-red-900/60 text-red-200 border border-red-700' : 'bg-green-900/60 text-green-200 border border-green-700'}`;
            msgBox.innerHTML = text;
            msgBox.classList.remove('hidden');
        };

        const formData = {
            name: document.getElementById('reg-name').value.trim(),
            nic: document.getElementById('reg-nic').value.trim(),
            email: document.getElementById('reg-email').value.trim(),
            gender: document.getElementById('reg-gender').value,
            whatsapp: document.getElementById('reg-whatsapp').value.trim(),
            batch: document.getElementById('reg-batch').value,
            stream: document.getElementById('reg-stream') ? document.getElementById('reg-stream').value : '',
            ticketType: document.getElementById('reg-ticket').value,
            participation: document.getElementById('reg-participation').value,
        };

        const paymentFile = document.getElementById('reg-payment-file').files[0];
        const pageantFile = document.getElementById('reg-pageant-file').files[0];

        try {
            btn.disabled = true;
            
            // Upload Payment File
            btn.innerHTML = 'Uploading Payment...';
            const payB64 = await fileToBase64(paymentFile);
            const payRes = await gasCall('upload', { ...payB64, folderType: 'payment' });
            if (!payRes.success) throw new Error(payRes.message);
            formData.fileLink = payRes.fileLink;

            // Conditional Pageant Upload
            if (pageantFile && formData.participation.includes('Yes')) {
                btn.innerHTML = 'Uploading Photo...';
                const pagB64 = await fileToBase64(pageantFile);
                const pagRes = await gasCall('upload', { ...pagB64, folderType: 'pageant' });
                if (!pagRes.success) throw new Error(pagRes.message);
                formData.pageantFileLink = pagRes.fileLink;
            }

            // Submit Registration
            btn.innerHTML = 'Registering...';
            const regRes = await gasCall('register', formData);
            
            if (regRes.success) {
                document.getElementById('view-register').classList.add('hidden-view');
                document.getElementById('view-ticket').classList.remove('hidden-view');
                document.getElementById('ticket-attendee-name').textContent = regRes.name;
                document.getElementById('ticket-reference').textContent = regRes.uuid; // Showing Reference Number instead of QR
            } else {
                showMsg(regRes.message, 'error');
            }
        } catch (err) {
            showMsg('Error: ' + err.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = origText;
        }
    },

    handleManualCheckIn: async function() {
        const uuid = document.getElementById('manual-checkin-id').value.trim();
        const msgBox = document.getElementById('checkin-status-msg');
        
        if (!uuid) return;
        
        msgBox.className = "mt-4 p-4 rounded-lg border text-center font-medium bg-slate-800 text-slate-300";
        msgBox.textContent = "Verifying...";
        
        const res = await gasCall('checkIn', { uuid });
        
        msgBox.className = `mt-4 p-4 rounded-lg border text-center font-medium animate-fade-in ${res.success ? 'bg-green-900/50 border-green-500 text-green-200' : 'bg-red-900/50 border-red-500 text-red-200'}`;
        msgBox.innerHTML = `<strong>${res.message}</strong><br><span class="text-xs">${res.details}</span>`;
        
        if(res.success) this.loadDashboard();
        document.getElementById('manual-checkin-id').value = '';
    },

    loadDashboard: async function() {
        const data = await gasCall('getStats');
        // Handle rendering logic similarly as before
    }
};

document.getElementById('registration-form').addEventListener('submit', e => {
    e.preventDefault();
    window.app.submitRegistration();
});
