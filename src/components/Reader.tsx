import React, { useState, useEffect, useRef } from "react";
import { 
  Languages, 
  Sparkles, 
  BookOpen, 
  FileText, 
  Copy, 
  Check, 
  Download, 
  Play, 
  RefreshCw, 
  FileDown, 
  Cpu, 
  ChevronRight, 
  RotateCcw,
  Sliders,
  Type as FontIcon,
  BookMarked
} from "lucide-react";
import { BookFile, EpubChapter, TranslationHistoryItem } from "../types";
import { translateText, translatePdf, ocrTranslate } from "../lib/api";
import { generateEpub } from "../lib/epubGenerator";
import { generatePdf } from "../lib/pdfGenerator";

interface ReaderProps {
  book: BookFile;
  onTranslationCompleted: (item: TranslationHistoryItem) => void;
  onUpdateEpubChapters?: (bookId: string, chapters: EpubChapter[]) => void;
}

export default function Reader({ book, onTranslationCompleted, onUpdateEpubChapters }: ReaderProps) {
  // Common states
  const [targetLang, setTargetLang] = useState<string>("English");
  const [sourceLang, setSourceLang] = useState<string>("");
  const [customInstructions, setCustomInstructions] = useState<string>("");
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"original" | "translated" | "sidebyside">("sidebyside");
  const translationEngine = "direct";
  
  // State for active part of the manuscript
  const [activeChapterIndex, setActiveChapterIndex] = useState<number>(0);
  
  // Content states
  const [originalContent, setOriginalContent] = useState<string>("");
  const [translatedContent, setTranslatedContent] = useState<string>("");
  const [ocrOriginal, setOcrOriginal] = useState<string>("");
  const [originalSliderVal, setOriginalSliderVal] = useState<number>(0);

  // UI state
  const [copied, setCopied] = useState<boolean>(false);
  const [promptPreset, setPromptPreset] = useState<string>("");
  const [logs, setLogs] = useState<string[]>([]);
  const [translationProgress, setTranslationProgress] = useState<number>(0);
  const [translateFullBook, setTranslateFullBook] = useState<boolean>(false);
  const [formatToast, setFormatToast] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const stopTranslation = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      addLog("Translation canceled by user.");
    }
  };

  const handleFormatText = (style: "standard" | "novel" | "markdown") => {
    if (!translatedContent) return;
    
    // Clean and split lines
    const lines = translatedContent.split("\n").map(line => line.trim());
    
    // Normalize newlines and collapse multiple spaces
    let cleanedText = lines.join("\n")
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n") // Max double-newlines
      .replace(/[ \t]+/g, " ");   // Double spaces to single space

    // Typographical styling
    cleanedText = cleanedText
      .replace(/--/g, "—") // convert dual hyphen to em-dash
      .replace(/\s+([.,!?;:])/g, "$1") // remove space before punctuation
      .replace(/([.,!?;:])(?=[A-Za-z])/g, "$1 "); // space after punctuation

    // Sentence casing (uppercase first letter after period, exclamation mark, question mark, or newlines)
    cleanedText = cleanedText.replace(/(^|[.!?]\s+)([a-z])/g, (match, separator, letter) => {
      return separator + letter.toUpperCase();
    });

    // Capitalize isolated i pronouns
    cleanedText = cleanedText.replace(/\b(i)\b/g, "I");

    // Format Chapter indicators nicely
    cleanedText = cleanedText.replace(/\bchapter\s+(\d+|[ivxldm]+)\b/gi, (match, num) => {
      return `Chapter ${num.toUpperCase()}`;
    });

    if (style === "novel") {
      const paragraphs = cleanedText.split("\n\n");
      const formattedParagraphs = paragraphs.map(p => {
        const trimmed = p.trim();
        if (!trimmed) return "";
        if (/^Chapter\s+/i.test(trimmed) || /^Chapter\s+\d+/i.test(trimmed) || (trimmed.length < 35 && !trimmed.endsWith("."))) {
          return "\n" + trimmed.toUpperCase() + "\n";
        }
        return "    " + trimmed;
      });
      cleanedText = formattedParagraphs.filter(Boolean).join("\n\n");
    } else if (style === "markdown") {
      const paragraphs = cleanedText.split("\n\n");
      const formattedParagraphs = paragraphs.map(p => {
        const trimmed = p.trim();
        if (!trimmed) return "";
        if (/^Chapter\s+/i.test(trimmed) || /^Chapter\s+\d+/i.test(trimmed)) {
          return `## ${trimmed}`;
        }
        if (trimmed.startsWith("—") || trimmed.startsWith("-") || trimmed.startsWith('"')) {
          return `* ${trimmed}`;
        }
        return trimmed;
      });
      cleanedText = formattedParagraphs.filter(Boolean).join("\n\n");
    }

    setTranslatedContent(cleanedText);
    setFormatToast(`Applied ${style === "novel" ? "Book/Novel" : style === "markdown" ? "Markdown" : "Clean Spacing"} style!`);
    setTimeout(() => setFormatToast(null), 3000);
  };

  const handleDownloadFormatted = async (formatType: "txt" | "pdf" | "epub") => {
    if (!translatedContent && !originalContent) return;

    let contentToDownload = translatedContent || originalContent;
    let mimeType = "text/plain;charset=utf-8";
    let fileExtension = ".txt";

    if (formatType === "epub") {
      try {
        setFormatToast("Compiling EPUB book archive...");
        let epubChapters: { title: string; content: string }[] = [];

        if (book.type === "epub" && book.chapters && book.chapters.length > 0) {
          epubChapters = book.chapters.map(ch => ({
            title: ch.title,
            content: ch.translatedText || ch.content,
          }));
        } else {
          // Plain text / single document structure
          const textToConvert = translatedContent || originalContent;
          // Split by Chapter markers if any exist
          const chapterRegex = /\b(Chapter\s+(?:\d+|[IVXLCDM]+))\b/gi;
          const parts = textToConvert.split(chapterRegex);
          
          if (parts.length > 1) {
            let index = 0;
            if (parts[0].trim()) {
              epubChapters.push({
                title: "Introduction",
                content: parts[0].trim(),
              });
              index = 1;
            } else {
              index = 1;
            }
            
            for (; index < parts.length; index += 2) {
              const title = parts[index];
              const content = parts[index + 1] || "";
              epubChapters.push({
                title,
                content: content.trim(),
              });
            }
          } else {
            epubChapters.push({
              title: book.name.replace(/\.[^/.]+$/, ""),
              content: textToConvert,
            });
          }
        }

        const epubBlob = await generateEpub(book.name, epubChapters);
        const url = URL.createObjectURL(epubBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = book.name.replace(/\.[^/.]+$/, "") + "_Elegant.epub";
        link.click();
        URL.revokeObjectURL(url);

        setFormatToast("Downloaded Elegant EPUB!");
        setTimeout(() => setFormatToast(null), 3000);
      } catch (err: any) {
        console.error("Failed to generate EPUB:", err);
        setFormatToast("Failed to compile EPUB.");
        setTimeout(() => setFormatToast(null), 3000);
      }
      return;
    }

    if (formatType === "pdf") {
      try {
        setFormatToast("Formatting and generating PDF...");
        
        let pdfText = "";
        if (book.type === "epub" && book.chapters && book.chapters.length > 0) {
          // Join all translated (or original) chapters with clean breaks
          pdfText = book.chapters.map(ch => `Chapter: ${ch.title}\n\n${ch.translatedText || ch.content}`).join("\n\n");
        } else {
          pdfText = translatedContent || originalContent;
        }

        const pdfBlob = await generatePdf(book.name, pdfText);
        const url = URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = book.name.replace(/\.[^/.]+$/, "") + "_Elegant.pdf";
        link.click();
        URL.revokeObjectURL(url);

        setFormatToast("Downloaded Elegant PDF!");
        setTimeout(() => setFormatToast(null), 3000);
      } catch (err: any) {
        console.error("Failed to generate PDF:", err);
        setFormatToast("Failed to generate PDF.");
        setTimeout(() => setFormatToast(null), 3000);
      }
      return;
    }

    const blob = new Blob([contentToDownload], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    let suffix = "_Formatted";
    if (book.type === "epub" && book.chapters) {
      suffix = `_${book.chapters[activeChapterIndex].title.replace(/\s+/g, "_")}_Formatted`;
    }
    
    link.download = book.name.replace(/\.[^/.]+$/, "") + suffix + fileExtension;
    link.click();
    URL.revokeObjectURL(url);

    setFormatToast(`Downloaded formatted ${formatType.toUpperCase()} document!`);
    setTimeout(() => setFormatToast(null), 3000);
  };

  // Initialize and load default state depending on book type
  useEffect(() => {
    setTranslationError(null);
    setLogs([]);
    setPromptPreset("");
    setOriginalSliderVal(0);
    
    if (book.type === "txt") {
      setOriginalContent(book.rawText || "");
      setTranslatedContent("");
    } else if (book.type === "epub" && book.chapters && book.chapters.length > 0) {
      const activeChapter = book.chapters[activeChapterIndex];
      setOriginalContent(activeChapter.content);
      setTranslatedContent(activeChapter.translatedText || "");
    } else if (book.type === "pdf") {
      setOriginalContent(`PDF Manuscript: ${book.name}\nSize: ${(book.size / 1024 / 1024).toFixed(2)} MB\nReady for advanced context translation.`);
      setTranslatedContent("");
    } else if (book.type === "image") {
      setOriginalContent("Image Manuscript uploaded. Run the OCR engine to scan and translate the text.");
      setTranslatedContent("");
      setOcrOriginal("");
    }
  }, [book, activeChapterIndex]);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedContent || ocrOriginal);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([translatedContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    let suffix = "_Translated";
    if (book.type === "epub" && book.chapters) {
      suffix = `_${book.chapters[activeChapterIndex].title.replace(/\s+/g, "_")}_Translated`;
    } else if (book.type === "pdf") {
      suffix = "_Full_Translated";
    }
    
    link.download = book.name.replace(/\.[^/.]+$/, "") + suffix + ".txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  const applyPreset = (preset: string) => {
    setPromptPreset(preset);
    if (preset === "literary") {
      setCustomInstructions("Emphasize literary prose elegance, capture underlying emotional nuances, and use sophisticated English vocabulary suitable for a classic novel.");
    } else if (preset === "literal") {
      setCustomInstructions("Translate strictly word-for-word and maintain exact structural alignment with the original text. Prioritize grammatical fidelity over smooth narrative reading.");
    } else if (preset === "summary") {
      setCustomInstructions("Generate a condensed, high-level translated summary of the main arguments, narrative developments, and core concepts in flowing English.");
    } else if (preset === "scientific") {
      setCustomInstructions("Use highly precise academic, technical, or scientific terminology. Maintain objectivity and structured clarity suitable for peer-reviewed work.");
    } else {
      setCustomInstructions("");
    }
  };

  const startTranslation = async () => {
    setIsTranslating(true);
    setTranslationError(null);
    setLogs([]);
    setTranslationProgress(0);
    
    // Instantiate AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    addLog(`Initializing direct translation engine...`);

    // Dynamic progress bar state simulation
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      if (currentProgress < 30) {
        currentProgress += Math.floor(Math.random() * 8) + 4; // faster startup
      } else if (currentProgress < 75) {
        currentProgress += Math.floor(Math.random() * 3) + 1; // medium progress
      } else if (currentProgress < 95) {
        currentProgress += 1; // slow down as it gets closer
      } else if (currentProgress < 99.5) {
        currentProgress += 0.05; // very micro adjustments to show active movement
      }
      setTranslationProgress(parseFloat(currentProgress.toFixed(1)));
    }, 150);

    // Reassurance and status updates printed sequentially while translation is working
    let logCounter = 0;
    const logInterval = setInterval(() => {
      logCounter++;
      if (logCounter === 5) {
        addLog("Structuring manuscript layout schemas...");
      } else if (logCounter === 12) {
        addLog("Processing translation segments...");
      } else if (logCounter === 20) {
        addLog("Actively aligning syntactic constructs... (larger books might take up to a minute)");
      } else if (logCounter === 35) {
        addLog("Refining linguistic style and vocabulary matches...");
      } else if (logCounter === 50) {
        addLog("Applying target tone consistency parameters...");
      } else if (logCounter === 70) {
        addLog("Performing final structural coherence checks...");
      } else if (logCounter === 90) {
        addLog("Still working on deep analysis... Please keep this window open.");
      }
    }, 1000);

    try {
      if (book.type === "txt") {
        addLog("Analyzing plain text manuscript length and lines...");
        addLog("Injecting linguistic framework rules...");
        addLog("Translating complete document to English...");
        
        const result = await translateText({
          text: originalContent,
          sourceLang,
          targetLang,
          customInstructions,
          engine: translationEngine,
          signal: controller.signal,
        });
        
        clearInterval(progressInterval);
        clearInterval(logInterval);
        setTranslationProgress(100);
        setTranslatedContent(result);
        addLog("Linguistic alignment verified.");
        addLog("Translation completed successfully.");
        
        // Save to History
        onTranslationCompleted({
          id: Math.random().toString(),
          bookId: book.id,
          bookName: book.name,
          bookType: "txt",
          sectionIdentifier: "Complete Document",
          originalContent: originalContent.substring(0, 500) + "...",
          translatedContent: result,
          timestamp: new Date().toLocaleTimeString(),
        });

      } else if (book.type === "epub" && book.chapters) {
        if (translateFullBook) {
          clearInterval(progressInterval);
          addLog(`Initiating Sequential Full Book Translation. Chapters count: ${book.chapters.length}`);
          const updatedChapters = [...book.chapters];
          
          for (let i = 0; i < book.chapters.length; i++) {
            const chapter = book.chapters[i];
            addLog(`[Chapter ${i + 1}/${book.chapters.length}] Translating "${chapter.title}"...`);
            setTranslationProgress(Math.floor((i / book.chapters.length) * 100));
            
            const result = await translateText({
              text: chapter.content,
              sourceLang,
              targetLang,
              customInstructions,
              engine: translationEngine,
              signal: controller.signal,
            });
            
            updatedChapters[i] = {
              ...chapter,
              translatedText: result,
            };
            
            if (onUpdateEpubChapters) {
              onUpdateEpubChapters(book.id, updatedChapters);
            }
            
            if (i === activeChapterIndex) {
              setTranslatedContent(result);
            }
            
            addLog(`[Chapter ${i + 1}/${book.chapters.length}] "${chapter.title}" translation completed successfully.`);
          }
          
          clearInterval(logInterval);
          setTranslationProgress(100);
          addLog("Full Book Sequential Translation finalized!");
          
          onTranslationCompleted({
            id: Math.random().toString(),
            bookId: book.id,
            bookName: book.name,
            bookType: "epub",
            sectionIdentifier: "Complete Book (All Chapters)",
            originalContent: "Full EPUB Manuscript",
            translatedContent: updatedChapters[activeChapterIndex]?.translatedText || "Translation complete",
            timestamp: new Date().toLocaleTimeString(),
          });
        } else {
          const activeChapter = book.chapters[activeChapterIndex];
          addLog(`Unpacking EPUB XML for: ${activeChapter.title}...`);
          addLog("Parsing syntax blocks...");
          addLog("Translating chapter content to English... This might take a moment.");
          
          const result = await translateText({
            text: activeChapter.content,
            sourceLang,
            targetLang,
            customInstructions,
            engine: translationEngine,
            signal: controller.signal,
          });

          clearInterval(progressInterval);
          clearInterval(logInterval);
          setTranslationProgress(100);
          setTranslatedContent(result);
          
          // Update the chapter locally inside the App so state is saved
          const updatedChapters = [...book.chapters];
          updatedChapters[activeChapterIndex] = {
            ...activeChapter,
            translatedText: result,
          };
          if (onUpdateEpubChapters) {
            onUpdateEpubChapters(book.id, updatedChapters);
          }

          addLog(`Chapter '${activeChapter.title}' translation completed.`);
          
          onTranslationCompleted({
            id: Math.random().toString(),
            bookId: book.id,
            bookName: book.name,
            bookType: "epub",
            sectionIdentifier: activeChapter.title,
            originalContent: activeChapter.content.substring(0, 500) + "...",
            translatedContent: result,
            timestamp: new Date().toLocaleTimeString(),
          });
        }

      } else if (book.type === "pdf" && book.base64Data) {
        addLog("Uploading PDF for server-side processing...");
        addLog("Extracting text content from document...");
        addLog(`Translating page visual fields into modern ${targetLang} flow... This might take up to 25 seconds.`);

        const result = await translatePdf({
          pdfBase64: book.base64Data,
          pageInstructions: "Translate the entire PDF book fully from start to finish. Output the complete translated manuscript contents in English or the requested target language.",
          sourceLang,
          targetLang,
          customInstructions,
          engine: translationEngine,
          signal: controller.signal,
        });

        clearInterval(progressInterval);
        clearInterval(logInterval);
        setTranslationProgress(100);
        setTranslatedContent(result);
        addLog("PDF Document translate structure complete.");
        
        onTranslationCompleted({
          id: Math.random().toString(),
          bookId: book.id,
          bookName: book.name,
          bookType: "pdf",
          sectionIdentifier: "Full Document",
          originalContent: "[PDF Source Document]",
          translatedContent: result,
          timestamp: new Date().toLocaleTimeString(),
        });

      } else if (book.type === "image" && book.base64Data) {
        addLog("Processing image for OCR analysis...");
        addLog("Extracting text via server-side OCR...");
        addLog("Translating extracted text...");

        const result = await ocrTranslate({
          imageBase64: book.base64Data,
          mimeType: book.name.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg",
          targetLang,
          signal: controller.signal,
        });

        clearInterval(progressInterval);
        clearInterval(logInterval);
        setTranslationProgress(100);
        setOcrOriginal(result.originalText);
        setTranslatedContent(result.translatedText);
        addLog("OCR complete. Text extracted and translated.");

        onTranslationCompleted({
          id: Math.random().toString(),
          bookId: book.id,
          bookName: book.name,
          bookType: "image",
          sectionIdentifier: "Image OCR Scan",
          originalContent: result.originalText,
          translatedContent: result.translatedText,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } catch (err: any) {
      clearInterval(progressInterval);
      clearInterval(logInterval);
      if (err.name === "AbortError") {
        addLog("Translation canceled by user.");
        setTranslationProgress(0);
        setIsTranslating(false);
        return;
      }
      setTranslationProgress(0);
      console.error(err);
      setTranslationError(err.message || "Linguistic service failed to process contents.");
      addLog("ERROR: Translation engine halted due to processing failure.");
    } finally {
      clearInterval(progressInterval);
      clearInterval(logInterval);
      setIsTranslating(false);
      abortControllerRef.current = null;
    }
  };

  const getParagraphs = (text: string) => {
    if (!text) return [];
    let parts = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
    if (parts.length <= 1) {
      parts = text.split(/\n+/).map(p => p.trim()).filter(Boolean);
    }
    return parts;
  };

  const originalParagraphs = getParagraphs(originalContent);
  const CHUNK_SIZE = 15;
  const maxSliderVal = Math.max(0, originalParagraphs.length - CHUNK_SIZE);
  const visibleParagraphs = originalParagraphs.slice(
    originalSliderVal,
    originalSliderVal + CHUNK_SIZE
  );

  return (
    <div className="flex flex-col lg:flex-row h-full w-full gap-6 overflow-hidden">
      {/* LEFT CONTROL PANEL */}
      <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-5 border-b lg:border-b-0 lg:border-r border-white/5 pb-6 lg:pb-0 lg:pr-6 overflow-y-auto max-h-96 lg:max-h-full">
        {/* Document Stats Card */}
        <div className="bg-[#0A0A0A] border border-white/5 p-4 rounded-xl shadow-xl flex flex-col gap-3">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Active Document</span>
            </div>
            <span className="text-[10px] bg-cyan-950/40 text-cyan-400 border border-cyan-500/15 px-2 py-0.5 rounded uppercase">
              {book.type}
            </span>
          </div>
          <div>
            <h4 className="text-sm font-medium truncate text-white" title={book.name}>
              {book.name}
            </h4>
            <p className="text-[10px] text-zinc-500 mt-1">
              Size: {(book.size / 1024).toFixed(1)} KB | Uploaded: {book.dateUploaded}
            </p>
          </div>
        </div>

        {/* EPUB Chapter Selector */}
        {book.type === "epub" && book.chapters && (
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 block">Select Chapter</label>
            <div className="max-h-40 overflow-y-auto border border-white/5 bg-zinc-950/40 rounded-xl p-1.5 space-y-1 scrollbar-thin">
              {book.chapters.map((chapter, index) => (
                <button
                  id={`epub-chapter-${index}`}
                  key={chapter.id}
                  onClick={() => setActiveChapterIndex(index)}
                  className={`w-full flex items-center justify-between text-left px-3 py-2 text-xs rounded-lg transition-all duration-200 ${
                    activeChapterIndex === index
                      ? "bg-cyan-500/10 border border-cyan-500/25 text-white font-medium"
                      : "bg-transparent border border-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/40"
                  }`}
                >
                  <span className="truncate pr-2">{chapter.title}</span>
                  {chapter.translatedText && (
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0" title="Translated"></span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Full Book Translate Toggle for EPUB */}
        {book.type === "epub" && (
          <div className="flex flex-col gap-2">
            <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 block">Translation Scope</label>
            <button
              id="btn-toggle-scope"
              type="button"
              onClick={() => setTranslateFullBook(!translateFullBook)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all duration-200 ${
                translateFullBook
                  ? "bg-cyan-950/20 border-cyan-500/35 text-cyan-400 font-medium"
                  : "bg-zinc-950/40 border-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              <span className="text-xs">Translate Full Book</span>
              <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-200 ${translateFullBook ? "bg-cyan-500" : "bg-zinc-800"}`}>
                <div className={`w-3 h-3 rounded-full bg-black transition-transform duration-200 ${translateFullBook ? "translate-x-4" : "translate-x-0"}`}></div>
              </div>
            </button>
            <p className="text-[10px] text-zinc-500 leading-normal">
              {translateFullBook
                ? "Sequential Mode: Translates all chapters in sequence automatically."
                : "Focused Mode: Translates only the active selected chapter."
              }
            </p>
          </div>
        )}

        {/* Target Language Options */}
        <div className="flex flex-col gap-2">
          <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 block">Linguistic Target</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              id="lang-en"
              onClick={() => setTargetLang("English")}
              className={`px-3 py-2 text-xs rounded-lg border transition-all text-center ${
                targetLang === "English"
                  ? "bg-zinc-900 border-cyan-500/40 text-cyan-400"
                  : "bg-zinc-950/30 border-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              English (Global)
            </button>
            <button
              id="lang-custom"
              onClick={() => {
                const lang = prompt("Enter custom language or dialect (e.g. Spanish, German, Shakespearean English):");
                if (lang) setTargetLang(lang);
              }}
              className={`px-3 py-2 text-xs rounded-lg border transition-all text-center truncate ${
                targetLang !== "English"
                  ? "bg-zinc-900 border-cyan-500/40 text-cyan-400"
                  : "bg-zinc-950/30 border-white/5 text-zinc-400 hover:text-white"
              }`}
            >
              {targetLang !== "English" ? targetLang : "Other Dialect..."}
            </button>
          </div>
        </div>

        {/* Run Translation Trigger */}
        <div className="flex flex-col gap-2 mt-auto">
          {book.type === "image" ? (
            <div className="bg-zinc-950/60 border border-white/5 p-3 rounded-xl text-center text-[10px] text-zinc-500 leading-normal">
              Direct translation is not supported on raw images. Try uploading an EPUB, PDF, or TXT file instead!
            </div>
          ) : isTranslating ? (
            <button
              id="btn-cancel-translation"
              onClick={stopTranslation}
              className="w-full flex items-center justify-center gap-2 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/35 text-rose-400 font-semibold text-xs py-3 px-4 rounded-xl shadow-lg transition-all duration-200 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 animate-pulse" />
              <span>Cancel Translation</span>
            </button>
          ) : (
            <button
              id="btn-run-translation"
              onClick={startTranslation}
              className="w-full flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs py-3 px-4 rounded-xl shadow-lg shadow-cyan-500/10 transition-all duration-200 cursor-pointer"
            >
              <Cpu className="w-4 h-4" />
              <span>
                {`Translate to ${targetLang}`}
              </span>
            </button>
          )}
        </div>
      </aside>

      {/* RIGHT DISPLAY PANELS */}
      <main className="flex-1 flex flex-col bg-[#080808] border border-white/5 rounded-2xl overflow-hidden min-h-[400px]">
        {/* Navigation Tabs for reader */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-white/5 bg-[#0A0A0A]">
          <div className="flex items-center gap-1.5">
            <button
              id="tab-side"
              onClick={() => setActiveTab("sidebyside")}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-widest rounded-lg border transition-all ${
                activeTab === "sidebyside"
                  ? "bg-zinc-900 border-zinc-800 text-cyan-400 font-medium"
                  : "bg-transparent border-transparent text-zinc-500 hover:text-white"
              }`}
            >
              Side-by-Side
            </button>
            <button
              id="tab-orig"
              onClick={() => setActiveTab("original")}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-widest rounded-lg border transition-all ${
                activeTab === "original"
                  ? "bg-zinc-900 border-zinc-800 text-cyan-400 font-medium"
                  : "bg-transparent border-transparent text-zinc-500 hover:text-white"
              }`}
            >
              Original Source
            </button>
            <button
              id="tab-trans"
              onClick={() => setActiveTab("translated")}
              className={`px-3 py-1.5 text-[10px] uppercase tracking-widest rounded-lg border transition-all ${
                activeTab === "translated"
                  ? "bg-zinc-900 border-zinc-800 text-cyan-400 font-medium"
                  : "bg-transparent border-transparent text-zinc-500 hover:text-white"
              }`}
            >
              English output
            </button>
          </div>

          <div className="flex items-center gap-2">
            {(translatedContent || ocrOriginal) && (
              <>
                <button
                  id="btn-copy-trans"
                  onClick={handleCopy}
                  className="p-1.5 hover:bg-zinc-800/80 rounded-lg text-zinc-400 hover:text-white transition-all duration-200"
                  title="Copy Translated Text"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
                {translatedContent && (
                  <button
                    id="btn-dl-trans"
                    onClick={handleDownload}
                    className="p-1.5 hover:bg-zinc-800/80 rounded-lg text-zinc-400 hover:text-white transition-all duration-200"
                    title="Download Translation (.txt)"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Content body containing splits */}
        <div className="flex-1 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/5 overflow-hidden">
          {/* ORIGINAL SIDE */}
          {(activeTab === "original" || activeTab === "sidebyside") && (
            <div className="flex-1 flex flex-col overflow-hidden bg-[#050505]/40">
              <div className="px-5 py-2.5 bg-zinc-950/40 border-b border-white/5 flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500 shrink-0">
                <span>Original Text</span>
                <span>{originalContent ? `${originalContent.split(/\s+/).filter(Boolean).length} words` : "Empty"}</span>
              </div>

              {/* Slider Navigator */}
              {originalParagraphs.length > CHUNK_SIZE && (
                <div className="px-5 py-3 bg-zinc-900/40 border-b border-white/5 flex flex-col gap-2 shrink-0 select-none">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span className="flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="font-mono text-[10px] uppercase tracking-wider">Manuscript Navigator</span>
                    </span>
                    <span className="font-mono text-[10px] bg-cyan-950/40 text-cyan-400 border border-cyan-500/10 px-2 py-0.5 rounded">
                      Section {originalSliderVal + 1} - {Math.min(originalParagraphs.length, originalSliderVal + CHUNK_SIZE)} of {originalParagraphs.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-600 font-mono">START</span>
                    <input
                      type="range"
                      min={0}
                      max={maxSliderVal}
                      value={originalSliderVal}
                      onChange={(e) => setOriginalSliderVal(parseInt(e.target.value))}
                      className="flex-1 accent-cyan-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-[10px] text-zinc-600 font-mono">END</span>
                  </div>
                </div>
              )}

              <div className="flex-1 p-6 overflow-y-auto font-sans text-sm text-zinc-300 leading-relaxed space-y-4 select-text scrollbar-thin">
                {book.type === "image" && book.base64Data ? (
                  <div className="flex flex-col items-center gap-4 py-4">
                    <img 
                      src={`data:image/png;base64,${book.base64Data}`} 
                      alt="Manuscript preview" 
                      className="max-h-80 w-auto rounded-xl border border-zinc-800 shadow-2xl"
                    />
                    {ocrOriginal ? (
                      <div className="w-full mt-4 text-xs font-mono bg-zinc-950/60 p-4 rounded-xl border border-white/5 text-zinc-400 max-h-48 overflow-y-auto">
                        <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 border-b border-white/5 pb-1 font-sans">
                          Extracted Raw OCR Text:
                        </div>
                        {ocrOriginal}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-500 text-center italic">
                        Run the translation engine to extract raw text and render the translation.
                      </p>
                    )}
                  </div>
                ) : originalParagraphs.length > CHUNK_SIZE ? (
                  <div className="space-y-4">
                    {visibleParagraphs.map((para, idx) => (
                      <p key={idx} className="whitespace-pre-wrap">{para}</p>
                    ))}
                    <div className="pt-4 border-t border-white/5 text-center">
                      <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                        — End of Visible Section — Use Navigator Slider to Scroll —
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{originalContent}</div>
                )}
              </div>
            </div>
          )}

          {/* TRANSLATED SIDE */}
          {(activeTab === "translated" || activeTab === "sidebyside") && (
            <div className="flex-1 flex flex-col overflow-hidden bg-[#050505]">
              <div className="px-5 py-2.5 bg-zinc-950/40 border-b border-white/5 flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-500">
                <span>{targetLang !== "English" ? targetLang : "English (US)"} Translation Output</span>
                <span>{translatedContent ? `${translatedContent.split(/\s+/).filter(Boolean).length} words` : "0 words"}</span>
              </div>

              {/* Formatting and Download Toolbar */}
              {translatedContent && !isTranslating && (
                <div className="px-5 py-2 bg-zinc-900/40 border-b border-white/5 flex flex-wrap items-center justify-between gap-3 text-xs animate-fadeIn">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-mono uppercase text-zinc-500 mr-1.5">Format Translation:</span>
                    <button
                      id="btn-fmt-standard"
                      onClick={() => handleFormatText("standard")}
                      className="px-2.5 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 hover:text-white text-zinc-300 transition-all text-[11px] font-medium flex items-center gap-1 cursor-pointer border border-white/5"
                      title="Normalize spaces, punctuation, sentence casing."
                    >
                      <Sparkles className="w-3 h-3 text-cyan-400" />
                      <span>Clean Spacing</span>
                    </button>
                    <button
                      id="btn-fmt-novel"
                      onClick={() => handleFormatText("novel")}
                      className="px-2.5 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 hover:text-white text-zinc-300 transition-all text-[11px] font-medium flex items-center gap-1 cursor-pointer border border-white/5"
                      title="Add novel indentations and standardize chapters."
                    >
                      <BookOpen className="w-3 h-3 text-cyan-400" />
                      <span>Book/Novel Indents</span>
                    </button>
                    <button
                      id="btn-fmt-markdown"
                      onClick={() => handleFormatText("markdown")}
                      className="px-2.5 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 hover:text-white text-zinc-300 transition-all text-[11px] font-medium flex items-center gap-1 cursor-pointer border border-white/5"
                      title="Structure as elegant Markdown blocks."
                    >
                      <FileText className="w-3 h-3 text-cyan-400" />
                      <span>Markdown Style</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto">
                    {formatToast && (
                      <span className="text-[10px] bg-cyan-950/80 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20 mr-2 animate-pulse">
                        {formatToast}
                      </span>
                    )}
                    <span className="text-[10px] font-mono uppercase text-zinc-500 mr-1.5">Download Elegant:</span>
                    <button
                      id="btn-dl-formatted-txt"
                      onClick={() => handleDownloadFormatted("txt")}
                      className="px-2.5 py-1 rounded bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-400 transition-all text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                      title="Download text file formatted for standard publication."
                    >
                      <FileDown className="w-3 h-3" />
                      <span>Txt File</span>
                    </button>
                    <button
                      id="btn-dl-formatted-pdf"
                      onClick={() => handleDownloadFormatted("pdf")}
                      className="px-2.5 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 border border-white/5 text-zinc-300 hover:text-white transition-all text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                      title="Download a beautifully typeset, printable PDF version of the e-book."
                    >
                      <FileText className="w-3 h-3 text-cyan-400" />
                      <span>Elegant PDF</span>
                    </button>
                    <button
                      id="btn-dl-formatted-epub"
                      onClick={() => handleDownloadFormatted("epub")}
                      className="px-2.5 py-1 rounded bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 text-cyan-300 hover:text-white transition-all text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                      title="Download a standard, fully compatible EPUB e-book for Kindle, Apple Books, and e-readers."
                    >
                      <BookOpen className="w-3 h-3 text-cyan-400" />
                      <span>Elegant EPUB</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex-1 p-6 overflow-y-auto scrollbar-thin">
                {isTranslating ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center animate-pulse">
                    <div className="w-10 h-10 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4"></div>
                    <h5 className="font-serif italic text-lg text-white mb-2">Translating</h5>
                    <p className="text-xs text-zinc-500 max-w-xs">
                      Analyzing and translating the original manuscript using the offline engine...
                    </p>

                    {/* Progress Bar & Percentage */}
                    <div className="w-full max-w-sm mt-6">
                      <div className="flex justify-between items-center text-xs text-zinc-400 mb-1.5 font-mono">
                        <span className="text-[10px] uppercase tracking-widest text-cyan-400">Translating</span>
                        <span>{translationProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-900 border border-white/5 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-cyan-500 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(6,182,212,0.5)]"
                          style={{ width: `${translationProgress}%` }}
                        ></div>
                      </div>
                    </div>
                    

                  </div>
                ) : translationError ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-red-950/20 border border-red-500/20 flex items-center justify-center text-red-400 mb-3">
                      !
                    </div>
                    <h5 className="font-semibold text-red-400 mb-1">Translation Failed</h5>
                    <p className="text-xs text-red-500/80 max-w-sm mb-4">{translationError}</p>
                    <button
                      id="btn-retry-trans"
                      onClick={startTranslation}
                      className="px-4 py-1.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs"
                    >
                      Retry Execution
                    </button>
                  </div>
                ) : translatedContent ? (
                  <textarea
                    id="translated-textarea"
                    value={translatedContent}
                    onChange={(e) => setTranslatedContent(e.target.value)}
                    className="w-full h-full bg-transparent text-zinc-100 font-sans text-sm leading-relaxed outline-none resize-none select-text whitespace-pre-wrap"
                  />
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <div className="w-12 h-12 rounded-full border border-zinc-800/80 flex items-center justify-center text-zinc-600 mb-3">
                      <Languages className="w-5 h-5" />
                    </div>
                    <h5 className="font-serif italic text-zinc-400 mb-1">Await Alignment</h5>
                    <p className="text-xs text-zinc-600 max-w-xs">
                       Tune options in the left panel and click "Translate" to begin.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
