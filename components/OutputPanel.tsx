import React from 'react';
import { GenerationResult } from '../types';
import { Clock, Zap, FileText, Copy, Check, Download } from 'lucide-react';

interface OutputPanelProps {
  result: GenerationResult | null;
  loading: boolean;
  onClose?: () => void;
}

export default function OutputPanel({ result, loading }: OutputPanelProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!result) return;
    const blob = new Blob([result.text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gemini-output-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!result && !loading) {
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
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/95 backdrop-blur z-10 sticky top-0">
        <h2 className="font-semibold text-slate-200 flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" />
          Output
        </h2>
        {result && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded-full">
              <Clock className="w-3 h-3" />
              {(result.duration).toFixed(0)}ms
            </div>
            
            <div className="flex items-center gap-1 bg-slate-800/50 rounded-lg p-0.5 border border-slate-800">
              <button 
                onClick={handleDownload}
                className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors"
                title="Download Output"
              >
                <Download className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-slate-700"></div>
              <button 
                onClick={handleCopy}
                className="p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-4 bg-slate-800 rounded w-3/4"></div>
            <div className="h-4 bg-slate-800 rounded w-full"></div>
            <div className="h-4 bg-slate-800 rounded w-5/6"></div>
            <div className="h-4 bg-slate-800 rounded w-4/5"></div>
            <div className="h-32 bg-slate-800 rounded w-full mt-6"></div>
          </div>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-mono text-sm text-slate-300 leading-relaxed">
              {result?.text}
            </pre>
          </div>
        )}
      </div>
      
      {result && (
        <div className="p-3 bg-slate-950 border-t border-slate-800 text-xs text-slate-500 font-mono">
           Model: {result.model}
        </div>
      )}
    </div>
  );
}