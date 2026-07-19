import { OcrResult } from "../types";

export interface TranslateTextParams {
  text: string;
  sourceLang?: string;
  targetLang?: string;
  customInstructions?: string;
  engine?: "direct";
  signal?: AbortSignal;
}

export interface TranslatePdfParams {
  pdfBase64: string;
  pageInstructions?: string;
  sourceLang?: string;
  targetLang?: string;
  customInstructions?: string;
  engine?: "direct";
  signal?: AbortSignal;
}

export interface OcrTranslateParams {
  imageBase64: string;
  mimeType?: string;
  targetLang?: string;
  signal?: AbortSignal;
}

export async function translateText({
  text,
  sourceLang = "",
  targetLang = "English",
  customInstructions = "",
  engine = "direct",
  signal,
}: TranslateTextParams): Promise<string> {
  const response = await fetch("/api/translate-text", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text, sourceLang, targetLang, customInstructions, engine }),
    signal,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `Translation request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.translatedText;
}

export async function translatePdf({
  pdfBase64,
  pageInstructions = "",
  sourceLang = "",
  targetLang = "English",
  customInstructions = "",
  engine = "direct",
  signal,
}: TranslatePdfParams): Promise<string> {
  const response = await fetch("/api/translate-pdf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pdfBase64, pageInstructions, sourceLang, targetLang, customInstructions, engine }),
    signal,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `PDF Translation request failed with status ${response.status}`);
  }

  const data = await response.json();
  return data.translatedText;
}

export async function ocrTranslate({
  imageBase64,
  mimeType = "image/png",
  targetLang = "English",
  signal,
}: OcrTranslateParams): Promise<{ originalText: string; translatedText: string }> {
  const response = await fetch("/api/ocr-translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ imageBase64, mimeType, targetLang }),
    signal,
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || `OCR Request failed with status ${response.status}`);
  }

  return response.json();
}
