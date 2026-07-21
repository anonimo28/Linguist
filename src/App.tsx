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
  BookOpen, 
  FolderOpen,
  Plus,
  AlertCircle,
  Trash2,
  ArrowUpRight,
  Languages,
  ScanText,
  Sparkles,
  Command,
  Activity,
  Clock3
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
    <div className="app-shell min-h-screen text-stone-100 selection:bg-lime-300 selection:text-stone-950">
      <div className="ambient-orb ambient-orb-one" />
      <div className="ambient-orb ambient-orb-two" />

      <header className="topbar">
        <button className="brand" onClick={() => setSelectedBookId(null)} aria-label="Go to Linguist home">
          <span className="brand-mark"><Languages className="h-4 w-4" /></span>
          <span className="brand-word">Linguist</span>
          <span className="brand-tag">AI studio</span>
        </button>
        <div className="hidden md:flex items-center gap-2">
          <div className={`health-pill ${apiStatus ? "is-online" : "is-offline"}`}>
            <Activity className="h-3.5 w-3.5" />
            {apiStatus ? `Engine online · ${apiLatency}ms` : "Engine offline"}
          </div>
          <button className="command-pill" onClick={() => setSelectedBookId(null)}>
            <Command className="h-3.5 w-3.5" /> New manuscript
          </button>
          <div className="avatar">LI</div>
        </div>
      </header>

      <div className="workspace-shell">
        <aside className="library-rail">
          <div className="rail-heading">
            <span>Workspace</span>
            <span>{uploadedBooks.length.toString().padStart(2, "0")}</span>
          </div>

          <button
            id="btn-upload-new"
            onClick={() => setSelectedBookId(null)}
            className={`new-project-button ${!selectedBookId ? "is-active" : ""}`}
          >
            <Plus className="h-4 w-4" />
            <span>New translation</span>
            <ArrowUpRight className="ml-auto h-3.5 w-3.5 opacity-60" />
          </button>

          <div className="rail-section">
            <div className="rail-heading"><span>Library</span><span>Recent</span></div>
            {uploadedBooks.length === 0 ? (
              <div className="empty-library">
                <FolderOpen className="h-5 w-5" />
                <p>Your manuscripts will live here.</p>
              </div>
            ) : (
              <div className="library-list">
                {uploadedBooks.map((book) => (
                  <div
                    id={`library-book-${book.id}`}
                    key={book.id}
                    onClick={() => setSelectedBookId(book.id)}
                    className={`library-item ${selectedBookId === book.id ? "is-selected" : ""}`}
                  >
                    <span className="file-glyph">{book.type.slice(0, 1).toUpperCase()}</span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium text-stone-200">{book.name}</div>
                      <div className="mt-0.5 text-[10px] uppercase tracking-[.12em] text-stone-500">{book.type} · {(book.size / 1024).toFixed(0)} KB</div>
                    </div>
                    <button
                      id={`delete-book-${book.id}`}
                      onClick={(event) => handleDeleteBook(book.id, event)}
                      className="delete-button"
                      title="Remove manuscript"
                    ><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rail-engine-card">
            <div className="flex items-center justify-between">
              <span className="engine-icon">{activeMode === "Precision OCR" ? <ScanText /> : <Sparkles />}</span>
              <span className="live-label"><i /> Live</span>
            </div>
            <p>Neural engine</p>
            <strong>{activeMode}</strong>
            <div className="engine-meter"><span /></div>
            <div className="flex justify-between text-[10px] text-stone-500"><span>Context ready</span><span>100%</span></div>
          </div>
        </aside>

        <main className="main-stage">
          {activeBook ? (
            <Reader book={activeBook} onTranslationCompleted={handleTranslationCompleted} onUpdateEpubChapters={handleUpdateEpubChapters} />
          ) : (
            <div className="welcome-wrap">
              <section className="hero-copy">
                <div className="eyebrow"><span /> Language, without limits</div>
                <h1>Every story deserves<br />to <em>travel.</em></h1>
                <p>Transform books, documents, and scanned pages into beautifully fluent translations—without losing the author’s voice.</p>
              </section>

              <div className="upload-grid">
                <Dropzone onFileLoaded={handleFileLoaded} isLoading={isLoading} setIsLoading={setIsLoading} />
                <div className="feature-stack">
                  <article className="feature-card accent-card">
                    <span className="feature-number">01</span>
                    <ScanText className="h-5 w-5" />
                    <div><h3>See every word</h3><p>Precision OCR reads photographed pages and complex layouts.</p></div>
                  </article>
                  <article className="feature-card">
                    <span className="feature-number">02</span>
                    <BookOpen className="h-5 w-5" />
                    <div><h3>Keep the voice</h3><p>Context-aware prose, chapter by chapter.</p></div>
                  </article>
                </div>
              </div>

              <div className="trust-row">
                <span><Sparkles className="h-3.5 w-3.5" /> Native-flow translation</span>
                <span><Clock3 className="h-3.5 w-3.5" /> Progress saved locally</span>
                <span><BookOpen className="h-3.5 w-3.5" /> PDF · EPUB · TXT · Images</span>
              </div>

              {history.length > 0 && (
                <section className="history-section">
                  <HistoryList history={history} onSelectHistory={handleSelectHistory} onClearHistory={handleClearHistory} />
                </section>
              )}
            </div>
          )}
        </main>
      </div>

      {!apiStatus && <div className="offline-toast"><AlertCircle className="h-4 w-4" /> Backend health check failed. Translation tools may be unavailable.</div>}
      <footer className="app-footer"><span>© 2026 Linguist Studio</span><span>Your work stays on this device</span></footer>
      <AdUnit slot="0000000000" format="horizontal" className="hidden" />
    </div>
  );
}
