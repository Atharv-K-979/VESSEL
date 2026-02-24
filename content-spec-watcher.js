(async () => {
    try {
        const geminiClientSrc = chrome.runtime.getURL('lib/gemini-client.js');
        const uiUtilsSrc = chrome.runtime.getURL('lib/ui-utils.js');

        const [
            { default: GeminiClient },
            { createBadge, createRequirementsModal, insertText, prependText }
        ] = await Promise.all([
            import(geminiClientSrc),
            import(uiUtilsSrc)
        ]);

        let mlEngine = null;
        let geminiClient = null;
        let activeBadge = null;
        let typingTimer = null;
        let currentTarget = null;
        const ANALYSIS_DELAY = 1500;

        chrome.storage.local.get(['geminiApiKey'], (result) => {
            if (result.geminiApiKey) {
                geminiClient = new GeminiClient(result.geminiApiKey);
            } else {
                geminiClient = new GeminiClient(null);
            }
        });

        document.addEventListener('input', handleInput, true);
        document.addEventListener('focusin', handleFocus, true);
        document.addEventListener('paste', handlePaste, true);

        function getTargetElement(el) {
            if (!el) return null;
            if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el;
            if (el.closest && el.closest('[contenteditable="true"]')) {
                return el.closest('[contenteditable="true"]');
            }
            if (el.isContentEditable || el.role === 'textbox') return el;
            return null;
        }

        function handleInput(e) {
            const target = getTargetElement(e.target);
            if (!target) return;

            if (typingTimer) clearTimeout(typingTimer);

            typingTimer = setTimeout(() => {
                analyzeSpec(target);
            }, ANALYSIS_DELAY);
        }

        function handlePaste(e) {
            const target = getTargetElement(e.target);
            if (!target) return;

            if (typingTimer) clearTimeout(typingTimer);

            // Wait for typing delay before parsing pasted text
            typingTimer = setTimeout(() => {
                analyzeSpec(target);
            }, ANALYSIS_DELAY);
        }

        function handleFocus(e) {
            const target = getTargetElement(e.target);
            if (target) {
                if (currentTarget !== target) {
                    currentTarget = target;
                }

                if (getText(target)) {
                    analyzeSpec(target);
                }
            }
        }

        function getText(el) {
            if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') return el.value || "";
            return el.innerText || el.textContent || "";
        }

        async function analyzeSpec(target) {
            const text = getText(target);

            if (!text || typeof text !== 'string') {
                hideBadge();
                return;
            }

            if (!containsTechnicalTerms(text) || text.trim().length < 10) {
                hideBadge();
                return;
            }

            if (!chrome.runtime?.id) {
                console.warn('[VESSEL] Extension context invalidated. Please refresh the page.');
                return;
            }

            showLoadingBadge(target);

            try {
                const response = await chrome.runtime.sendMessage({ action: 'analyzeSpec', text: text });

                if (!response || !response.missing || response.missing.length === 0) {
                    hideBadge();
                    return;
                }

                showBadge(target, response.missing.length, async () => {
                    await showRequirementsUI(target, text, response.missing);
                });
            } catch (error) {
                console.error("[VESSEL] Error analyzing spec:", error);
                hideBadge();
            }
        }

        function showLoadingBadge(targetElement) {
            hideBadge();
            const rect = targetElement.getBoundingClientRect();

            const badge = document.createElement('div');
            badge.className = 'vessel-loading-badge';
            badge.style.cssText = `
                position: absolute;
                z-index: 10000;
                background: linear-gradient(135deg, #111827 0%, #1F2937 100%);
                color: #58A6FF;
                border: 1px solid rgba(88, 166, 255, 0.3);
                border-radius: 20px;
                padding: 6px 12px;
                font-family: 'Inter', sans-serif;
                font-size: 12px;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                animation: pulse 1.5s infinite;
            `;
            badge.innerHTML = `<span style="display:inline-block;animation: spin 1s linear infinite;">⏳</span> Generating...`;
            if (!document.getElementById('vessel-keyframes')) {
                const style = document.createElement('style');
                style.id = 'vessel-keyframes';
                style.textContent = `
                    @keyframes spin { 100% { transform: rotate(360deg); } }
                    @keyframes pulse { 0% { opacity: 0.7; } 50% { opacity: 1; } 100% { opacity: 0.7; } }
                `;
                document.head.appendChild(style);
            }

            const top = rect.top + window.scrollY - 10;
            const left = rect.right + window.scrollX - 10;

            badge.style.top = `${top}px`;
            badge.style.left = `${left}px`;

            document.body.appendChild(badge);
            activeBadge = badge;
        }

        async function showRequirementsUI(target, contextText, missingItems) {
            if (!missingItems || !missingItems.length) return;

            const requirements = missingItems.map(item => ({
                category: item.category,
                description: item.template || item.description,
                confidence: item.score || 0.9
            }));

            try {
                const modal = createRequirementsModal(
                    requirements,
                    (suggestionsArray) => {
                        const singleString = Array.isArray(suggestionsArray) ? suggestionsArray.join('\n') : suggestionsArray;
                        const formattedText = `> "[\n${singleString}\n]"`;

                        try {
                            prependText(target, formattedText);
                        } catch (e) {
                            console.error('[VESSEL] Error prepending text', e);
                        }

                        if (modal) modal.remove();
                        hideBadge();
                    },
                    geminiClient ? geminiClient.isConfigured() : false
                );

                document.body.appendChild(modal);

            } catch (e) {
                console.error("Error displaying requirements UI", e);
            } finally {
                document.body.style.cursor = 'default';
            }
        }

        function showBadge(targetElement, count, onClick) {
            hideBadge();

            const rect = targetElement.getBoundingClientRect();

            activeBadge = createBadge(count, onClick);

            const top = rect.top + window.scrollY - 10;
            const left = rect.right + window.scrollX - 10;

            activeBadge.style.top = `${top}px`;
            activeBadge.style.left = `${left}px`;

            document.body.appendChild(activeBadge);

        }

        function hideBadge() {
            if (activeBadge) {
                activeBadge.remove();
                activeBadge = null;
            }
        }



        function containsTechnicalTerms(text) {
            const technicalTerms = [
                'api', 'endpoint', 'function', 'database', 'server',
                'user', 'data', 'store', 'upload', 'download',
                'authenticate', 'login', 'password', 'admin', 'component', 'system'
            ];
            const lower = text.toLowerCase();
            return technicalTerms.some(term => lower.includes(term));
        }

        console.log("VESSEL Spec Watcher initialized");

    } catch (e) {
        console.error("VESSEL Spec Watcher failed to load:", e);
    }
})();
