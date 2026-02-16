/**
 * VESSEL Spec Watcher
 * Monitors text input in specification tools (Jira, Notion, Linear, Confluence).
 * Analyzes content for missing security requirements.
 */

(async () => {
    // Dynamic import for modules
    const uiUtilsParam = chrome.runtime.getURL('lib/ui-utils.js');
    const uiUtils = await import(uiUtilsParam);

    // TODO: move to policies
    // Selectors for Spec Editors
    const EDITOR_SELECTORS = [
        '.ak-editor-content-area', // Jira/Confluence (Atlassian)
        '[contenteditable="true"]', // Generic rich text (Notion, Linear, etc.)
        'textarea', // Basic Fallback
        '#spec-editor' // Testing
    ];

    let activeBadge = null;
    let debounceTimer = null;

    console.log('[VESSEL] Spec Watcher Loaded');

    function getEditorValue(element) {
        if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
            return element.value;
        }
        return element.innerText; // or innerHTML depending on need
    }

    function injectText(element, text) {
        // This is tricky for rich text editors.
        // Best effort: execCommand (deprecated but works) or simple append for textarea.

        element.focus();
        if (document.queryCommandSupported('insertText')) {
            document.execCommand('insertText', false, text);
        } else {
            // Fallback for textarea/input
            if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
                const start = element.selectionStart;
                const end = element.selectionEnd;
                const val = element.value;
                element.value = val.substring(0, start) + text + val.substring(end);
                // Dispatch input event to notify frameworks (React, etc)
                element.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
                // Fallback for contenteditable: direct append (might break framework state)
                element.innerText += text;
            }
        }
    }

    async function analyzeContent(element) {
        const text = getEditorValue(element);
        if (!text || text.length < 10) return; // Ignore empty/short

        console.log('[VESSEL] Analyzing Spec...');
        if (activeBadge) {
            activeBadge.textContent = "🛡️ Analyzing...";
        }

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'analyzeSpec',
                text: text
            });

            // Remove existing badge to refresh
            if (activeBadge) activeBadge.remove();
            activeBadge = null;

            if (response && response.missingRequirements && response.missingRequirements.length > 0) {
                const count = response.missingRequirements.length;

                activeBadge = uiUtils.showBadge(
                    `${count} Security reqs missing`,
                    () => showSuggestionsModal(element, response.missingRequirements)
                );
            }
        } catch (err) {
            console.error('[VESSEL] Spec analysis failed:', err);
        }
    }

    function showSuggestionsModal(element, requirements) {
        uiUtils.showSpecModal(requirements, (index, textToInject) => {
            // Inject logic
            injectText(element, `\n\n**Security Requirement (${requirements[index].category}):**\n${textToInject}`);
        });
    }

    // Attach listeners
    // We use a global listener for delegation on Inputs, but for ContentEditable we might need direct attachment
    // or a specialized observer.
    // For simplicity: unique listener on documented 'input' events which bubbled from typical frameworks.
    document.addEventListener('input', (e) => {
        const target = e.target;
        // Check if target matches our editors
        const isEditor = EDITOR_SELECTORS.some(sel => target.matches(sel) || target.closest(sel));

        if (isEditor) {
            // Debounce
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                analyzeContent(target);
            }, 3000); // 3 seconds
        }
    });

})();
