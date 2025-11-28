import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Menu, Wand2, Play, Save, Settings2, Code, RotateCcw, ChevronDown, Copy, ExternalLink } from 'lucide-react';
import Sidebar from './components/Sidebar';
import OutputPanel from './components/OutputPanel';
import SaveModal from './components/SaveModal';
import { INITIAL_TEMPLATES } from './constants';
import { PromptTemplate, Variable, ModelType, ChatMessage } from './types';
import { generateCompletion, optimizePrompt, createChatSession, sendChatMessage } from './services/geminiService';
import { Chat } from '@google/genai';

export default function App() {
  // State
  const [templates, setTemplates] = useState<PromptTemplate[]>(INITIAL_TEMPLATES);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [variables, setVariables] = useState<Variable[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Cache to store variable values by name to persist them when switching templates
  const variableCacheRef = useRef<Record<string, string>>({});
  
  // Refs
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const chatSessionRef = useRef<Chat | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  
  // Execution State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelType>(ModelType.FLASH);
  const [showOutputPanel, setShowOutputPanel] = useState(false);
  
  // Modal State
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);

  // Resizing State
  const [outputPanelWidth, setOutputPanelWidth] = useState(450);
  const [isResizing, setIsResizing] = useState(false);
  const resizingRef = useRef(false);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1024);

  // Initialize from LocalStorage
  useEffect(() => {
    const saved = localStorage.getItem('promptforge_custom_templates');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setTemplates(prev => {
            // Merge initial templates with saved ones
            const standardIds = new Set(prev.map(t => t.id));
            const uniqueSaved = parsed.filter((t: PromptTemplate) => !standardIds.has(t.id));
            return [...prev, ...uniqueSaved];
          });
        }
      } catch (e) {
        console.error("Failed to load saved templates", e);
      }
    }
  }, []);

  // Handle window resize for responsive layout
  useEffect(() => {
    const handleResize = () => setIsLargeScreen(window.innerWidth >= 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close actions menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setIsActionsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Resizing Logic
  const startResizing = useCallback(() => {
    setIsResizing(true);
    resizingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
    resizingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!resizingRef.current) return;
    
    // Calculate new width: Window Width - Mouse X Position
    const newWidth = window.innerWidth - e.clientX;
    
    // Constraints
    const minWidth = 320;
    const maxWidth = window.innerWidth - 350; // Keep at least 350px for the editor/sidebar
    
    if (newWidth >= minWidth && newWidth <= maxWidth) {
      setOutputPanelWidth(newWidth);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [handleMouseMove, stopResizing]);

  // Save custom templates to LocalStorage
  const saveCustomTemplates = (updatedTemplates: PromptTemplate[]) => {
    const custom = updatedTemplates.filter(t => t.id.startsWith('custom_'));
    localStorage.setItem('promptforge_custom_templates', JSON.stringify(custom));
    setTemplates(updatedTemplates);
  };

  // Variable Extraction
  const extractVariables = useCallback((text: string) => {
    // Defensive check
    if (typeof text !== 'string') {
      setVariables([]);
      return;
    }

    const regex = /\{\{(.*?)\}\}/g;
    const matches = Array.from(text.matchAll(regex));
    const newVars: Variable[] = [];
    const seen = new Set();
    
    matches.forEach(match => {
      const name = match[1].trim();
      if (!seen.has(name) && name) {
        seen.add(name);
        // Look up in cache first to persist value
        const cachedValue = variableCacheRef.current[name] || '';
        newVars.push({ name, value: cachedValue });
      }
    });
    
    // Merge with existing values to keep focused inputs or immediate changes
    setVariables(prev => {
      const safePrev = Array.isArray(prev) ? prev : [];
      // Create a map of current variables for easy lookup
      const prevMap = new Map(safePrev.map(p => [p.name, p.value]));
      
      return newVars.map(nv => {
        // If the variable existed in the previous state, prefer that value
        if (prevMap.has(nv.name)) {
          return { ...nv, value: prevMap.get(nv.name) || '' };
        }
        return nv;
      });
    });
  }, []);

  useEffect(() => {
    extractVariables(currentPrompt);
  }, [currentPrompt, extractVariables]);

  // Handlers
  const handleSelectTemplate = (template: PromptTemplate) => {
    if (!template) return;
    setCurrentPrompt(template.content || '');
    setSelectedTemplateId(template.id);
    if (window.innerWidth < 768) setSidebarOpen(false); // Auto close on mobile
  };

  const handleCreateNew = () => {
    setCurrentPrompt("");
    setSelectedTemplateId(null);
    setVariables([]);
    setMessages([]);
    chatSessionRef.current = null;
  };

  const handleDeleteTemplate = (id: string) => {
    if (confirm("Are you sure you want to delete this template?")) {
      const updated = templates.filter(t => t.id !== id);
      saveCustomTemplates(updated);
      if (selectedTemplateId === id) handleCreateNew();
    }
  };

  const handleOpenSaveModal = () => {
    if (!currentPrompt || !currentPrompt.trim()) return;
    setIsSaveModalOpen(true);
  };

  const handleConfirmSave = (name: string, description: string, category: string) => {
    const isUpdating = selectedTemplateId && selectedTemplateId.startsWith('custom_');
    const newId = isUpdating ? selectedTemplateId : `custom_${Date.now()}`;

    const newTemplate: PromptTemplate = {
      id: newId!,
      name,
      description,
      category,
      content: currentPrompt,
      tags: isUpdating ? (templates.find(t => t.id === selectedTemplateId)?.tags || ['custom']) : ['custom']
    };

    let updatedTemplates;
    if (isUpdating) {
      updatedTemplates = templates.map(t => t.id === newId ? newTemplate : t);
    } else {
      updatedTemplates = [...templates, newTemplate];
    }

    saveCustomTemplates(updatedTemplates);
    setSelectedTemplateId(newId);
    setIsSaveModalOpen(false);
  };

  const handleOptimize = async () => {
    if (!currentPrompt.trim()) return;
    setIsOptimizing(true);
    try {
      const optimized = await optimizePrompt(currentPrompt);
      setCurrentPrompt(optimized);
    } catch (e) {
      alert("Failed to optimize prompt. Check console/API key.");
    } finally {
      setIsOptimizing(false);
    }
  };

  const getInterpolatedPrompt = () => {
    let finalPrompt = currentPrompt;
    variables.forEach(v => {
      // Escape special characters in variable names for regex
      const escapedName = v.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\{\\{\\s*${escapedName}\\s*\\}\\}`, 'g');
      finalPrompt = finalPrompt.replace(regex, v.value);
    });
    return finalPrompt;
  };

  const handleCopyFilledPrompt = async () => {
    const text = getInterpolatedPrompt();
    try {
      await navigator.clipboard.writeText(text);
      setIsActionsMenuOpen(false);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleOpenExternal = async (url: string) => {
    const text = getInterpolatedPrompt();
    try {
      await navigator.clipboard.writeText(text);
      window.open(url, '_blank');
      setIsActionsMenuOpen(false);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleRun = async () => {
    if (!currentPrompt.trim()) return;
    setIsLoading(true);
    setShowOutputPanel(true);
    setMessages([]); // Clear previous chat
    
    // 1. Interpolate variables
    const finalPrompt = getInterpolatedPrompt();

    // 2. Add User Message immediately
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: finalPrompt,
      timestamp: Date.now()
    };
    setMessages([userMsg]);

    try {
      // 3. Initialize Chat Session
      chatSessionRef.current = createChatSession(selectedModel);
      
      // 4. Send Message
      const result = await sendChatMessage(chatSessionRef.current, finalPrompt);
      
      // 5. Add Model Response
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: result.text,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, modelMsg]);
      
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'error',
        text: "Error running prompt. Ensure API Key is set and model is available.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChatSubmit = async (text: string) => {
    if (!chatSessionRef.current || !text.trim()) return;
    setIsLoading(true);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: text,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const result = await sendChatMessage(chatSessionRef.current, text);
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: result.text,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, modelMsg]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'error',
        text: "Failed to send message.",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVariableChange = (name: string, val: string) => {
    setVariables(prev => prev.map(v => v.name === name ? { ...v, value: val } : v));
    // Update global cache immediately so value persists if template changes
    variableCacheRef.current[name] = val;
  };

  // Get current template details for modal pre-fill
  const activeTemplate = templates.find(t => t.id === selectedTemplateId);
  const existingCategories: string[] = Array.from(new Set(templates.map(t => t.category)));

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-200 font-sans">
      <Sidebar 
        templates={templates}
        isOpen={sidebarOpen}
        onSelectTemplate={handleSelectTemplate}
        onDeleteTemplate={handleDeleteTemplate}
        onCreateNew={handleCreateNew}
        selectedTemplateId={selectedTemplateId}
      />

      <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 relative">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur flex items-center px-4 justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-800 rounded-md text-slate-400"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm font-medium text-slate-400 hidden sm:block truncate max-w-[200px]">
              {selectedTemplateId ? activeTemplate?.name : 'Untitled Draft'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
               <button 
                onClick={() => setSelectedModel(ModelType.FLASH)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${selectedModel === ModelType.FLASH ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Flash 2.5
              </button>
              <button 
                onClick={() => setSelectedModel(ModelType.PRO)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${selectedModel === ModelType.PRO ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Pro 3.0
              </button>
               <button 
                onClick={() => setSelectedModel(ModelType.THINKING_PRO)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${selectedModel === ModelType.THINKING_PRO ? 'bg-purple-900/50 text-purple-200 shadow-sm border border-purple-800' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Settings2 className="w-3 h-3" />
                Thinking
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 flex overflow-hidden">
          <div className={`flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto ${showOutputPanel ? 'hidden lg:flex' : 'flex'}`}>
            
            {/* Editor Toolbar */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold flex items-center gap-2 text-white">
                  <Code className="w-5 h-5 text-slate-500" />
                  Editor
                </h2>
                <span className="text-xs text-slate-500 hidden sm:inline-block">
                  Type <span className="text-blue-400 font-mono">{`{{variable}}`}</span> to add dynamic fields.
                </span>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={handleOptimize}
                  disabled={isOptimizing || !currentPrompt}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600/10 text-indigo-400 border border-indigo-600/30 hover:bg-indigo-600/20 rounded-md text-sm transition-colors disabled:opacity-50"
                  title="Use AI to improve your prompt"
                >
                  <Wand2 className={`w-4 h-4 ${isOptimizing ? 'animate-spin' : ''}`} />
                  {isOptimizing ? 'Optimizing...' : 'Optimize'}
                </button>
                
                <button 
                  onClick={handleOpenSaveModal}
                  disabled={!currentPrompt}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-sm transition-all disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Save
                </button>
              </div>
            </div>

            {/* Main Input */}
            <div className="flex-1 relative group min-h-[300px]">
              <textarea
                ref={editorRef}
                value={currentPrompt}
                onChange={(e) => setCurrentPrompt(e.target.value)}
                className="w-full h-full bg-slate-900 border border-slate-800 rounded-lg p-4 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 resize-none text-slate-300 placeholder-slate-600"
                placeholder="Type your prompt here or select a template... use {{variable}} for dynamic inputs."
                spellCheck={false}
              />
              <div className="absolute bottom-4 right-4 text-xs text-slate-600 pointer-events-none bg-slate-900/80 px-2 rounded">
                {currentPrompt.length} chars
              </div>
            </div>

            {/* Variables Section */}
            {variables.length > 0 && (
              <div className="mt-6 animate-in slide-in-from-bottom-5 fade-in duration-300">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide flex items-center gap-2">
                    <Settings2 className="w-4 h-4" />
                    Variables
                  </h3>
                  <button 
                    onClick={() => {
                        setVariables(variables.map(v => ({...v, value: ''})));
                        // Clear specific vars from cache
                        variables.forEach(v => delete variableCacheRef.current[v.name]);
                    }}
                    className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" /> Clear Values
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {variables.map(variable => (
                    <div key={variable.name} className="space-y-1">
                      <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                        <span className="text-blue-400 font-mono">{`{{`}</span>
                        {variable.name}
                        <span className="text-blue-400 font-mono">{`}}`}</span>
                      </label>
                      <textarea 
                        value={variable.value}
                        onChange={(e) => handleVariableChange(variable.name, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 font-mono resize-y min-h-[80px]"
                        placeholder={`Enter content for {{${variable.name}}}...`}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Run Bar (Mobile/Desktop) */}
            <div className="mt-6 flex justify-end gap-3 relative">
               <div className="relative z-20" ref={actionsMenuRef}>
                 <div className="flex rounded-lg shadow-lg shadow-indigo-900/20 isolate">
                  <button 
                    onClick={handleRun}
                    disabled={isLoading || !currentPrompt}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 pl-6 pr-4 rounded-l-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed border-r border-indigo-500/30"
                  >
                    <Play className={`w-4 h-4 ${isLoading ? 'hidden' : 'block'} fill-current`} />
                    {isLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Running
                      </>
                    ) : 'Run Prompt'}
                  </button>
                  <button
                    onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                    disabled={isLoading || !currentPrompt}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 px-3 rounded-r-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${isActionsMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                 
                 {isActionsMenuOpen && (
                   <div className="absolute bottom-full right-0 mb-2 w-72 bg-slate-800 border border-slate-700 rounded-xl shadow-xl overflow-hidden flex flex-col divide-y divide-slate-700/50 animate-in fade-in zoom-in-95 duration-100">
                     <button 
                       onClick={handleCopyFilledPrompt}
                       className="flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white text-left transition-colors"
                     >
                       <Copy className="w-4 h-4 text-slate-400" />
                       Copy Filled Prompt
                     </button>
                     
                     <div>
                       <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-800/50">
                         Run in External App
                       </div>

                       <button 
                         onClick={() => handleOpenExternal('https://chatgpt.com/')}
                         className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white text-left transition-colors"
                       >
                         <ExternalLink className="w-4 h-4 text-green-400" />
                         ChatGPT
                       </button>
                       <button 
                         onClick={() => handleOpenExternal('https://claude.ai/')}
                         className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white text-left transition-colors"
                       >
                         <ExternalLink className="w-4 h-4 text-orange-400" />
                         Claude
                       </button>
                       <button 
                         onClick={() => handleOpenExternal('https://gemini.google.com/')}
                         className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-slate-700 hover:text-white text-left transition-colors"
                       >
                         <ExternalLink className="w-4 h-4 text-blue-400" />
                         Gemini Web
                       </button>
                     </div>
                   </div>
                 )}
               </div>
            </div>

          </div>

          {/* Right Panel (Output) */}
          <div 
            className={`
              ${showOutputPanel ? 'block' : 'hidden'} 
              lg:block 
              border-l border-slate-800 bg-slate-900 relative
              ${isResizing ? '' : 'transition-[width] duration-300'}
            `}
            style={{ 
              width: isLargeScreen ? outputPanelWidth : '100%',
              minWidth: isLargeScreen ? 320 : 'auto'
            }}
          >
             {/* Resize Handle (Desktop Only) */}
             <div
                className={`
                  hidden lg:block absolute -left-1.5 top-0 bottom-0 w-3 cursor-col-resize z-50 
                  transition-colors hover:bg-blue-500/20 active:bg-blue-500/40
                  ${isResizing ? 'bg-blue-500/40' : ''}
                `}
                onMouseDown={startResizing}
                title="Drag to resize"
             >
               {/* Visual indicator line in the center of the handle */}
               <div className="absolute left-1.5 top-0 bottom-0 w-[1px] bg-slate-800" />
             </div>

             {/* Close button for mobile/tablet view of output */}
             <div className="lg:hidden absolute top-3 right-3 z-20">
               <button onClick={() => setShowOutputPanel(false)} className="bg-slate-800 p-2 rounded-full text-white">X</button>
             </div>
             
             <OutputPanel 
              messages={messages} 
              loading={isLoading} 
              onSendMessage={handleChatSubmit} 
            />
          </div>
        </div>
      </main>

      <SaveModal 
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleConfirmSave}
        initialName={activeTemplate?.name || ''}
        initialDescription={activeTemplate?.description || ''}
        initialCategory={activeTemplate?.category || ''}
        existingCategories={existingCategories}
      />
    </div>
  );
}