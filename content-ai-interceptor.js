
(async () => {
    try {
        const src = chrome.runtime.getURL('lib/ui-utils.js');
        const { createModal, escapeHtml, showThreatModal, insertText } = await import(src);

        const AI_BUTTON_SELECTORS = [
            '[data-testid="comet-summarize"]',
            '.perplexity-comet-trigger',
            '.ai-summarize-btn',
            // Common ones
            '[aria-label*="Summarize"]',
            '[title*="Summarize"]',
            '#ai-assistant'
        ];

        let modalInstance = null;
        let isBypassing = false;

        document.addEventListener('click', handleAIClick, true);

        function handleAIClick(event) {
            if (isBypassing) return;

            const target = event.target;
            const isAIButton = AI_BUTTON_SELECTORS.some(sel => target.matches(sel) || target.closest(sel));

            if (isAIButton) {
                console.log('VESSEL: Intercepted AI button click.');

                if (!chrome.runtime?.id) {
                    console.warn('[VESSEL] Extension context invalidated. Please refresh the page.');
                    return;
                }

                event.preventDefault();
                event.stopImmediatePropagation();

                const pageContent = document.body.innerHTML;

                chrome.runtime.sendMessage({
                    action: 'analyzePage',
                    html: pageContent
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('VESSEL: Analysis failed', chrome.runtime.lastError);
                        bypassAndClick(target); // Fallback to safe state
                        return;
                    }

                    if (response && response.score > 0.7) {
                        showRiskModal(response, target, pageContent);
                    } else {
                        bypassAndClick(target);
                    }
                });
            }
        }

        function showRiskModal(analysis, originalTarget, originalText) {
            if (modalInstance) modalInstance.hide();

            modalInstance = showThreatModal(
                analysis.score,
                originalText,
                analysis.sanitized,
                () => { // Proceed
                    modalInstance = null;
                    bypassAndClick(originalTarget);
                },
                () => { // Send Sanitized
                    modalInstance = null;
                    // Attempt to find the closest AI input field or fallback to any text area
                    let inputField = originalTarget.closest('form')?.querySelector('textarea, [contenteditable="true"], input[type="text"]');
                    if (!inputField) {
                        inputField = document.querySelector('textarea, [contenteditable="true"], input[type="text"]');
                    }

                    if (inputField) {
                        // Clear the current value and set it to sanitized
                        if (inputField.tagName === 'INPUT' || inputField.tagName === 'TEXTAREA') {
                            inputField.value = '';
                        } else if (inputField.isContentEditable) {
                            inputField.innerHTML = '';
                        }
                        insertText(inputField, analysis.sanitized);
                    } else {
                        console.warn("[VESSEL] No input field found to inject sanitized text.");
                    }
                    bypassAndClick(originalTarget);
                },
                () => { // Cancel
                    modalInstance = null;
                }
            );
        }

        function bypassAndClick(target) {
            isBypassing = true;
            target.click();
            setTimeout(() => {
                isBypassing = false;
            }, 100);
        }

    } catch (e) {
        console.error('[VESSEL] content-ai-interceptor error:', e);
    }
})();
