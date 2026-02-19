document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadIncidents();
    setupListeners();
});

function setupListeners() {
    document.getElementById('open-options').addEventListener('click', () => {
        if (chrome.runtime.openOptionsPage) {
            chrome.runtime.openOptionsPage();
        } else {
            window.open(chrome.runtime.getURL('options.html'));
        }
    });
}

function loadStats() {
    chrome.storage.local.get('stats', (data) => {
        const stats = data.stats || { blocks: 0, avgRisk: 0 };

        document.getElementById('blocks-count').textContent = stats.blocks || 0;
        document.getElementById('risk-score').textContent = (stats.avgRisk || 0).toFixed(1);
    });
}

function loadIncidents() {
    chrome.storage.local.get('incidents', (data) => {
        const incidents = data.incidents || [];
        const listContainer = document.getElementById('incident-list');

        if (incidents.length === 0) {
            listContainer.innerHTML = '<div class="empty-state">No incidents recorded yet.</div>';
            return;
        }

        listContainer.innerHTML = '';
        // Show last 5
        incidents.slice(0, 5).forEach(incident => {
            const el = document.createElement('div');
            el.className = 'incident-item';
            const date = new Date(incident.timestamp);
            const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            let label = 'Security Event';
            if (incident.type === 'prompt_injection') label = 'Prompt Injection';
            if (incident.type === 'sensitive_paste') label = 'Sensitive Paste'; // if we logged this

            el.innerHTML = `
                <div class="incident-info">
                   ${label}
                   <div style="font-size: 10px; color: #6B7280; margin-top: 2px;">Score: ${(incident.score * 10).toFixed(1)}</div>
                </div>
                <div class="incident-time">${timeStr}</div>
            `;
            listContainer.appendChild(el);
        });
    });
}
