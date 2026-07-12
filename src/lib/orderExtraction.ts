import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

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
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: SchemaType.OBJECT,
                properties: {
                    orders: {
                        type: SchemaType.ARRAY,
                        description: 'List of all orders extracted from the text',
                        items: {
                            type: SchemaType.OBJECT,
                            properties: {
                                customer_name: { type: SchemaType.STRING },
                                phone_number: { type: SchemaType.STRING, description: 'Digits only, keeping leading 0' },
                                address: { type: SchemaType.STRING },
                                city: { type: SchemaType.STRING },
                                product_info: { type: SchemaType.STRING, description: 'Product description or variant details' },
                                quantity: { type: SchemaType.INTEGER, description: 'Quantity (default to 1)' }
                            },
                            required: ['customer_name', 'phone_number', 'address', 'city', 'product_info', 'quantity']
                        }
                    }
                },
                required: ['orders']
            }
        }
    });

    const prompt = `Extract order details from this informal text (Urdu/English WhatsApp style).
If multiple orders are listed, extract each one.
If a field is missing, use empty string "".

TEXT TO EXTRACT FROM:
"""
${rawText}
"""`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    let parsed: { orders: ExtractedOrder[] };
    try {
        parsed = JSON.parse(responseText);
    } catch {
        throw new Error('AI did not return valid JSON: ' + responseText.slice(0, 200));
    }

    return parsed.orders || [];
}