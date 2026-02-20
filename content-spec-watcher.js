(async () => {
    try {
        const mlEngineSrc = chrome.runtime.getURL('lib/ml-engine.js');
        const geminiClientSrc = chrome.runtime.getURL('lib/gemini-client.js');
        const uiUtilsSrc = chrome.runtime.getURL('lib/ui-utils.js');

        const [
            { MLEngine },
            { default: GeminiClient },
            { createBadge, createRequirementsModal }
        ] = await Promise.all([
            import(mlEngineSrc),
            import(geminiClientSrc),
            import(uiUtilsSrc)
        ]);

        let mlEngine = new MLEngine();
        let geminiClient = null;
        let activeBadge = null;
        let typingTimer = null;
        const ANALYSIS_DELAY = 1500; // Wait 1.5s after typing stops

        await mlEngine.initialize();

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

            if (!text || text.length < 20 || !containsTechnicalTerms(text)) {
                hideBadge();
                return;
            }

            const categories = [
                'missing_auth',
                'missing_authz',
                'missing_encryption',
                'missing_validation',
                'missing_audit',
                'missing_ratelimit'
            ];

            const results = await mlEngine.classify(text, categories);

            const missing = results.filter(r => r.score > 0.5);

            if (missing.length === 0) {
                hideBadge();
                return;
            }

            showBadge(target, missing.length, async () => {
                await showRequirementsUI(target, text, missing);
            });
        }

        async function showRequirementsUI(target, contextText, missingItems) {

            const requirements = [];

            document.body.style.cursor = 'wait';

            try {
                const promises = missingItems.map(async (item) => {
                    let category = item.label; // e.g. missing_auth

                    let reqText;
                    if (geminiClient) {
                        reqText = await geminiClient.generateRequirement(category, contextText);
                    } else {
                        reqText = "Authentication is required.";
                    }

                    return {
                        category: category.replace('missing_', ''),
                        description: reqText,
                        confidence: item.score
                    };
                });

                const results = await Promise.all(promises);
                requirements.push(...results);

                const modal = createRequirementsModal(requirements, (textToInject) => {
                    injectText(target, textToInject);
                });

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
