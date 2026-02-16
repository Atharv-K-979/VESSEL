/**
 * VESSEL AI Interceptor
 * Intercepts clicks on known AI assistant "Send" buttons.
 * Scans the page for hidden prompt injection vectors before allowing the click.
 */

(async () => {
    // Dynamic import for modules since this is a standard content script
    const uiUtilsParam = chrome.runtime.getURL('lib/ui-utils.js');
    const uiUtils = await import(uiUtilsParam);

    // TODO: move this to chrome.storage.managed policies later
    // Selectors for "Send" buttons of common AI tools
    // These are placeholders/examples. In production, these need to be very specific and maintained.
    let AI_BUTTON_SELECTORS = [
        'button[aria-label="Send message"]', // Common generic
        'button[data-testid="send-button"]', // ChatGPT-like
        '.ai-trigger', // For our manual testing
        '#vessel-simulation-btn' // For simulation
    ];

    console.log('[VESSEL] AI Interceptor Loaded');

    // Store processed events to prevent infinite loops when we re-dispatch
    const processedEvents = new WeakSet();

    function getPageContent() {
        // Get the entire HTML for now. In the future, we might only get the visible text
        // or the text in the active input field depending on the context.
        return document.documentElement.outerHTML;
    }

    async function handleInterception(event) {
        // If we already processed this event and deemed it safe, let it go
        if (processedEvents.has(event)) {
            return;
        }

        const target = event.target.closest('button');
        if (!target) return;

        // Check if it matches our selectors
        const isMatch = AI_BUTTON_SELECTORS.some(selector => target.matches(selector));
        if (!isMatch) return;

        console.log('[VESSEL] Intercepted click on:', target);

        // Stop the immediate action
        event.preventDefault();
        event.stopImmediatePropagation();

        // Notify ID for UI feedback (optional, could show a "Scanning..." toast)
        const toast = uiUtils.showBadge("Scanning...", () => { });

        // Capture content
        const pageContent = getPageContent();

        // Send to background for analysis
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'analyzePage',
                html: pageContent
            });

            toast.remove();

            if (response && response.isThreat) {
                console.warn('[VESSEL] Threat detected:', response);

                uiUtils.showModal(
                    "Security Alert: Prompt Injection Detected",
                    `
              <p><strong>Threat Score:</strong> ${Math.round(response.score * 100)}%</p>
              <p><strong>Reason:</strong> ${response.reason}</p>
              <p>VESSEL blocked this action to protect your AI session.</p>
            `,
                    () => {
                        // "View Sanitized" or "Proceed Anyway" logic could go here
                        // For now, primary action is just "OK" (close)
                        console.log('[VESSEL] User acknowledged threat.');
                    },
                    "Dismiss"
                );
            } else {
                console.log('[VESSEL] Page safe. Resuming action.');

                // Re-dispatch the click key
                // We need to create a new event that looks exactly like the original
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

                // Mark as processed so we don't intercept it again
                processedEvents.add(newEvent);
                target.dispatchEvent(newEvent);
            }
        } catch (err) {
            toast.remove();
            console.error('[VESSEL] Analysis failed:', err);
            // Fail open or closed? For logic safety, let's show an error but allow user to retry manually if they insist (by not blocking subsequent clicks immediately if we wanted implementation complexity, but here we just log).
            // For security, strictly we should block.
            uiUtils.showBadge("Error scanning. Try again.", () => { });
        }
    }

    // Use capture phase to intercept before the site's own listeners
    document.addEventListener('click', handleInterception, true);

    // MutationObserver to watch for new buttons (if we needed to attach verify attributes, but
    // since we use a global delegate listener on document with a selector check,
    // we strictly don't need to observe *additions* unless we want to highlight them visually).
    // For this task, the global listener is sufficient and more performant than attaching listeners to every button.

})();
