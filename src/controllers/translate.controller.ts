import { Request, Response } from "express";

/**
 * Translates a single text string from source to target language
 */
export async function translateSingle(text: string, sl: string = "en", tl: string = "bn"): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";

  // If text is pure digits or symbols or very short, return as is
  if (/^[\d\s\-_.,#%+/\\()[\]]+$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=${sl}|${tl}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      throw new Error(`Translation API error: HTTP ${res.status}`);
    }

    const data: any = await res.json();
    if (data?.responseData?.translatedText) {
      let result = data.responseData.translatedText;
      // MyMemory sometimes includes HTML entities like &#39;
      result = result
        .replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
      return result;
    }
    return trimmed;
  } catch (err: any) {
    console.warn(`Translation error for "${trimmed.slice(0, 30)}...":`, err.message);
    return trimmed;
  }
}

/**
 * Batch translates an array of texts with concurrency limit
 */
export async function translateBatch(texts: string[], sl: string = "en", tl: string = "bn"): Promise<string[]> {
  const results: string[] = [];
  // Process in small batches of 3 to prevent rate-limiting
  const batchSize = 3;
  for (let i = 0; i < texts.length; i += batchSize) {
    const chunk = texts.slice(i, i + batchSize);
    const chunkResults = await Promise.all(chunk.map((t) => translateSingle(t, sl, tl)));
    results.push(...chunkResults);
    if (i + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  return results;
}

/**
 * API Controller: POST /api/translate
 * Supports { text, texts, fields, sl, tl }
 */
export const translateHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, texts, fields, sl = "en", tl = "bn" } = req.body;

    let translatedText: string | undefined = undefined;
    let translatedTexts: string[] | undefined = undefined;
    let translatedFields: Record<string, any> | undefined = undefined;

    if (typeof text === "string") {
      translatedText = await translateSingle(text, sl, tl);
    }

    if (Array.isArray(texts)) {
      translatedTexts = await translateBatch(texts, sl, tl);
    }

    if (fields && typeof fields === "object") {
      translatedFields = {};
      for (const [key, val] of Object.entries(fields)) {
        if (typeof val === "string") {
          translatedFields[key] = await translateSingle(val, sl, tl);
        } else if (Array.isArray(val)) {
          translatedFields[key] = await translateBatch(val.filter((x): x is string => typeof x === "string"), sl, tl);
        } else {
          translatedFields[key] = val;
        }
      }
    }

    res.json({
      status: "success",
      data: {
        translatedText,
        translatedTexts,
        translatedFields,
      },
    });
  } catch (error: any) {
    console.error("Translation Controller Error:", error);
    res.status(500).json({
      status: "error",
      message: "Translation failed",
      error: error.message,
    });
  }
};
