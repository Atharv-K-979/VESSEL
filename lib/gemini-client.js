class GeminiClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    }

    isConfigured() {
        return !!this.apiKey;
    }

    async generateRequirement(category, context) {
        if (!this.apiKey) {
            console.warn("Gemini API key not set, using default requirement.");
            return this.getDefaultRequirement(category);
        }

        const prompt = this.buildPrompt(category, context);

        try {
            const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.3,
                        maxOutputTokens: 200
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error.message);
            }

            if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
                throw new Error('Invalid Gemini API response format');
            }

            return data.candidates[0].content.parts[0].text;
        } catch (error) {
            console.error('Gemini API request failed:', error);
            return this.getDefaultRequirement(category); // Fallback
        }
    }

    buildPrompt(category, context) {
        const mappedCategory = category.replace('missing_', '').toLowerCase();

        let templateKey = mappedCategory;
        if (mappedCategory === 'auth') templateKey = 'authentication';
        if (mappedCategory === 'authz') templateKey = 'authorization';
        if (mappedCategory === 'validation') templateKey = 'inputValidation';
        if (mappedCategory === 'audit') templateKey = 'auditLogging';
        if (mappedCategory === 'ratelimit') templateKey = 'rateLimiting';

        const templates = {
            authentication: `Based on this software requirement: "${context}"
        Generate a specific, actionable authentication requirement. Include:
        - What needs to be authenticated
        - Authentication method (JWT, OAuth, etc.) if applicable
        - Any specific security considerations
        Keep it concise (1-2 sentences).`,

            authorization: `Based on this software requirement: "${context}"
        Generate a specific, actionable authorization requirement. Include:
        - Access control model (RBAC, ACL, etc.)
        - What resources need protection
        - Principle of least privilege considerations
        Keep it concise (1-2 sentences).`,

            encryption: `Based on this software requirement: "${context}"
        Generate a specific, actionable encryption requirement. Include:
        - Data at rest encryption
        - Data in transit encryption (TLS)
        - Key management considerations
        Keep it concise (1-2 sentences).`,

            inputValidation: `Based on this software requirement: "${context}"
        Generate a specific, actionable input validation requirement. Include:
        - What inputs need validation
        - Validation approach (allowlist, sanitization)
        - Specific attack vectors to prevent (XSS, SQLi)
        Keep it concise (1-2 sentences).`,

            auditLogging: `Based on this software requirement: "${context}"
        Generate a specific, actionable audit logging requirement. Include:
        - What events to log
        - What information to include
        - Retention and protection considerations
        Keep it concise (1-2 sentences).`,

            rateLimiting: `Based on this software requirement: "${context}"
        Generate a specific, actionable rate limiting requirement. Include:
        - What endpoints need limiting
        - Appropriate limits based on context
        - How to handle violations
        Keep it concise (1-2 sentences).`
        };

        return templates[templateKey] || `Generate a security requirement for ${category} based on: "${context}"`;
    }

    getDefaultRequirement(category) {
        const mappedCategory = category.replace('missing_', '').toLowerCase();
        let key = mappedCategory;
        if (mappedCategory === 'auth') key = 'authentication';
        if (mappedCategory === 'authz') key = 'authorization';
        if (mappedCategory === 'validation') key = 'inputValidation';
        if (mappedCategory === 'audit') key = 'auditLogging';
        if (mappedCategory === 'ratelimit') key = 'rateLimiting';

        const defaults = {
            authentication: 'The system must enforce authentication for all sensitive operations.',
            authorization: 'Access control lists must be checked to ensure users can only access their own data.',
            encryption: 'All sensitive data must be encrypted at rest and in transit.',
            inputValidation: 'All user inputs must be validated against strict allowlists.',
            auditLogging: 'All security-critical events must be logged with user ID, timestamp, and source IP.',
            rateLimiting: 'API endpoints must implement rate limiting to prevent abuse.'
        };
        return defaults[key] || `Missing ${category} requirement.`;
    }
}

export default GeminiClient;
