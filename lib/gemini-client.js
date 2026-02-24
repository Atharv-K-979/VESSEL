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
        return `You are a Senior Cloud Security Architect. A developer is planning a new feature. Here is their exact architectural plan: '${context}'.
Analyze THIS SPECIFIC PLAN. Identify the specific vulnerabilities in their text, and provide 3 to 5 highly specific, actionable security requirements to fix them. Do not give generic advice. Focus ONLY on the technologies they mentioned. 
CRITICAL OUTPUT INSTRUCTION: You MUST output YOUR response as a simple bulleted list where each line starts with a hyphen (-). Do not output any introductory or concluding text, numbered lists, or paragraphs.`;
    }

    parseBulletPoints(text) {
        // More robust bullet point extraction to catch -, *, or numbered lists just in case
        return text
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 5) // Skip empty/tiny lines
            .map(line => line.replace(/^([-\*]|\d+\.)\s*/, '').trim()) // Remove -, *, or 1. prefixes
            .filter(line => !line.toLowerCase().includes('here are the')) // Filter conversational fluff
            .filter(line => !line.toLowerCase().includes('specific vulnerabilities:'));
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
