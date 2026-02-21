(async () => {
    try {
        const geminiClientSrc = chrome.runtime.getURL('lib/gemini-client.js');
        const uiUtilsSrc = chrome.runtime.getURL('lib/ui-utils.js');

        const [
            { default: GeminiClient },
            { createBadge, createRequirementsModal }
        ] = await Promise.all([
            import(geminiClientSrc),
            import(uiUtilsSrc)
        ]);

        let mlEngine = null; // Removed Direct Import
        let geminiClient = null;
        let activeBadge = null;
        let typingTimer = null;
        const ANALYSIS_DELAY = 1500; // Wait 1.5s after typing stops

        // Initialize Config only
        chrome.storage.local.get(['geminiApiKey'], (result) => {
            if (result.geminiApiKey) {
                geminiClient = new GeminiClient(result.geminiApiKey);
            } else {
                geminiClient = new GeminiClient(null);
            }
        });

        document.addEventListener('input', handleInput, true);
        document.addEventListener('focusin', handleFocus, true);

        function handleInput(e) {
            const target = e.target;
            if (!isTextArea(target)) return;

            if (typingTimer) clearTimeout(typingTimer);

            typingTimer = setTimeout(() => {
                analyzeSpec(target);
            }, ANALYSIS_DELAY);
        }

        function handleFocus(e) {
            const target = e.target;
            if (isTextArea(target)) {
                if (target.value && target.value.length > 20) {
                    analyzeSpec(target);
                }
            }
        }

        function isTextArea(el) {
            return el.tagName === 'TEXTAREA' ||
                (el.tagName === 'DIV' && el.isContentEditable) ||
                el.role === 'textbox';
        }

        function getText(el) {
            if (el.tagName === 'TEXTAREA') return el.value;
            return el.innerText; // contenteditable
        }

        async function analyzeSpec(target) {
            const text = getText(target);

            if (!text || typeof text !== 'string' || text.length < 20 || !containsTechnicalTerms(text)) {
                hideBadge();
                return;
            }

            if (!chrome.runtime?.id) {
                console.warn('[VESSEL] Extension context invalidated. Please refresh the page.');
                return;
            }

            const response = await chrome.runtime.sendMessage({ action: 'analyzeSpec', text: text });

            if (!response || !response.missing || response.missing.length === 0) {
                hideBadge();
                return;
            }

            showBadge(target, response.missing.length, async () => {
                await showRequirementsUI(target, text, response.missing);
            });
        }

        async function showRequirementsUI(target, contextText, missingItems) {
            if (!missingItems || !missingItems.length) return;
            const requirements = [];

            document.body.style.cursor = 'wait';

            try {
                const promises = missingItems.map(async (item) => {
                    let category = item.category || item.label; // Handle both formats just in case

                    let reqText;
                    if (geminiClient) {
                        reqText = await geminiClient.generateRequirement(category, contextText);
                    } else {
                        reqText = item.template || "Security requirement missing.";
                    }

                    return {
                        category: category.replace('missing_', ''),
                        description: reqText,
                        confidence: item.score || 0.9
                    };
                });

                const results = await Promise.all(promises);
                requirements.push(...results);

                const modal = createRequirementsModal(
                    requirements,
                    (textToInject) => {
                        injectText(target, textToInject);
                    },
                    geminiClient ? geminiClient.isConfigured() : false
                );

                document.body.appendChild(modal);

            } catch (e) {
                console.error("Error generating requirements", e);
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

        function injectText(target, text) {
            target.focus();
            if (document.execCommand('insertText', false, '\n\n' + text)) {
                return;
            }
            // Fallback
            if (target.tagName === 'TEXTAREA') {
                target.value += '\n\n' + text;
            } else {
                target.innerText += '\n\n' + text;
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
