import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { Clock, Zap, FileText, Copy, Check, Download, Send, Bot, User } from 'lucide-react';

interface OutputPanelProps {
  messages: ChatMessage[];
  loading: boolean;
  onSendMessage: (text: string) => void;
  onClose?: () => void;
}

export default function OutputPanel({ messages, loading, onSendMessage }: OutputPanelProps) {
  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // Focus input after loading finishes
  useEffect(() => {
    if (!loading && messages.length > 0) {
      inputRef.current?.focus();
    }
  }, [loading, messages.length]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadTranscript = () => {
    if (messages.length === 0) return;
    const content = messages.map(m => `[${m.role.toUpperCase()}] ${new Date(m.timestamp).toLocaleTimeString()}\n${m.text}\n`).join('\n---\n\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-transcript-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    onSendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (messages.length === 0 && !loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center bg-slate-900/50">
        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
          <Zap className="w-8 h-8 opacity-50" />
        </div>
        <h3 className="text-lg font-medium text-slate-300 mb-2">Ready to Run</h3>
        <p className="max-w-xs text-sm">Configure your variables and press 'Run' to see the model output here.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 border-l border-slate-800">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 backdrop-blur z-10 sticky top-0">
        <h2 className="font-semibold text-slate-200 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          Output / Chat
        </h2>
        {messages.length > 0 && (
          <button 
            onClick={handleDownloadTranscript}
            className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors"
            title="Download Transcript"
          >
            <Download className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6" ref={scrollRef}>
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-slate-700'}`}>
              {msg.role === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-blue-200" />}
            </div>
            
            <div className={`group relative max-w-[85%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-indigo-900/30 border border-indigo-500/30 text-slate-200 rounded-tr-sm' : 'bg-slate-800/50 border border-slate-700 text-slate-300 rounded-tl-sm'}`}>
              <div className="prose prose-invert prose-sm max-w-none break-words whitespace-pre-wrap leading-relaxed">
                {msg.text}
              </div>
              
              {/* Message Actions */}
              <div className={`absolute top-2 ${msg.role === 'user' ? '-left-10' : '-right-10'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                <button
                  onClick={() => handleCopy(msg.text, msg.id)}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-md border border-slate-700 shadow-sm"
                  title="Copy message"
                >
                  {copiedId === msg.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
               <Bot className="w-5 h-5 text-blue-200" />
             </div>
             <div className="bg-slate-800/50 border border-slate-700 rounded-2xl rounded-tl-sm p-4 flex items-center gap-2">
               <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
               <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
               <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
             </div>
          </div>
        )}
      </div>
      
      {/* Input Area */}
      <div className="p-4 bg-slate-900 border-t border-slate-800">
        <div className="relative flex items-end gap-2 bg-slate-800/50 rounded-xl border border-slate-700 p-2 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:border-indigo-500/50 transition-all">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a follow-up..."
            className="w-full bg-transparent border-none focus:outline-none text-sm text-slate-200 placeholder-slate-500 resize-none max-h-32 py-2 px-1"
            rows={1}
            style={{ minHeight: '40px' }}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!input.trim() || loading}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors mb-0.5"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="text-[10px] text-slate-500 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}