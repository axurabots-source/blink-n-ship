import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export type ExtractedOrder = {
    customer_name: string;
    phone_number: string;
    address: string;
    city: string;
    product_info: string;
    quantity: number;
};

// Paste kiye gaye text (WhatsApp messages, etc) se ek ya zyada orders nikalta hai.
export async function extractOrders(rawText: string): Promise<ExtractedOrder[]> {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You extract order details from messy, informal text (often Urdu/English mixed, WhatsApp-style) sent by Pakistani online sellers' customers.

Input may contain ONE or MULTIPLE orders separated by blank lines, dashes, or just stacked one after another.

For EACH order found, extract:
- customer_name
- phone_number (normalize to digits only, keep leading 0 if present)
- address
- city
- product_info (whatever product/variant description is given, in the customer's own words)
- quantity (integer, default 1 if not stated)

Return ONLY valid JSON, no markdown, no commentary, in this exact shape:
{"orders": [{"customer_name": "...", "phone_number": "...", "address": "...", "city": "...", "product_info": "...", "quantity": 1}]}

If a field is missing or unclear, use an empty string "" (or 1 for quantity). Do not invent information that isn't in the text.

TEXT TO EXTRACT FROM:
"""
${rawText}
"""`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    const cleaned = responseText.replace(/^```json\s*|```$/g, '').trim();

    let parsed: { orders: ExtractedOrder[] };
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        throw new Error('AI did not return valid JSON: ' + responseText.slice(0, 200));
    }

    return parsed.orders || [];
}