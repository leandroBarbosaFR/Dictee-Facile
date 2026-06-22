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

router.post("/dictee/ocr", async (req: Request, res: Response) => {
  try {
    const { image } = req.body as { image?: string; mimeType?: string };

    if (!image || typeof image !== "string") {
      res.status(400).json({ error: "Champ 'image' (base64) requis" });
      return;
    }

    const imageBuffer = Buffer.from(image, "base64");
    const worker = await getWorker();
    const { data } = await worker.recognize(imageBuffer);
    const rawText: string = (data as { text: string }).text ?? "";

    const mots = rawText
      .split(/[\n\r\s,;.!?«»"'()\[\]{}<>\d/\\]+/)
      .map((w: string) => w.trim().toLowerCase())
      .filter((w: string) => w.length >= 2 && /^[a-zA-ZÀ-ÿ'-]+$/.test(w));

    const seen = new Set<string>();
    const unique: string[] = [];
    for (const w of mots) {
      if (!seen.has(w)) {
        seen.add(w);
        unique.push(w);
      }
    }

    res.json({ mots: unique });
  } catch (error) {
    console.error("OCR error:", error);
    res.status(500).json({ error: "Erreur lors de l'analyse de l'image" });
  }
});

export default router;
