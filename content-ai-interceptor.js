
(async () => {
    const src = chrome.runtime.getURL('lib/ui-utils.js');
    const { createModal, escapeHtml } = await import(src);

    const AI_BUTTON_SELECTORS = [
        '[data-testid="comet-summarize"]',
        '.perplexity-comet-trigger',
        '.ai-summarize-btn',
        // Common ones
        '[aria-label*="Summarize"]',
        '[title*="Summarize"]'
    ];

    let modalInstance = null;

    document.addEventListener('click', handleAIClick, true);

    function handleAIClick(event) {
        const target = event.target;
        const isAIButton = AI_BUTTON_SELECTORS.some(sel => target.matches(sel) || target.closest(sel));

        if (isAIButton) {
            console.log('VESSEL: Intercepted AI button click.');

            event.preventDefault();
            event.stopImmediatePropagation();

            const pageContent = document.body.innerHTML;
            chrome.runtime.sendMessage({
                action: 'analyzePage',
                html: pageContent
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('VESSEL: Analysis failed', chrome.runtime.lastError);
                    return;
                }

                if (response.score > 0.7) {
                    showRiskModal(response, target);
                } else {
                    bypassAndClick(target);
                }
            });
        }
    }

    function showRiskModal(analysis, originalTarget) {
        const content = `
            <div style="color: #4B5563; margin-bottom: 12px;">
                <p><strong>Threat Score:</strong> <span style="color: #DC2626; font-weight: bold;">${(analysis.score * 10).toFixed(1)}/10</span></p>
                <p>This page contains hidden text or instructions that may manipulate the AI assistant.</p>
                <div style="margin-top: 10px; font-size: 13px; color: #6B7280;">
                    Detected: Potential Prompt Injection
                </div>
            </div>
        `;

        if (modalInstance) modalInstance.hide();

        modalInstance = createModal(
            "⚠️ Security Risk Detected",
            content,
            [
                {
                    text: "View Sanitized Version",
                    primary: true,
                    onClick: () => {
                        modalInstance.hide();
                        showSanitizedVersion(analysis.sanitized);
                    }
                },
                {
                    text: "Proceed Anyway (Risky)",
                    primary: false,
                    onClick: () => {
                        modalInstance.hide();
                        bypassAndClick(originalTarget);
                    }
                },
                {
                    text: "Cancel",
                    primary: false,
                    onClick: () => modalInstance.hide()
                }
            ]
        );
        modalInstance.show();
    }

    function showSanitizedVersion(cleanText) {

        chrome.runtime.sendMessage({ action: 'summarize', text: cleanText }, (response) => {
            const summary = response || "Summary unavailable.";

            const resultModal = createModal(
                "Sanitized Content Summary",
                `<div style="max-height: 300px; overflow-y: auto; white-space: pre-wrap;">${escapeHtml(summary)}</div>`,
                [{ text: "Close", primary: true, onClick: () => resultModal.hide() }]
            );
            resultModal.show();
        });
    }

    function bypassAndClick(target) {
        document.removeEventListener('click', handleAIClick, true);
        target.click();
        setTimeout(() => {
            document.addEventListener('click', handleAIClick, true);
        }, 100);
    }

})();
