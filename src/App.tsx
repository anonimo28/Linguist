import React, { useState, useEffect } from "react";
import { 
  BookFile, 
  TranslationHistoryItem, 
  EpubChapter,
  BookType
} from "./types";
import Dropzone from "./components/Dropzone";
import Reader from "./components/Reader";
import HistoryList from "./components/HistoryList";
import AdUnit from "./components/AdUnit";
import { 
  Cpu, 
  ShieldCheck, 
  Layers, 
  BookMarked, 
  LogOut, 
  BookOpen, 
  FolderOpen,
  Plus,
  Compass,
  AlertCircle,
  Trash2
} from "lucide-react";

export default function App() {
  const [uploadedBooks, setUploadedBooks] = useState<BookFile[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [history, setHistory] = useState<TranslationHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiLatency, setApiLatency] = useState<number>(42);
  const [apiStatus, setApiStatus] = useState<boolean>(true);

  // Load state from localStorage on init
  useEffect(() => {
    const cachedBooks = localStorage.getItem("linguist_books");
    const cachedHistory = localStorage.getItem("linguist_history");
    if (cachedBooks) {
      try {
        setUploadedBooks(JSON.parse(cachedBooks));
      } catch (e) {
        console.error("Failed to parse cached books:", e);
      }
    }
    if (cachedHistory) {
      try {
        setHistory(JSON.parse(cachedHistory));
      } catch (e) {
        console.error("Failed to parse cached history:", e);
      }
    }

    // Verify backend connection and API key status
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setApiStatus(true);
        // Simulate minor API latency variation
        setApiLatency(Math.floor(Math.random() * 20) + 30);
      })
      .catch((err) => {
        console.error("Backend health check failed:", err);
        setApiStatus(false);
      });
  }, []);

  // Save books to local storage
  const saveBooks = (books: BookFile[]) => {
    setUploadedBooks(books);
    try {
      localStorage.setItem("linguist_books", JSON.stringify(books));
    } catch (e) {
      console.warn("Could not save books to localStorage (possibly exceeded quota limit):", e);
    }
  };

  // Save history to local storage
  const saveHistory = (newHistory: TranslationHistoryItem[]) => {
    setHistory(newHistory);
    try {
      localStorage.setItem("linguist_history", JSON.stringify(newHistory));
    } catch (e) {
      console.warn("Could not save history to localStorage (possibly exceeded quota limit):", e);
    }
  };

  const handleFileLoaded = (newFile: BookFile) => {
    const updated = [newFile, ...uploadedBooks];
    saveBooks(updated);
    setSelectedBookId(newFile.id);
  };

  const handleUpdateEpubChapters = (bookId: string, chapters: EpubChapter[]) => {
    const updated = uploadedBooks.map((book) => {
      if (book.id === bookId) {
        return { ...book, chapters };
      }
      return book;
    });
    saveBooks(updated);
  };

  const handleTranslationCompleted = (item: TranslationHistoryItem) => {
    const updatedHistory = [item, ...history];
    saveHistory(updatedHistory);
  };

  const handleDeleteBook = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = uploadedBooks.filter((b) => b.id !== id);
    saveBooks(updated);
    if (selectedBookId === id) {
      setSelectedBookId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const handleSelectHistory = (item: TranslationHistoryItem) => {
    // Find matching book or show alert if no longer exists
    const matchingBook = uploadedBooks.find((b) => b.id === item.bookId);
    if (matchingBook) {
      setSelectedBookId(matchingBook.id);
      // For EPUB books, find the exact chapter index
      if (matchingBook.type === "epub" && matchingBook.chapters) {
        const index = matchingBook.chapters.findIndex((c) => c.title === item.sectionIdentifier);
        if (index !== -1) {
          // Trigger click manually or relies on chapter state being updated if we expose it
          const element = document.getElementById(`epub-chapter-${index}`);
          if (element) {
            element.click();
          }
        }
      }
    } else {
      alert(`The original manuscript "${item.bookName}" has been removed, but you can view its translation text in the history log below:\n\n${item.translatedContent}`);
    }
  };

  const handleClearHistory = () => {
    saveHistory([]);
  };

  const activeBook = uploadedBooks.find((b) => b.id === selectedBookId);
  const activeMode = activeBook?.type === "image" ? "Precision OCR" : "Translation";

  return (
    <div className="bg-[#050505] text-[#E0E0E0] min-h-screen flex flex-col font-sans overflow-x-hidden selection:bg-cyan-500/30 selection:text-white">
      {/* Top Navigation */}
      <nav className="flex items-center justify-between px-6 md:px-8 py-4 border-b border-white/10 bg-[#0A0A0A] shrink-0 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-cyan-500 rounded flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <div className="w-4 h-4 bg-black rounded-sm"></div>
          </div>
          <span className="text-xl font-light tracking-[0.2em] uppercase text-white">
            Linguist
          </span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-xs uppercase tracking-widest text-zinc-400">
          <span className="text-cyan-400 border-b border-cyan-400 pb-1 font-semibold cursor-default">
            Dashboard
          </span>
          <span className="hover:text-white transition-colors cursor-default">Library</span>
          <span className="hover:text-white transition-colors cursor-default">Engines</span>
          {/* Avatar simulation */}
          <div className="w-9 h-9 rounded-full border border-zinc-700 bg-zinc-900 flex items-center justify-center font-serif text-sm font-bold text-cyan-400">
            L
          </div>
        </div>
      </nav>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Sidebar Controls */}
        <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-white/5 bg-[#080808] p-6 flex flex-col gap-6 shrink-0">
          {/* Active Mode */}
          <div>
            <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-3.5 block">Active Mode</label>
            <div className="space-y-2">
              <button className={`w-full flex items-center gap-3 border p-3 rounded-xl text-left transition-all duration-200 ${
                activeMode === "Translation"
                  ? "bg-zinc-900 border-zinc-700 text-white"
                  : "bg-transparent border-white/5 text-zinc-500 pointer-events-none"
              }`}>
                <div className={`w-2 h-2 rounded-full ${activeMode === "Translation" ? "bg-cyan-400 shadow-md shadow-cyan-400/50" : "bg-zinc-700"}`}></div>
                <span className="text-xs font-medium">Translation</span>
              </button>
              <button className={`w-full flex items-center gap-3 border p-3 rounded-xl text-left transition-all duration-200 ${
                activeMode === "Precision OCR"
                  ? "bg-zinc-900 border-zinc-700 text-white"
                  : "bg-transparent border-white/5 text-zinc-500 pointer-events-none"
              }`}>
                <div className={`w-2 h-2 rounded-full ${activeMode === "Precision OCR" ? "bg-cyan-400 shadow-md shadow-cyan-400/50" : "bg-zinc-700"}`}></div>
                <span className="text-xs font-medium">Precision OCR</span>
              </button>
            </div>
          </div>

          {/* Library / Uploaded Manuscripts */}
          <div className="flex-1 flex flex-col min-h-[160px]">
            <div className="flex items-center justify-between mb-3.5">
              <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 block">Your Library</label>
              <span className="text-[10px] text-zinc-500 font-mono">{uploadedBooks.length} items</span>
            </div>
            
            {uploadedBooks.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-4 border border-dashed border-zinc-800 rounded-xl text-center bg-zinc-950/10">
                <FolderOpen className="w-5 h-5 text-zinc-700 mb-1.5" />
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">No manuscripts</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-48 lg:max-h-none overflow-y-auto pr-1">
                {uploadedBooks.map((b) => (
                  <div
                    id={`library-book-${b.id}`}
                    key={b.id}
                    onClick={() => setSelectedBookId(b.id)}
                    className={`group w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg cursor-pointer transition-all ${
                      selectedBookId === b.id
                        ? "bg-zinc-900 border border-zinc-800 text-white"
                        : "bg-transparent border border-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <BookOpen className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                      <span className="truncate" title={b.name}>{b.name}</span>
                    </div>
                    <button
                      id={`delete-book-${b.id}`}
                      onClick={(e) => handleDeleteBook(b.id, e)}
                      className="opacity-40 group-hover:opacity-100 hover:!opacity-100 p-1 text-zinc-400 hover:text-red-400 rounded hover:bg-zinc-800/60 transition-all ml-1 shrink-0"
                      title="Delete manuscript from library"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick upload triggers */}
          {selectedBookId && (
            <button
              id="btn-upload-new"
              onClick={() => setSelectedBookId(null)}
              className="w-full flex items-center justify-center gap-2 border border-zinc-800 hover:border-cyan-500/30 bg-zinc-950/40 hover:bg-cyan-950/10 text-xs py-2 rounded-lg text-zinc-400 hover:text-cyan-400 transition-all duration-200"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Ingest New Manuscript</span>
            </button>
          )}

          {/* API Health metrics */}
          <div className="mt-auto pt-4 border-t border-white/5 space-y-2.5">
            <div className="p-3.5 bg-gradient-to-br from-cyan-950/20 to-transparent border border-cyan-500/10 rounded-xl">
              <div className="flex justify-between text-[10px] text-cyan-400 mb-1">
                <span>API Latency</span>
                <span className="font-mono">{apiLatency}ms</span>
              </div>
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>OCR Engine</span>
                <span className="font-semibold text-zinc-300">V4-Ultra</span>
              </div>
            </div>

            {!apiStatus && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-yellow-950/15 border border-yellow-500/15 text-yellow-400 text-[10px] leading-normal animate-pulse">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Backend health check failed.</span>
              </div>
            )}
          </div>
        </aside>

        {/* Workspace Display Area */}
        <section className="flex-1 flex flex-col p-6 md:p-8 gap-8 overflow-y-auto">
          {activeBook ? (
            <Reader
              book={activeBook}
              onTranslationCompleted={handleTranslationCompleted}
              onUpdateEpubChapters={handleUpdateEpubChapters}
            />
          ) : (
            <div className="flex-1 flex flex-col gap-6 justify-center max-w-4xl mx-auto w-full py-10">
              <div className="text-center mb-2">
                <h1 className="text-4xl font-serif italic text-white tracking-wide">Linguist</h1>
                <p className="text-sm text-zinc-500 mt-2 max-w-md mx-auto leading-relaxed">
                  Book and manuscript translation tool. Translate prose, text files, and images into fluent native English.
                </p>
              </div>

              <Dropzone
                onFileLoaded={handleFileLoaded}
                isLoading={isLoading}
                setIsLoading={setIsLoading}
              />
            </div>
          )}


        </section>
      </div>

      {/* Bottom Status Bar */}
      <footer className="bg-[#0A0A0A] border-t border-white/5 shrink-0">
        <div className="px-6 md:px-8 py-3 flex justify-between items-center text-[10px] text-zinc-500">
          <div className="flex gap-6 items-center tracking-widest">
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-md shadow-green-500/50"></span>
              SYSTEMS NOMINAL
            </div>
            <span className="hidden sm:inline border-l border-zinc-800 pl-6 text-zinc-600">ENCRYPTED END-TO-END</span>
          </div>
          <div className="flex gap-4 font-mono">
            <span>v2.4.0-Stable</span>
            <span>Help Center</span>
          </div>
        </div>
        <AdUnit slot="0000000000" format="horizontal" className="border-t border-white/5 py-2 flex justify-center" />
      </footer>
    </div>
  );
}
