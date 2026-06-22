import { Router, type Request, type Response } from "express";

const router = Router();

let cachedWorker: unknown = null;

async function getWorker() {
  if (!cachedWorker) {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("fra");
    cachedWorker = worker;
    return worker;
  }
  return cachedWorker as Awaited<ReturnType<typeof import("tesseract.js").createWorker>>;
}

async function extractWithOpenAIVision(
  imageBase64: string,
  mimeType: string,
): Promise<string[]> {
  const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!baseUrl || !apiKey) throw new Error("OpenAI integration not configured");

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Tu analyses une feuille de dictée scolaire française. Extrais uniquement les mots de vocabulaire ou de dictée présents sur cette image. Retourne SEULEMENT les mots séparés par des espaces, sans numéros, sans ponctuation, sans explication. Uniquement les mots.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
      max_completion_tokens: 300,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI Vision error ${response.status}: ${err}`);
  }

  const json = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content ?? "";

  return text
    .split(/[\s,;.!?«»"'()\[\]{}<>\/\\]+/)
    .map((w: string) => w.trim().toLowerCase())
    .filter((w: string) => w.length >= 2 && /^[a-zA-ZÀ-ÿ'-]+$/.test(w));
}

async function extractWithTesseract(imageBase64: string): Promise<string[]> {
  const imageBuffer = Buffer.from(imageBase64, "base64");
  const worker = await getWorker();
  const { data } = await worker.recognize(imageBuffer);
  const rawText: string = (data as { text: string }).text ?? "";

  return rawText
    .split(/[\n\r\s,;.!?«»"'()\[\]{}<>\d/\\]+/)
    .map((w: string) => w.trim().toLowerCase())
    .filter((w: string) => w.length >= 2 && /^[a-zA-ZÀ-ÿ'-]+$/.test(w));
}

function dedupeWords(words: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const w of words) {
    if (!seen.has(w)) {
      seen.add(w);
      result.push(w);
    }
  }
  return result;
}

router.post("/dictee/ocr", async (req: Request, res: Response) => {
  try {
    const { image, mimeType = "image/jpeg" } = req.body as {
      image?: string;
      mimeType?: string;
    };

    if (!image || typeof image !== "string") {
      res.status(400).json({ error: "Champ 'image' (base64) requis" });
      return;
    }

    let mots: string[];

    try {
      mots = await extractWithOpenAIVision(image, mimeType);
      console.log(`OCR via OpenAI Vision: ${mots.length} mots trouvés`);
    } catch (openaiErr) {
      console.warn(
        "OpenAI Vision indisponible, fallback tesseract.js:",
        (openaiErr as Error).message,
      );
      mots = await extractWithTesseract(image);
      console.log(`OCR via tesseract.js: ${mots.length} mots trouvés`);
    }

    res.json({ mots: dedupeWords(mots) });
  } catch (error) {
    console.error("OCR error:", error);
    res.status(500).json({ error: "Erreur lors de l'analyse de l'image" });
  }
});

export default router;
