class GeminiClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    }

    isConfigured() {
        return !!this.apiKey;
    }

    async generateRequirements(specText) {
        if (!this.apiKey) {
            console.warn("Gemini API key not set, using default requirements.");
            return this.getDefaultRequirements();
        }

        const prompt = this.buildPrompt(specText);

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
                        maxOutputTokens: 500
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

            const outputText = data.candidates[0].content.parts[0].text;
            return this.parseBulletPoints(outputText);
        } catch (error) {
            console.error('Gemini API request failed:', error);
            return this.getDefaultRequirements(); // Fallback
        }
    }

    buildPrompt(context) {
        return `You are an expert security architect. Given the following software feature specification, list the missing security requirements (if any) in bullet points. Focus on authentication, authorization, encryption, input validation, audit logging, and rate limiting. Be specific to the context. Do not output anything other than the bulleted list.

Specification: "${context}"

Missing security requirements:`;
    }

    parseBulletPoints(text) {
        // Extract bullet points from the model's output
        return text
            .split('\n')
            .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
            .map(line => line.replace(/^[-*]\s*/, '').trim())
            .filter(line => line.length > 0);
    }

    getDefaultRequirements() {
        return [
            'The system must enforce authentication for all sensitive operations.',
            'Access control lists must be checked to ensure users can only access their own data.',
            'All sensitive data must be encrypted at rest and in transit.',
            'All user inputs must be validated against strict allowlists.',
            'All security-critical events must be logged with user ID, timestamp, and source IP.',
            'API endpoints must implement rate limiting to prevent abuse.'
        ];
    }
}

export default GeminiClient;
