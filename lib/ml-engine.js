export class MLEngine {
    constructor() {
        this.engineType = 'mock';
        this.models = {};
        this.isInitialized = false;
    }
    async initialize() {
        if (this.isInitialized) return;

        try {
            if (typeof browser !== 'undefined' && browser.trial && browser.trial.ml) {
                console.log('[MLEngine] Detected Firefox Experimental ML');
                this.engineType = 'firefox';
            } else if (typeof window !== 'undefined' && (window.pipeline || window.transformers)) {
                console.log('[MLEngine] Detected Transformers.js');
                this.engineType = 'transformers';
            } else {
                console.log('[MLEngine] No ML backend detected. Using Mock Engine.');
                this.engineType = 'mock';
            }
        } catch (e) {
            console.error('[MLEngine] Initialization failed:', e);
            this.engineType = 'mock';
        }

        this.isInitialized = true;
    }

    /**
     * Zero-shot classification.
     * @param {string} text - Text to classify.
     * @param {string[]} labels - valid labels.
     * @returns {Promise<{label: string, score: number}[]>}
     */
    async classify(text, labels) {
        if (!this.isInitialized) await this.initialize();

        if (this.engineType === 'mock') {
            return this._mockClassify(text, labels);
        }

        // TODO: Implement actual inference
        // For now, fall back to mock to keep the extension runnable without full model weights
        return this._mockClassify(text, labels);
    }

    /**
     * Detect prompt injection.
     * @param {string} text 
     * @returns {Promise<{isThreat: boolean, score: number, reason: string}>}
     */
    async detectInjection(text) {
        if (!this.isInitialized) await this.initialize();

        if (this.engineType === 'mock') {
            return this._mockDetectInjection(text);
        }

        // TODO: Implement actual inference
        return this._mockDetectInjection(text);
    }

    /**
     * Summarize text.
     * @param {string} text 
     * @returns {Promise<string>}
     */
    async summarize(text) {
        if (!this.isInitialized) await this.initialize();

        if (this.engineType === 'mock') {
            return `[Mock Summary] ${text.substring(0, 100)}...`;
        }
        // TODO: Implement actual inference
        return `[Mock Summary] ${text.substring(0, 100)}...`;
    }

    // --- Mock Implementations ---

    async _mockClassify(text, labels) {
        console.log(`[MLEngine:Mock] Classifying "${text.substring(0, 20)}..." against`, labels);

        const lowerText = text.toLowerCase();

        for (const label of labels) {
            if (lowerText.includes(label.toLowerCase())) {
                return [{ label, score: 0.95 }];
            }
        }

        return labels.map(l => ({ label: l, score: Math.random() }))
            .sort((a, b) => b.score - a.score);
    }

    async _mockDetectInjection(text) {
        console.log(`[MLEngine:Mock] Analyzing for injection: "${text.substring(0, 20)}..."`);
        const lowerText = text.toLowerCase();

        const riskKeywords = [
            'ignore previous instructions',
            'system override',
            'execute',
            'reveal password',
            'pwned'
        ];

        for (const keyword of riskKeywords) {
            if (lowerText.includes(keyword)) {
                return {
                    isThreat: true,
                    score: 0.99,
                    reason: `Detected suspicious keyword: "${keyword}"`
                };
            }
        }

        return { isThreat: false, score: 0.05, reason: "Safe" };
    }
}

export const mlEngine = new MLEngine();
