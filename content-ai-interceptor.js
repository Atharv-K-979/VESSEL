
(async () => {
    try {
        const uiSrc = chrome.runtime.getURL('lib/ui-utils.js');
        const sanitizerSrc = chrome.runtime.getURL('lib/sanitizer.js');
        
        const [
            { createModal, escapeHtml, showThreatModal, insertText },
            { detectObfuscatedPayloads, sanitizeDOM }
        ] = await Promise.all([
            import(uiSrc),
            import(sanitizerSrc)
        ]);

        const AI_BUTTON_SELECTORS = [
            '[data-testid="comet-summarize"]',
            '.perplexity-comet-trigger',
            '.ai-summarize-btn',
            '[aria-label*="Summarize"]',
            '[title*="Summarize"]',
            '#ai-assistant',
            '[data-test-id="send-button"]', // Gemini submit
            'button[aria-label="Send message"]', // ChatGPT submit
            '.notion-ai-button' // Notion AI
        ];

        let modalInstance = null;
        let isBypassing = false;

        /**
         * isContextValid – Returns false if the extension was reloaded/updated
         * but we are still running on an old page instance.
         */
        function isContextValid() {
            try { return !!(chrome.runtime?.id); }
            catch (_) { return false; }
        }

        document.addEventListener('click', handleUserAction, true);
        document.addEventListener('keydown', handleUserAction, true);
        document.addEventListener('copy', handleCopy, true);

        function handleUserAction(event) {
            // Guard: If extension context is gone, unbind and let events pass natively
            if (!isContextValid()) {
                document.removeEventListener('click', handleUserAction, true);
                document.removeEventListener('keydown', handleUserAction, true);
                document.removeEventListener('copy', handleCopy, true);
                return;
            }

            if (isBypassing) return;

            const target = event.target;

            let isAIAction = false;
            let inputElement = null;

            if (event.type === 'click') {
                isAIAction = AI_BUTTON_SELECTORS.some(sel => {
                    try { return target.matches(sel) || target.closest(sel); }
                    catch (e) { return false; } // in case of :has() unsupported
                });
                
                // Fallback: If it's a generic button with AI/Summarize text, treat as AI action
                if (!isAIAction && (target.tagName === 'BUTTON' || target.closest('button'))) {
                    const btnText = (target.textContent || '').toLowerCase();
                    if (btnText.includes('test ai') || btnText.includes('summarize')) {
                        isAIAction = true;
                    }
                }
                
                if (isAIAction) inputElement = document.querySelector('textarea, [contenteditable="true"]');
            } else if (event.type === 'keydown' && event.key === 'Enter' && !event.shiftKey) {
                if (target.tagName === 'TEXTAREA' || target.isContentEditable) {
                    isAIAction = true;
                    inputElement = target;
                }
            }

            if (isAIAction) {
                // Must stop events immediately to block the AI site's native submission
                event.stopImmediatePropagation();
                event.preventDefault();

                console.log('[VESSEL] Intercepted AI action.');

                const isChatAction = event.type === 'keydown';
                const pageContext = capturePageContext(inputElement, !isChatAction);

                // Extract threats directly in the content script where DOMParser is available
                const threats = detectObfuscatedPayloads(pageContext.html);
                // Also sanitize HTML here to cleanly send plain text to the background worker
                const sanitizedHtmlText = sanitizeDOM(pageContext.html);
                const combinedText = `${pageContext.text}\n${sanitizedHtmlText}`;

                try {
                    chrome.runtime.sendMessage({
                        action: 'analyzePrompt',
                        text: combinedText,
                        threats: threats
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error('[VESSEL] Analysis failed or connection lost', chrome.runtime.lastError);
                            bypassAndExecute(event, target);
                            return;
                        }

                        if (response && response.score > 0.7) {
                            try {
                                showRiskModal(response, event, target, pageContext.text);
                            } catch (e) {
                                console.error('[VESSEL] UI Modal failed to render.', e);
                                bypassAndExecute(event, target);
                            }
                        } else {
                            bypassAndExecute(event, target);
                        }
                    });
                } catch (sendErr) {
                    console.error('[VESSEL] sendMessage failed. Context invalid?', sendErr);
                    bypassAndExecute(event, target);
                }
            }
        }

        function capturePageContext(inputElement, includeHtml = true) {
            let contextText = "";

            // Extract text from the active input
            if (inputElement) {
                contextText += (inputElement.value || inputElement.innerText || "") + "\n\n";
            }

            if (includeHtml) {
                // aggressive scan for hidden elements
                const hiddenElements = document.querySelectorAll('[style*="display: none"], [style*="display:none"], [style*="opacity: 0"], [style*="opacity:0"], [aria-hidden="true"]');
                hiddenElements.forEach(el => {
                    if (el.innerText && el.innerText.trim().length > 0) {
                        contextText += `[Hidden Payload]: ${el.innerText}\n`;
                    }
                });
            }

            return {
                text: contextText.trim(),
                html: includeHtml ? document.body.innerHTML : "" // Send full HTML only if requested
            };
        }

        function handleCopy(event) {
            if (!isContextValid()) {
                document.removeEventListener('copy', handleCopy, true);
                return;
            }
            if (isBypassing) return;

            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;

            // Clone to container to inspect exactly what's being copied, 
            // including visually hidden nodes missed by selection.toString()
            const range = selection.getRangeAt(0);
            const container = document.createElement('div');
            container.appendChild(range.cloneContents());
            
            const copiedHtml = container.innerHTML;
            const copiedTextWithHidden = container.textContent || '';
            const copiedText = copiedTextWithHidden; // Always use textual representation including hidden content for ML to score correctly

            if (!copiedText.trim()) return;

            // Synchronous fast check for prompt injection keywords against textContent
            const lower = copiedText.toLowerCase();
            const keywords = ['ignore all previous', 'system override', 'jailbreak', 'you are now dan', 'disregard', 'hidden instructions'];
            const isSuspicious = keywords.some(kw => lower.includes(kw));

            // If not suspicious, let native copy occur
            if (!isSuspicious) {
                // We'll also still do a quick obfuscation check just in case
                const threats = detectObfuscatedPayloads(copiedHtml);
                if (!threats || threats.length === 0) return; // Clean
            }

            // Stop the native copy event synchronously to prevent the payload from reaching the clipboard
            event.preventDefault();
            event.stopImmediatePropagation();

            const threats = detectObfuscatedPayloads(copiedHtml);

            console.log('[VESSEL] Suspicious copy intercepted. Analyzing via ML...');

            // Clear clipboard natively so `execCommand('copy')` fails to get the payload
            if (event.clipboardData) {
                event.clipboardData.clearData();
            }

            chrome.runtime.sendMessage({
                action: 'analyzePrompt',
                text: copiedText,
                threats: threats
            }, (response) => {
                if (chrome.runtime.lastError || !response || response.score <= 0.7) {
                    // False positive, allow copy manually
                    isBypassing = true;
                    writeToClipboard(copiedText, copiedHtml).finally(() => { isBypassing = false; });
                    return;
                }

                // High risk detected! Show modal.
                if (modalInstance) modalInstance.hide();

                try {
                    chrome.runtime.sendMessage({
                        action: 'logIncident',
                        data: {
                            type: 'prompt_injection',
                            details: 'Blocked malicious copy: Prompt injection payload detected.',
                            score: response.score,
                            timestamp: Date.now()
                        }
                    }).catch(() => {});
                } catch(e) {}

                modalInstance = showThreatModal(
                    response.score,
                    copiedText,
                    response.sanitized,
                    threats,
                    () => { // Proceed
                        modalInstance = null;
                        isBypassing = true;
                        writeToClipboard(copiedText, copiedHtml).finally(() => { isBypassing = false; });
                    },
                    () => { // Sanitize
                        modalInstance = null;
                        isBypassing = true;
                        writeToClipboard(response.sanitized, response.sanitized).finally(() => { isBypassing = false; });
                    },
                    () => { // Cancel
                        modalInstance = null;
                    }
                );
            });
        }

        // Intercept Document.execCommand to catch programmatic copies
        const originalExecCommand = document.execCommand;
        document.execCommand = function(command, ...args) {
            if (command.toLowerCase() === 'copy' && !isBypassing) {
                // Determine target node for the event based on selection
                let target = document;
                const selection = window.getSelection();
                if (selection && selection.rangeCount > 0) {
                    const range = selection.getRangeAt(0);
                    target = range.commonAncestorContainer;
                    if (target.nodeType === Node.TEXT_NODE) {
                        target = target.parentNode;
                    }
                }

                const event = new ClipboardEvent('copy', { cancelable: true, bubbles: true });
                target.dispatchEvent(event);
                if (event.defaultPrevented) return false;
            }
            return originalExecCommand.apply(this, [command, ...args]);
        };

        async function writeToClipboard(plainText, htmlText) {
            try {
                // Clipboard API requires secure context and user activation
                if (navigator.clipboard && window.isSecureContext) {
                    const item = new ClipboardItem({
                        'text/plain': new Blob([plainText], { type: 'text/plain' }),
                        'text/html': new Blob([htmlText], { type: 'text/html' })
                    });
                    await navigator.clipboard.write([item]);
                    return;
                }
            } catch (e) {
                console.warn('[VESSEL] Clipboard API failed, falling back to execCommand', e);
            }
            
            // Fallback for non-secure contexts (like file:// or some http)
            const textarea = document.createElement('textarea');
            textarea.value = plainText;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            isBypassing = true; // prevent infinite loop
            originalExecCommand.call(document, 'copy');
            isBypassing = false;
            document.body.removeChild(textarea);
        }

        function showRiskModal(analysis, originalEvent, originalTarget, originalText) {
            if (modalInstance) modalInstance.hide();

            modalInstance = showThreatModal(
                analysis.score,
                originalText,
                analysis.sanitized,
                analysis.threats || [],       // ← new: pass obfuscated threat details
                () => { // Proceed
                    modalInstance = null;
                    bypassAndExecute(originalEvent, originalTarget);
                },
                () => { // Send Sanitized
                    modalInstance = null;
                    let inputField = originalTarget.closest('form')?.querySelector('textarea, [contenteditable="true"], input[type="text"]');
                    if (!inputField) {
                        inputField = document.querySelector('textarea, [contenteditable="true"], input[type="text"]');
                    }

                    if (inputField) {
                        if (inputField.tagName === 'INPUT' || inputField.tagName === 'TEXTAREA') {
                            inputField.value = '';
                        } else if (inputField.isContentEditable) {
                            inputField.innerHTML = '';
                        }
                        insertText(inputField, analysis.sanitized);
                    } else {
                        console.warn("[VESSEL] No input field found to inject sanitized text.");
                    }
                    bypassAndExecute(originalEvent, originalTarget);
                },
                () => { // Cancel
                    modalInstance = null;
                }
            );
        }

        function bypassAndExecute(event, target) {
            isBypassing = true;

            if (event.type === 'click') {
                target.click();
            } else if (event.type === 'keydown') {
                // Simulate enter key again
                const enterEvent = new KeyboardEvent('keydown', {
                    key: 'Enter',
                    code: 'Enter',
                    keyCode: 13,
                    which: 13,
                    bubbles: true,
                    cancelable: true
                });
                target.dispatchEvent(enterEvent);
            }

            setTimeout(() => {
                isBypassing = false;
            }, 100);
        }

    } catch (e) {
        console.error('[VESSEL] content-ai-interceptor error:', e);
    }
})();
