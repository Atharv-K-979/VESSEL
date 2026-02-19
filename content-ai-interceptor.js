(async () => {
    const uiUtilsParam = chrome.runtime.getURL('lib/ui-utils.js');
    const uiUtils = await import(uiUtilsParam);

    // TODO: move this to chrome.storage.managed policies later
    let AI_BUTTON_SELECTORS = [
        'button[aria-label="Send message"]',
        'button[data-testid="send-button"]', 
        '.ai-trigger',
        '#vessel-simulation-btn', 
        '#ai-assistant'
    ];

    console.log('[VESSEL] AI Interceptor Loaded');

    const processedEvents = new WeakSet();

    function getPageContent() {
        return document.documentElement.outerHTML;
    }

    async function handleInterception(event) {
        if (processedEvents.has(event)) {
            return;
        }
        const target = event.target.closest('button');
        if (!target) return;
        const isMatch = AI_BUTTON_SELECTORS.some(selector => target.matches(selector));
        if (!isMatch) return;
        console.log('[VESSEL] Intercepted click on:', target);
        event.preventDefault();
        event.stopImmediatePropagation();
        const toast = uiUtils.showBadge("Scanning...", () => { });
        const pageContent = getPageContent();
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'analyzePage',
                html: pageContent
            });

            toast.remove();

            if (response && response.isThreat) {
                console.warn('[VESSEL] Threat detected:', response);

                uiUtils.showAIModal(response, () => {
                    // "View Sanitized" logic placeholder
                    console.log('[VESSEL] User requested to view sanitized input (not yet implemented).');
                });
            } else {
                console.log('[VESSEL] Page safe. Resuming action.');

                const newEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    detail: event.detail,
                    screenX: event.screenX,
                    screenY: event.screenY,
                    clientX: event.clientX,
                    clientY: event.clientY,
                    ctrlKey: event.ctrlKey,
                    altKey: event.altKey,
                    shiftKey: event.shiftKey,
                    metaKey: event.metaKey,
                    button: event.button,
                    buttons: event.buttons,
                    relatedTarget: event.relatedTarget
                });

                processedEvents.add(newEvent);
                target.dispatchEvent(newEvent);
            }
        } catch (err) {
            toast.remove();
            console.error('[VESSEL] Analysis failed:', err);
            uiUtils.showBadge("Error scanning. Try again.", () => { });
        }
    }

    document.addEventListener('click', handleInterception, true);
})();
