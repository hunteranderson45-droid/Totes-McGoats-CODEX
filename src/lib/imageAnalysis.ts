import type { Item } from './validation';

interface AnalyzeOptions {
  signal?: AbortSignal;
}

export async function analyzeImage(
  imageData: string,
  mediaType: string,
  options?: AnalyzeOptions
): Promise<Item[]> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('Please set VITE_ANTHROPIC_API_KEY in your .env file');
  }

  const callAnthropic = async (
    messages: Array<{
      role: string;
      content: Array<{
        type: string;
        text?: string;
        source?: { type: string; media_type: string; data: string };
      }>;
    }>
  ) => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages,
      }),
      signal: options?.signal,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || JSON.stringify(data));
    }
    return data;
  };

  const extractJson = (data: unknown) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response payload');
    }
    const content = Array.isArray((data as { content?: unknown }).content)
      ? (data as { content: Array<{ type?: unknown; text?: unknown }> }).content
      : [];
    const textBlock = content.find(
      (block) => block && typeof block === 'object' && (block as { type?: unknown }).type === 'text'
    );
    const textContent =
      typeof (textBlock as { text?: unknown })?.text === 'string'
        ? (textBlock as { text: string }).text
        : '';
    const cleanedText = textContent.replace(/```json|```/g, '').trim();
    return JSON.parse(cleanedText);
  };

  const firstData = await callAnthropic([
    {
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: mediaType,
            data: imageData,
          },
        },
        {
          type: 'text',
          text: `You are cataloging items for a home storage inventory system. Look at this image and identify EVERY distinct physical object/item. Ignore the background, floor, table, or surface they're on.

Be precise and conservative:
- If you are unsure, use a generic description (e.g., "black plastic container") rather than guessing a brand or model.
- Do not invent text, brand names, or sizes that are not clearly visible.

For each item, provide:
1. A SHORT but SPECIFIC description (under 10 words) that someone would recognize, like:
   - "Blue Nike running shoes size 10"
   - "Black & Decker cordless drill"
   - "Red KitchenAid stand mixer"
   - "Box of assorted Christmas lights"
   - "Infant car seat - Graco gray"

2. MANY searchable tags (12-24) that someone might type when looking for this item later:
   - Exact item name and synonyms (drill, power drill, cordless drill)
   - Brand only if clearly visible
   - Colors and patterns
   - Category (tools, kitchen, baby, sports, holiday, electronics, clothing, toys, etc.)
   - Material (plastic, metal, fabric, wood, glass)
   - Size descriptors if clearly visible (small, large, infant, adult)
   - Season/holiday if applicable (christmas, halloween, winter, summer)
   - Room it might belong in (garage, kitchen, nursery, closet)
   - Use or function (cooking, cleaning, storage, decoration)

Self-check before finalizing:
- Verify each item is distinct (not duplicates).
- Replace any uncertain brand/model with a neutral description.
- Ensure tags are relevant, non-redundant, and all lowercase.

Return ONLY valid JSON: {"items": [{"description": "short item description", "tags": ["tag1", "tag2", "tag3", ...]}]}`,
        },
      ],
    },
  ]);

  const parsedFirst = extractJson(firstData);
  const firstItems = parsedFirst.items || [];

  try {
    const reviewPayload = JSON.stringify({ items: firstItems });
    const reviewData = await callAnthropic([
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `Second pass: review this JSON for accuracy. Remove uncertain brands/sizes, deduplicate items and tags, and ensure tags are relevant and lowercase. Return ONLY valid JSON.\n\n${reviewPayload}`,
          },
        ],
      },
    ]);

    const parsedReview = extractJson(reviewData);
    return parsedReview.items || firstItems;
  } catch (error) {
    console.error('Second pass failed, using first pass:', error);
    return firstItems;
  }
}
