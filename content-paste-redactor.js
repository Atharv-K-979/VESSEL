

(async () => {
    // Dynamic imports
    const patternsSrc = chrome.runtime.getURL('lib/patterns.js');
    const uiSrc = chrome.runtime.getURL('lib/ui-utils.js');

    // Promise.all for parallel loading
    const [{ patterns, redact }, { createModal, escapeHtml }] = await Promise.all([
        import(patternsSrc),
        import(uiSrc)
    ]);

    document.addEventListener('paste', handlePaste, true);

    function handlePaste(e) {
        const clipboardData = e.clipboardData || window.clipboardData;
        if (!clipboardData) return;

        const text = clipboardData.getData('text/plain');
        if (!text) return; // Only handle text for now

        const matches = scanForSensitiveData(text);

        if (matches.length > 0) {
            console.log('VESSEL: Sensitive data detected in paste.');

            e.preventDefault();
            e.stopImmediatePropagation();

            showRedactionModal(e.target, text, matches);
        }
    }

    function scanForSensitiveData(text) {
        let allMatches = [];

        patterns.forEach(pattern => {
            pattern.regex.lastIndex = 0;

            let match;
            while ((match = pattern.regex.exec(text)) !== null) {
                if (pattern.validate && !pattern.validate(match[0])) {
                    continue;
                }

                allMatches.push({
                    type: pattern.name,
                    value: match[0],
                    index: match.index,
                    length: match[0].length,
                    patternObj: pattern // Keep ref for unique id if needed
                });
            }
        });

        return allMatches;
    }

    function showRedactionModal(target, originalText, matches) {
        // De-duplicate types for display
        const uniqueTypes = [...new Set(matches.map(m => m.type))];

        const content = `
            <div style="color: #4B5563;">
                 <p style="margin-bottom: 8px;">
                    VESSEL detected <strong>${matches.length}</strong> sensitive item(s):
                 </p>
                 <ul style="
                    list-style: none; padding: 0; margin: 0 0 16px 0; 
                    background: #FEF2F2; border: 1px solid #FCA5A5; 
                    border-radius: 6px; padding: 8px;"
                 >
                    ${uniqueTypes.map(type => `
                        <li style="
                            color: #991B1B; font-size: 13px; margin-bottom: 4px; 
                            display: flex; align-items: center;"
                        >
                            ⚠️ ${escapeHtml(type)}
                        </li>
                    `).join('')}
                 </ul>
                 <p style="font-size: 13px;">How would you like to proceed?</p>
            </div>
        `;

        const modal = createModal(
            "Sensitive Data Warning",
            content,
            [
                {
                    text: "Redact & Paste",
                    primary: true,
                    onClick: () => {
                        const redacted = redact(originalText, matches);
                        insertText(target, redacted);
                        modal.hide();
                    }
                },
                {
                    text: "Paste Original (Unsafe)",
                    primary: false,
                    onClick: () => {
                        insertText(target, originalText);
                        modal.hide();
                    }
                },
                {
                    text: "Cancel",
                    primary: false,
                    onClick: () => modal.hide()
                }
            ]
        );
        modal.show();
    }

    function insertText(target, text) {
        target.focus();

        const success = document.execCommand('insertText', false, text);

        if (!success) {
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                const start = target.selectionStart;
                const end = target.selectionEnd;
                const val = target.value;

                target.value = val.substring(0, start) + text + val.substring(end);

                target.selectionStart = target.selectionEnd = start + text.length;

                target.dispatchEvent(new Event('input', { bubbles: true }));
                target.dispatchEvent(new Event('change', { bubbles: true }));
            } else {
                console.warn('VESSEL: execCommand failed, falling back to manual insertion.');
            }
        }
    }

})();
