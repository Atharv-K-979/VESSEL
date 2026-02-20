import * as ort from './onnxruntime-web.min.js'; // Assuming local library or solved via bundler

export class MLEngine {
    constructor() {
        this.session = null;
        this.featureExtractor = null;
        this.technicalKeywords = {
            'api': ['api', 'endpoint', 'rest', 'graphql', 'soap', 'route'],
            'database': ['db', 'database', 'sql', 'nosql', 'mongodb', 'postgres', 'mysql', 'store', 'query'],
            'auth': ['login', 'user', 'password', 'auth', 'credential', 'token', 'jwt', 'session', 'sign in', 'signup'],
            'payment': ['credit', 'card', 'payment', 'stripe', 'paypal', 'money', 'transaction', 'billing'],
            'file': ['upload', 'file', 'image', 'picture', 'document', 'pdf', 'csv', 'download'],
            'admin': ['admin', 'dashboard', 'settings', 'config', 'manage', 'delete', 'update', 'edit'],
            'data': ['data', 'analytics', 'report', 'stats', 'profile', 'email', 'phone', 'address']
        };
    }

    async initialize() {
        try {
            const modelUrl = chrome.runtime.getURL('models/requirement-model.onnx');
            this.session = await ort.InferenceSession.create(modelUrl);
            console.log('ML Engine initialized with ONNX model');
            return true;
        } catch (error) {
            console.error('Failed to load ONNX model:', error);
            return false;
        }
    }

    async classify(text, labels) {
        if (!this.session) {
            console.warn('Model not loaded, using fallback');
            return this.fallbackClassify(text, labels);
        }

        try {
            const features = await this.extractFeatures(text);
            const inputTensor = new ort.Tensor('float32', Float32Array.from(features), [1, features.length]);
            const outputs = await this.session.run({ input: inputTensor });
            const scores = outputs.output.data;
            const results = [];
            for (let i = 0; i < labels.length; i++) {
                results.push({
                    label: labels[i],
                    score: scores[i]
                });
            }

            return results;
        } catch (e) {
            console.error("Inference failed", e);
            return this.fallbackClassify(text, labels);
        }
    }

    async extractFeatures(text) {
        const technicalFeatures = this.extractTechnicalIndicators(text);
        const embeddingFeatures = new Array(768).fill(0);
        return [...embeddingFeatures, ...technicalFeatures];
    }

    extractTechnicalIndicators(text) {
        const lower = text.toLowerCase();
        const features = [];

        // 1. Keyword cnt
        for (let [category, keywords] of Object.entries(this.technicalKeywords)) {
            let count = 0;
            for (let kw of keywords) {
                if (lower.includes(kw)) count++;
            }
            features.push(count);
            features.push(count > 0 ? 1 : 0);
        }

        // 2. Text stats
        features.push(text.length / 1000); 
        features.push(text.split(/\s+/).length / 100); 

        // 3. Specific indicators
        features.push(lower.includes('http') ? 1 : 0);
        features.push((/\d/).test(text) ? 1 : 0);

        return features;
    }

    fallbackClassify(text, labels) {
        console.log("Using fallback classification");
        return labels.map(label => ({
            label: label,
            score: text.toLowerCase().includes(label) ? 0.8 : 0.1
        }));
    }
}
