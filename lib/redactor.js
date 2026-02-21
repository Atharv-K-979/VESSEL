export function redactText(text, matches) {
    if (!matches || matches.length === 0) return text;

    let mask = new Array(text.length).fill(false);

    for (const match of matches) {
        const start = match.index;
        const length = match.length !== undefined ? match.length : (match[0] ? match[0].length : match.value.length);
        const end = start + length;

        for (let i = start; i < end; i++) {
            if (i >= 0 && i < mask.length) {
                mask[i] = true;
            }
        }
    }

    let result = '';
    for (let i = 0; i < text.length; i++) {
        if (mask[i]) {
            const char = text[i];
            // Redact alphanumeric characters with 'X'
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
