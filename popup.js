document.addEventListener('DOMContentLoaded', async () => {
    const toggle = document.getElementById('activeToggle');
    const blockedCount = document.getElementById('blockedCount');
    const analyzedCount = document.getElementById('analyzedCount');
    const statusText = document.getElementById('statusText');
    const openOptions = document.getElementById('openOptions');

    // Load State
    const data = await chrome.storage.local.get(['isActive', 'stats']);

    toggle.checked = data.isActive !== false; // Default true
    updateStatus(toggle.checked);

    if (data.stats) {
        blockedCount.textContent = data.stats.blocked || 0;
        analyzedCount.textContent = data.stats.analyzed || 0;
    }

    // Listeners
    toggle.addEventListener('change', async (e) => {
        const isActive = e.target.checked;
        await chrome.storage.local.set({ isActive });
        updateStatus(isActive);
    });

    openOptions.addEventListener('click', () => {
        chrome.runtime.openOptionsPage();
    });

    function updateStatus(active) {
        if (active) {
            statusText.textContent = "System Active";
            statusText.style.color = "#059669";
        } else {
            statusText.textContent = "Protection Paused";
            statusText.style.color = "#D97706";
        }
    }
});
