(async () => {
    try {
        // Dynamic imports
        const patternsSrc = chrome.runtime.getURL('lib/patterns.js');
        const uiSrc = chrome.runtime.getURL('lib/ui-utils.js');

        const [{ patterns, redact }, { createModal, escapeHtml }] = await Promise.all([
            import(patternsSrc),
            import(uiSrc)
        ]);

        document.addEventListener('paste', handlePaste, true);

        function handlePaste(e) {
            try {
                const clipboardData = e.clipboardData || window.clipboardData;
                if (!clipboardData) return;

                const text = clipboardData.getData('text/plain');
                if (!text) return;

                const matches = scanForSensitiveData(text);

                if (matches && matches.length > 0) {
                    console.log('VESSEL: Sensitive data detected in paste.');

                    e.preventDefault();
                    e.stopImmediatePropagation();

                    showRedactionModal(e.target, text, matches);
                }
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
                        type: pattern.name,
                        value: match[0],
                        0: match[0], // Required by redact() function
                        index: match.index,
                        length: match[0].length,
                        patternObj: pattern
                    });
                }
            });

            return allMatches;
        }

        function showRedactionModal(target, originalText, matches) {
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
                            try {
                                const redacted = redact(originalText, matches);
                                modal.hide();
                                setTimeout(() => {
                                    insertText(target, redacted);
                                }, 50);
                            } catch (err) {
                                console.error('[VESSEL] Redaction failed:', err);
                                modal.hide();
                            }
                        }
                    },
                    {
                        text: "Paste Original (Unsafe)",
                        primary: false,
                        onClick: () => {
                            modal.hide();
                            setTimeout(() => {
                                insertText(target, originalText);
                            }, 50);
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
            try {
                target.focus();

                // 1. Try execCommand (Standard)
                // Note: execCommand is deprecated but still the most reliable way to insert text
                // while preserving undo history in simple contenteditable fields.
                const success = document.execCommand('insertText', false, text);
                if (success) return;

                // 2. Form Inputs (Textarea/Input)
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                    const start = target.selectionStart || 0;
                    const end = target.selectionEnd || 0;
                    const val = target.value;

                    target.value = val.substring(0, start) + text + val.substring(end);
                    target.selectionStart = target.selectionEnd = start + text.length;

                    target.dispatchEvent(new Event('input', { bubbles: true }));
                    target.dispatchEvent(new Event('change', { bubbles: true }));
                    return;
                }

                // 3. Contenteditable Fallback (Selection API)
                if (target.isContentEditable) {
                    const selection = window.getSelection();
                    if (selection.rangeCount > 0) {
                        const range = selection.getRangeAt(0);
                        range.deleteContents();
                        const textNode = document.createTextNode(text);
                        range.insertNode(textNode);

                        // Move cursor after inserted text
                        range.setStartAfter(textNode);
                        range.setEndAfter(textNode);
                        selection.removeAllRanges();
                        selection.addRange(range);

                        // Dispatch input event
                        target.dispatchEvent(new Event('input', { bubbles: true }));
                    } else {
                        // Desperation fallback
                        target.innerText += text;
                    }
                }
            } catch (e) {
                console.error('[VESSEL] Insert text failed:', e);
            }
        }
    } catch (e) {
        console.error('[VESSEL] content-paste-redactor error:', e);
    }
})();
