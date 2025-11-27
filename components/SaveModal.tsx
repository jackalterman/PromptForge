import React, { useState, useEffect } from 'react';
import { X, Save, FolderPlus } from 'lucide-react';

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description: string, category: string) => void;
  initialName?: string;
  initialDescription?: string;
  initialCategory?: string;
  existingCategories: string[];
}

export default function SaveModal({
  isOpen,
  onClose,
  onSave,
  initialName = '',
  initialDescription = '',
  initialCategory = '',
  existingCategories
}: SaveModalProps) {
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [category, setCategory] = useState(initialCategory || 'Custom');
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setDescription(initialDescription);
      
      // Check if the initial category is in the existing list
      if (initialCategory && !existingCategories.includes(initialCategory)) {
        setIsNewCategory(true);
        setNewCategoryName(initialCategory);
        setCategory('__new__');
      } else {
        setCategory(initialCategory || (existingCategories[0] || 'Custom'));
        setIsNewCategory(false);
        setNewCategoryName('');
      }
    }
  }, [isOpen, initialName, initialDescription, initialCategory, existingCategories]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = isNewCategory ? newCategoryName : category;
    if (!name.trim()) return;
    if (isNewCategory && !newCategoryName.trim()) return;
    
    onSave(name, description, finalCategory);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-md m-4 overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Save className="w-5 h-5 text-blue-500" />
            Save Template
          </h2>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 hover:bg-slate-800 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          
          {/* Name Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-400 uppercase">Template Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
              placeholder="e.g., Python Code Generator"
              autoFocus
              required
            />
          </div>

          {/* Description Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-400 uppercase">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 resize-none h-20"
              placeholder="Briefly describe what this prompt does..."
            />
          </div>

          {/* Category Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-400 uppercase">Category</label>
            <div className="flex gap-2">
              {!isNewCategory ? (
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setIsNewCategory(true);
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="flex-1 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                >
                  {existingCategories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="__new__">+ Create New Category</option>
                </select>
              ) : (
                <div className="flex-1 flex gap-2">
                  <div className="relative flex-1">
                    <FolderPlus className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="w-full pl-9 bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                      placeholder="New Category Name"
                      required
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsNewCategory(false)}
                    className="px-3 py-2 text-xs bg-slate-800 text-slate-400 hover:text-white border border-slate-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg shadow-lg shadow-blue-900/20 transition-all transform active:scale-95"
            >
              Save Template
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}