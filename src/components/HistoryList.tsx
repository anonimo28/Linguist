import React from "react";
import { Clock, Book, ChevronRight, CornerDownRight, Trash2 } from "lucide-react";
import { TranslationHistoryItem } from "../types";

interface HistoryListProps {
  history: TranslationHistoryItem[];
  onSelectHistory: (item: TranslationHistoryItem) => void;
  onClearHistory: () => void;
}

export default function HistoryList({ history, onSelectHistory, onClearHistory }: HistoryListProps) {
  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center border border-white/5 bg-zinc-950/20 rounded-2xl">
        <Clock className="w-8 h-8 text-zinc-700 mb-2" />
        <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-600">History Empty</span>
        <p className="text-xs text-zinc-500 mt-1 max-w-xs">
          Translated fragments and manuscript documents will populate here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 block">Processing Log / History</label>
        <button
          id="btn-clear-history"
          onClick={onClearHistory}
          className="text-[10px] text-zinc-600 hover:text-red-400 transition-colors uppercase tracking-widest flex items-center gap-1"
        >
          <Trash2 className="w-3 h-3" /> Clear Log
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {history.map((item) => (
          <div
            id={`history-item-${item.id}`}
            key={item.id}
            onClick={() => onSelectHistory(item)}
            className="group cursor-pointer bg-[#0A0A0A] border border-white/5 hover:border-cyan-500/30 p-4 rounded-xl flex flex-col justify-between shadow-2xl transition-all duration-300 hover:scale-[1.01]"
          >
            <div className="flex justify-between items-start gap-2">
              <div className="w-8 h-8 bg-zinc-900 border border-zinc-800 rounded flex items-center justify-center text-[9px] text-zinc-400 uppercase shrink-0 font-semibold">
                {item.bookType}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-medium text-white truncate">{item.bookName}</h4>
                <div className="flex items-center gap-1 text-[10px] text-cyan-400/80 mt-0.5">
                  <CornerDownRight className="w-2.5 h-2.5" />
                  <span className="truncate font-serif italic">{item.sectionIdentifier}</span>
                </div>
              </div>
              <span className="text-[9px] text-zinc-600 shrink-0 font-mono">{item.timestamp}</span>
            </div>

            <div className="mt-4 pt-3 border-t border-white/5">
              <p className="text-xs text-zinc-400 line-clamp-2 italic leading-relaxed">
                "{item.translatedContent}"
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
