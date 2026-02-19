import { patterns } from './lib/patterns.js';
const DEFAULTS = {
    features: {
        aiDefense: true,
        specAssist: true,
        pasteRedact: true
    },
    thresholds: {
        aiInjection: 0.7
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    await restoreOptions();
    renderPatterns();
    setupListeners();
});

async function restoreOptions() {
    chrome.storage.local.get(['settings'], (result) => {
        const settings = result.settings || DEFAULTS;

        // Toggles
        document.getElementById('feature-ai-defense').checked = settings.features.aiDefense;
        document.getElementById('feature-spec-assist').checked = settings.features.specAssist;
        document.getElementById('feature-paste-redact').checked = settings.features.pasteRedact;

        // Thresholds
        const aiThreshold = settings.thresholds.aiInjection;
        document.getElementById('threshold-ai').value = aiThreshold;
        document.getElementById('threshold-ai-val').textContent = aiThreshold;
    });
}

function setupListeners() {
    // Auto-save on any change
    const inputs = document.querySelectorAll('input');
    inputs.forEach(input => {
        input.addEventListener('change', (e) => {
            saveOptions();
        });
    });

    document.getElementById('threshold-ai').addEventListener('input', (e) => {
        document.getElementById('threshold-ai-val').textContent = e.target.value;
    });
}

function saveOptions() {
    const settings = {
        features: {
            aiDefense: document.getElementById('feature-ai-defense').checked,
            specAssist: document.getElementById('feature-spec-assist').checked,
            pasteRedact: document.getElementById('feature-paste-redact').checked
        },
        thresholds: {
            aiInjection: parseFloat(document.getElementById('threshold-ai').value)
        }
    };

    chrome.storage.local.set({ settings }, () => {
        showStatus('Settings Saved');
    });
}

function renderPatterns() {
    const container = document.getElementById('patterns-container');
    container.innerHTML = '';

    patterns.forEach(p => {
        const tag = document.createElement('span');
        tag.className = 'pattern-tag';
        tag.textContent = p.name;
        container.appendChild(tag);
    });
}

function showStatus(msg) {
    const el = document.getElementById('status-msg');
    el.textContent = msg;
    el.style.opacity = '1';
    setTimeout(() => {
        el.style.opacity = '0';
    }, 2000);
}
