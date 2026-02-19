(async () => {
    // Dynamic import for modules
    const uiUtilsParam = chrome.runtime.getURL('lib/ui-utils.js');
    const uiUtils = await import(uiUtilsParam);

    // TODO: move to policies
    // Selectors for Spec Editors
    const EDITOR_SELECTORS = [
        '.ak-editor-content-area', 
        '[contenteditable="true"]', 
        'textarea', 
        '#spec-editor' 
    ];

    let activeBadge = null;
    let debounceTimer = null;

    console.log('[VESSEL] Spec Watcher Loaded');

    function getEditorValue(element) {
        if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
            return element.value;
        }
        return element.innerText; 
    }

    function injectText(element, text) {
        element.focus();
        if (document.queryCommandSupported('insertText')) {
            document.execCommand('insertText', false, text);
        } else {
            if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
                const start = element.selectionStart;
                const end = element.selectionEnd;
                const val = element.value;
                element.value = val.substring(0, start) + text + val.substring(end);
                element.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
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

    document.addEventListener('input', (e) => {
        const target = e.target;
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
