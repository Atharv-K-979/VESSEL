document.addEventListener('DOMContentLoaded', async () => {
    const engineType = document.getElementById('engineType');
    const riskThreshold = document.getElementById('riskThreshold');
    const saveBtn = document.getElementById('saveBtn');
    const msg = document.getElementById('msg');

    // Load
    const data = await chrome.storage.local.get(['userSettings']);
    const settings = data.userSettings || { engineType: 'auto', riskThreshold: 0.8 };

    engineType.value = settings.engineType;
    riskThreshold.value = settings.riskThreshold;

    // Save
    saveBtn.addEventListener('click', async () => {
        const newSettings = {
            engineType: engineType.value,
            riskThreshold: parseFloat(riskThreshold.value)
        };

        await chrome.storage.local.set({ userSettings: newSettings });

        msg.style.display = 'inline';
        setTimeout(() => { msg.style.display = 'none'; }, 2000);
    });
});
