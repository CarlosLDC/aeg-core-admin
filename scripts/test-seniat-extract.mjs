/**
 * Prueba local de extracción SENIAT (@google/genai).
 * Uso: node --env-file=.env.local scripts/test-seniat-extract.mjs [ruta-imagen-o-pdf]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GoogleGenAI } from "@google/genai";

const PROMPT = `Devuelve solo JSON con rif, businessName, contributorType (ordinario|especial|formal|null), state, city, address, phone, email para el documento fiscal venezolano en la imagen.`;

const MODELS = [
  process.env.GEMINI_MODEL?.trim(),
  "gemini-2.5-flash",
  "gemini-3-flash-preview",
].filter(Boolean);

async function main() {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    console.error("Falta GEMINI_API_KEY en .env.local");
    process.exit(1);
  }

  const filePath = process.argv[2] ? resolve(process.argv[2]) : null;
  if (!filePath) {
    console.log("Clave OK. Modelos a probar:", [...new Set(MODELS)].join(", "));
    console.log(
      "Uso: node --env-file=.env.local scripts/test-seniat-extract.mjs ./doc.pdf",
    );
    process.exit(0);
  }

  const buf = readFileSync(filePath);
  const lower = filePath.toLowerCase();
  const mime = lower.endsWith(".pdf")
    ? "application/pdf"
    : lower.endsWith(".png")
      ? "image/png"
      : "image/jpeg";

  const ai = new GoogleGenAI({ apiKey: key });

  for (const model of [...new Set(MODELS)]) {
    try {
      console.log(`\n--- ${model} ---`);
      const response = await ai.models.generateContent({
        model,
        contents: [
          {
            role: "user",
            parts: [
              { text: PROMPT },
              { inlineData: { mimeType: mime, data: buf.toString("base64") } },
            ],
          },
        ],
        config: { responseMimeType: "application/json", temperature: 0.1 },
      });
      console.log(response.text);
      process.exit(0);
    } catch (err) {
      console.error(`Error (${model}):`, err.message?.slice(0, 200) ?? err);
    }
  }
  process.exit(1);
}

main();
