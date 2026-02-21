(async () => {
    try {
        // Dynamic imports
        const patternsSrc = chrome.runtime.getURL('lib/patterns.js');
        const uiSrc = chrome.runtime.getURL('lib/ui-utils.js');

        const [{ patterns }, { showRedactionModal, insertText }] = await Promise.all([
            import(patternsSrc),
            import(uiSrc)
        ]);

        document.addEventListener('paste', handlePaste, true);

        function handlePaste(event) {
            try {
                const clipboardData = event.clipboardData || window.clipboardData;
                if (!clipboardData) return;

                const pastedText = clipboardData.getData('text/plain');
                if (!pastedText) return;

                const field = event.target;
                const matches = scanForSensitiveData(pastedText);

                if (matches && matches.length > 0) {
                    // Only stop default paste if we found sensitive data
                    event.preventDefault();
                    event.stopImmediatePropagation();

                    const detectedPatterns = [...new Set(matches.map(m => m.name))].join(', ');
                    console.log(`VESSEL: Sensitive data detected in paste. Patterns: ${detectedPatterns}`);

                    showRedactionModal(field, pastedText, matches);
                }
                // If NO sensitive data, we let the default browser paste proceed normally!
            } catch (err) {
                console.error('[VESSEL] Paste handler error:', err);
            }
        }

        function scanForSensitiveData(text) {
            let allMatches = [];
            if (!patterns) return allMatches;

            patterns.forEach(pattern => {
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
                        0: match[0], // Required by redact function
                        index: match.index,
                        length: match[0].length,
                        patternObj: pattern
                    });
                }
            });

            return allMatches;
        }
    } catch (e) {
        console.error('[VESSEL] content-paste-redactor error:', e);
    }
})();
