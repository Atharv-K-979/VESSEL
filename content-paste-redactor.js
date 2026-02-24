(function () {
    // Register synchronously to catch early events
    document.addEventListener('paste', handlePaste, true);

    let patternsModule = null;
    let uiModule = null;

    async function ensureModules() {
        if (!patternsModule || !uiModule) {
            const patternsSrc = chrome.runtime.getURL('lib/patterns.js');
            const uiSrc = chrome.runtime.getURL('lib/ui-utils.js');
            [patternsModule, uiModule] = await Promise.all([
                import(patternsSrc),
                import(uiSrc)
            ]);
        }
    }

    async function handlePaste(event) {
        try {
            const clipboardData = event.clipboardData || window.clipboardData;
            if (!clipboardData) return;

            const pastedText = clipboardData.getData('text/plain');
            if (!pastedText) return;

            await ensureModules();

            const field = event.target;
            const matches = scanForSensitiveData(pastedText);

            if (matches && matches.length > 0) {
                event.preventDefault();
                event.stopImmediatePropagation();

                const detectedPatterns = [...new Set(matches.map(m => m.name))].join(', ');
                console.log(`VESSEL: Sensitive data detected in paste. Patterns: ${detectedPatterns}`);

                // Send to service worker for tracking the risk assessment
                chrome.runtime.sendMessage({
                    action: 'logIncident',
                    data: {
                        type: 'sensitive_paste',
                        details: `Blocked pasting: ${detectedPatterns}`,
                        score: 0.8, // Static risk score for pasting sensitive data
                        timestamp: Date.now()
                    }
                });

                uiModule.showRedactionModal(field, pastedText, matches);
            }
        } catch (err) {
            console.error('[VESSEL] Paste handler error:', err);
        }
    }

    function scanForSensitiveData(text) {
        let allMatches = [];
        if (!patternsModule || !patternsModule.patterns) return allMatches;

        patternsModule.patterns.forEach(pattern => {
            pattern.regex.lastIndex = 0;
            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                if (pattern.validate && !pattern.validate(match[0])) {
                    continue;
                }

                allMatches.push({
                    name: pattern.name,
                    type: pattern.name,
                    value: match[0],
                    0: match[0],
                    index: match.index,
                    length: match[0].length,
                    patternObj: pattern
                });
            }
        });

        return allMatches;
    }
})();
