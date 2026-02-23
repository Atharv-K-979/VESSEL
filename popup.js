document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadActivity();
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

    document.getElementById('open-dashboard').addEventListener('click', () => {
        window.open(chrome.runtime.getURL('dashboard.html'));
    });
}

function loadStats() {
    chrome.storage.local.get(['stats', 'threatsBlocked', 'specsAnalyzed', 'redactionsCount'], (data) => {
        const blocks = data.stats?.blocks || data.threatsBlocked || 0;
        const specs = data.stats?.specs || data.specsAnalyzed || 0;
        const redactions = data.stats?.redactions || data.redactionsCount || 0;

        animateValue('threats-blocked', 0, blocks, 1000);
        animateValue('specs-analyzed', 0, specs, 1000);
        animateValue('redactions-count', 0, redactions, 1000);
    });
}

function loadActivity() {
    chrome.storage.local.get('incidents', (data) => {
        const activities = data.incidents || [];
        const list = document.getElementById('activity-list');
        list.innerHTML = '';

        if (activities.length === 0) {
            list.innerHTML = '<div class="empty-state">No recent activity</div>';
            return;
        }

        activities.slice(0, 5).forEach(act => {
            const item = document.createElement('div');
            item.className = 'activity-item';

            let icon = '🛡️';
            if (act.type === 'redaction') icon = '📝';
            if (act.type === 'spec' || act.type === 'prompt_injection') icon = '📋';

            const title = act.title || act.details || "Security Event";

            item.innerHTML = `
                <div class="activity-icon">${icon}</div>
                <div class="activity-details">
                    <div class="activity-title">${title}</div>
                    <div class="activity-meta">${new Date(act.timestamp).toLocaleTimeString()}</div>
                </div>
            `;
            list.appendChild(item);
        });
    });
}

function animateValue(id, start, end, duration) {
    if (start === end) return;
    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    const obj = document.getElementById(id);

    if (range > 100) {
        obj.textContent = end;
        return;
    }

    const timer = setInterval(function () {
        current += increment;
        obj.textContent = current;
        if (current == end) {
            clearInterval(timer);
        }
    }, stepTime);
}
