import React, { useState, useRef } from "react";
import { Upload, AlertCircle, ArrowUpRight } from "lucide-react";
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
    <div className="dropzone-wrap w-full flex flex-col gap-4">
      <div
        id="file-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`next-dropzone relative group cursor-pointer transition-all duration-300 flex flex-col justify-between ${
          isDragActive
            ? "is-dragging scale-[1.01]"
            : ""
        } ${isLoading ? "pointer-events-none opacity-50" : ""}`}
      >
        <div className="dropzone-grid" />

        <input
          id="manuscript-file-input"
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,.txt,.epub,image/*"
          className="hidden"
        />

        <div className="relative z-10 flex w-full items-start justify-between">
          <div className="upload-icon">
            {isLoading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-stone-950 border-t-transparent" />
            ) : (
              <Upload className="h-5 w-5" />
            )}
          </div>
          <ArrowUpRight className="h-5 w-5 text-stone-600 transition group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-lime-300" />
        </div>

        <div className="relative z-10 text-left">
          <span className="drop-kicker">Start a new project</span>
          <h3>{isLoading ? "Reading your manuscript…" : "Drop in your words."}</h3>
          <p>Drag & drop a file, or click anywhere to browse.</p>
          <div className="format-row"><span>PDF</span><span>EPUB</span><span>TXT</span><span>JPG / PNG</span><i>Up to 25 MB</i></div>
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
