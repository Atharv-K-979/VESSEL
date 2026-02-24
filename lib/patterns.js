
function luhnCheck(value) {
    const digits = value.replace(/\D/g, '');

    if (!digits) return false;

    let sum = 0;
    let shouldDouble = false;

    for (let i = digits.length - 1; i >= 0; i--) {
        let digit = parseInt(digits.charAt(i));

        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }

        sum += digit;
        shouldDouble = !shouldDouble;
    }
    return (sum % 10) === 0;
}

export const patterns = [
    {
        name: "Credit Card Number",
        regex: /\b(?:\d[ -]*?){13,19}\b/g,
        validate: (match) => {
            const digits = match.replace(/\D/g, '');
            if (digits.length < 13 || digits.length > 19) return false;
            return luhnCheck(digits);
        }
    },
    {
        name: "AWS Access Key",
        regex: /\b(AKIA|ASIA)[0-9A-Z]{16}\b/g
    },
    {
        name: "Private Key Header",
        regex: /-----BEGIN [A-Z ]+ PRIVATE KEY-----/g
    },
    {
        name: "Email Address",
        regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
    },
    {
        name: "Phone Number",
        regex: /\b(?:\+?\d{1,3}[- ]?)?\(?\d{3}\)?[- ]?\d{3}[- ]?\d{4}\b/g
    },
    {
        name: "Aadhaar Number (India)",
        regex: /\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g,
        validate: (match) => {
            const digits = match.replace(/\D/g, '');
            return digits.length === 12;
        }
    },
    {
        name: "PAN Card (India)",
        regex: /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g
    },
    {
        name: "IP Address (IPv4)",
        regex: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g
    },
    {
        name: "Social Security Number (US)",
        regex: /\b\d{3}-\d{2}-\d{4}\b/g
    },
    {
        name: "Generic Credential / Password",
        regex: /(?i)(password|passwd|pwd|api[-_]?key|secret|token|credentials)[\s]*[:=][\s]*["']?([^\s"']{8,})["']?/ig
    }
];

/**
 * Replaces sensitive data with 'X' characters, preserving format.
 * @param {string} text - The original text.
 * @param {Array} matches - Array of match objects with { index, 0: matchString } properties (output from regex.exec or similar).
 * @returns {string} - The redacted text.
 */
export function redact(text, matches) {
    if (!matches || matches.length === 0) return text;
    let mask = new Array(text.length).fill(false);

    for (const match of matches) {
        const start = match.index;
        const end = start + match[0].length;
        for (let i = start; i < end; i++) {
            mask[i] = true;
        }
    }

    let result = '';
    for (let i = 0; i < text.length; i++) {
        if (mask[i]) {
            const char = text[i];
            if (/[\d\w]/.test(char)) {
                result += 'X';
            } else {
                result += char;
            }
        } else {
            result += text[i];
        }
    }
    return result;
}
