export type BookType = "pdf" | "txt" | "epub" | "image";

export interface BookFile {
  id: string;
  name: string;
  size: number;
  type: BookType;
  base64Data?: string; // used for PDF and images
  rawText?: string;    // used for TXT
  chapters?: EpubChapter[]; // used for EPUB
  currentPageRange?: string; // used for PDF (e.g. "Pages 1-5")
  dateUploaded: string;
}

export interface EpubChapter {
  id: string;
  title: string;
  filePath: string;
  content: string; // HTML or plain text
  translatedText?: string;
}

export interface TranslationHistoryItem {
  id: string;
  bookId: string;
  bookName: string;
  bookType: BookType;
  sectionIdentifier: string; // e.g. "Chapter 2" or "Pages 1-5" or "Image OCR"
  originalContent?: string;
  translatedContent: string;
  timestamp: string;
}

export interface OcrResult {
  imageUrl: string;
  originalText: string;
  translatedText: string;
}
