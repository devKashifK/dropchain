export function chunkText(text: string, chunkSize: number = 150, overlap: number = 20): string[] {
    // Normalize whitespace
    const cleaned = text.replace(/\s+/g, ' ').trim();
    const words = cleaned.split(' ');
    const chunks: string[] = [];

    let i = 0;
    while (i < words.length) {
        const chunk = words.slice(i, i + chunkSize).join(' ');
        chunks.push(chunk);

        // Move forward by chunkSize minus overlap
        i += chunkSize - overlap;

        // If the next chunk would be the same as the last, stop
        if (i >= words.length) break;
    }

    return chunks;
}
