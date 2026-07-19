import React, { useState, useRef } from "react";
import { Upload, BookOpen, AlertCircle, Image } from "lucide-react";
import { BookFile, BookType } from "../types";
import { parseEpub } from "../lib/epubParser";

interface DropzoneProps {
  onFileLoaded: (file: BookFile) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export default function Dropzone({ onFileLoaded, isLoading, setIsLoading }: DropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setError(null);
    setIsLoading(true);

    const extension = file.name.split(".").pop()?.toLowerCase();
    let type: BookType | null = null;

    if (extension === "pdf") {
      type = "pdf";
    } else if (extension === "txt") {
      type = "txt";
    } else if (extension === "epub") {
      type = "epub";
    } else if (["png", "jpg", "jpeg", "webp", "gif"].includes(extension || "")) {
      type = "image";
    }

    if (!type) {
      setError("Unsupported file format. Please upload PDF, TXT, EPUB, or an Image (JPG/PNG).");
      setIsLoading(false);
      return;
    }

    try {
      const dateUploaded = new Date().toLocaleString();
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      if (type === "txt") {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const rawText = e.target?.result as string;
            onFileLoaded({
              id,
              name: file.name,
              size: file.size,
              type: "txt",
              rawText,
              dateUploaded,
            });
          } catch (err: any) {
            console.error("Error in txt onload:", err);
            setError(err.message || "Failed to process text file.");
          } finally {
            setIsLoading(false);
          }
        };
        reader.onerror = () => {
          setError("Failed to read the text file.");
          setIsLoading(false);
        };
        reader.readAsText(file);
      } else if (type === "pdf" || type === "image") {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const result = e.target?.result as string;
            // Get only the base64 payload
            const base64Data = result.split(",")[1];
            if (!base64Data) {
              throw new Error("Invalid base64 encoding from file.");
            }
            onFileLoaded({
              id,
              name: file.name,
              size: file.size,
              type,
              base64Data,
              dateUploaded,
            });
          } catch (err: any) {
            console.error("Error in file reader onload:", err);
            setError(err.message || "Failed to process raw file data.");
          } finally {
            setIsLoading(false);
          }
        };
        reader.onerror = () => {
          setError("Failed to read the document or image file.");
          setIsLoading(false);
        };
        reader.readAsDataURL(file);
      } else if (type === "epub") {
        const chapters = await parseEpub(file);
        if (chapters.length === 0) {
          throw new Error("Could not extract any chapters or content from the EPUB.");
        }
        onFileLoaded({
          id,
          name: file.name,
          size: file.size,
          type: "epub",
          chapters,
          dateUploaded,
        });
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to process the book manuscript.");
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div
        id="file-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`relative group cursor-pointer border-2 border-dashed transition-all duration-300 rounded-3xl p-10 flex flex-col items-center justify-center text-center ${
          isDragActive
            ? "border-cyan-500 bg-cyan-950/10 scale-[1.01]"
            : "border-zinc-800 bg-zinc-900/10 hover:border-zinc-700 hover:bg-zinc-900/20"
        } ${isLoading ? "pointer-events-none opacity-50" : ""}`}
      >
        {/* Glowing backdrop decorative element */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-500/5 blur-[100px] rounded-full pointer-events-none transition-all duration-500 group-hover:bg-cyan-500/8"></div>

        <input
          id="manuscript-file-input"
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.txt,.epub,image/*"
          className="hidden"
        />

        <div className="relative z-10">
          <div className="w-16 h-16 bg-zinc-900 border border-zinc-700 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl transition-transform duration-300 group-hover:scale-105">
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Upload className="w-6 h-6 text-cyan-400" />
            )}
          </div>

          <h3 className="text-2xl font-serif italic text-white mb-2">Ingest Manuscript</h3>
          <p className="text-zinc-400 max-w-sm mx-auto text-sm leading-relaxed mb-4">
            Drag & drop your files here, or click to browse
          </p>

          <div className="flex justify-center gap-3 text-xs uppercase tracking-widest text-zinc-500">
            <span className="flex items-center gap-1 border border-zinc-800/80 px-2.5 py-1.5 rounded-lg bg-zinc-950/30">
              <BookOpen className="w-3.5 h-3.5 text-cyan-500" /> PDF, EPUB, TXT
            </span>
            <span className="flex items-center gap-1 border border-zinc-800/80 px-2.5 py-1.5 rounded-lg bg-zinc-950/30">
              <Image className="w-3.5 h-3.5 text-cyan-500" /> Image OCR
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-red-950/20 border border-red-500/20 text-red-400 text-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
          <div>
            <div className="font-semibold text-red-300">File processing error</div>
            <p className="text-xs text-red-400/80 mt-1">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
