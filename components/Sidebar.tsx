import React from 'react';
import { PromptTemplate } from '../types';
import { LayoutTemplate, Plus, Trash2 } from 'lucide-react';

interface SidebarProps {
  templates: PromptTemplate[];
  onSelectTemplate: (template: PromptTemplate) => void;
  onDeleteTemplate: (id: string) => void;
  onCreateNew: () => void;
  isOpen: boolean;
  selectedTemplateId: string | null;
}

export default function Sidebar({ 
  templates = [], 
  onSelectTemplate, 
  onDeleteTemplate, 
  onCreateNew,
  isOpen,
  selectedTemplateId
}: SidebarProps) {
  const categories = Array.from(new Set(templates.map(t => t.category)));

  return (
    <div className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static inset-y-0 left-0 z-40 w-72 bg-slate-900 border-r border-slate-800 transition-transform duration-300 ease-in-out flex flex-col`}>
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-2">
          <LayoutTemplate className="w-6 h-6 text-blue-500" />
          PromptForge
        </h1>
      </div>

      <div className="p-4">
        <button 
          onClick={onCreateNew}
          className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white py-2 px-4 rounded-lg transition-colors font-medium shadow-lg shadow-primary-900/20"
        >
          <Plus className="w-4 h-4" />
          New Prompt
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-6">
        {categories.map(category => (
          <div key={category}>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">
              {category}
            </h3>
            <div className="space-y-1">
              {templates.filter(t => t.category === category).map(template => (
                <div 
                  key={template.id}
                  className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-all ${selectedTemplateId === template.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'}`}
                  onClick={() => onSelectTemplate(template)}
                >
                  <div className="truncate flex-1">
                    <div className="font-medium truncate text-sm">{template.name}</div>
                    <div className="text-xs text-slate-500 truncate">{template.description}</div>
                  </div>
                  {template.category === 'Custom' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTemplate(template.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-900/30 text-slate-500 hover:text-red-400 rounded transition-all"
                      title="Delete Template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {/* Handle legacy custom templates or dynamically named ones */}
                  {template.id.startsWith('custom_') && template.category !== 'Custom' && (
                     <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTemplate(template.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-900/30 text-slate-500 hover:text-red-400 rounded transition-all"
                      title="Delete Template"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-600 text-center">
        Powered by Gemini 2.5 & 3.0
      </div>
    </div>
  );
}