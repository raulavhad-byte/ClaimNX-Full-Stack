
import React, { useState, useEffect, useRef } from 'react';
import { Search, CheckCircle2, AlertCircle, Plus, X, ChevronDown } from 'lucide-react';
import { MASTER_DIAGNOSES } from '../constants/diagnoses';

interface DiagnosisAutocompleteProps {
  value: string;
  onChange: (value: string, isManual: boolean) => void;
  placeholder?: string;
  required?: boolean;
}

const DiagnosisAutocomplete: React.FC<DiagnosisAutocompleteProps> = ({
  value = "",
  onChange,
  placeholder = "Search or enter diagnosis...",
  required = false
}) => {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
    const match = MASTER_DIAGNOSES.find(d => d.toLowerCase() === value.toLowerCase());
    setIsManual(value.length > 0 && !match);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setQuery(val);
    
    if (val.length > 0) {
      const filtered = MASTER_DIAGNOSES.filter(d => 
        d.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 10);
      setSuggestions(filtered);
      setIsOpen(true);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }

    const match = MASTER_DIAGNOSES.find(d => d.toLowerCase() === val.toLowerCase());
    onChange(val, val.length > 0 && !match);
  };

  const handleSelect = (diagnosis: string) => {
    setQuery(diagnosis);
    setIsOpen(false);
    onChange(diagnosis, false);
  };

  const handleManualEntry = () => {
    setIsOpen(false);
    onChange(query, true);
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative group">
        <textarea
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className={`w-full p-4 pr-12 bg-slate-50/50 border rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all min-h-[90px] resize-none placeholder:text-slate-300 ${
            isManual ? 'border-amber-300 focus:border-amber-400' : 'border-slate-200 focus:border-blue-400'
          }`}
        />
        <div className="absolute right-4 top-4 flex flex-col gap-2">
          {query.length > 0 && (
            <button 
              onClick={() => { setQuery(''); onChange('', false); }}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={14} />
            </button>
          )}
          {isManual ? (
            <div className="text-amber-500" title="Manual Entry - Not in master list">
              <AlertCircle size={16} />
            </div>
          ) : query.length > 0 && (
            <div className="text-emerald-500" title="Standardized Diagnosis">
              <CheckCircle2 size={16} />
            </div>
          )}
        </div>
      </div>

      {isManual && query.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg">
          <AlertCircle size={12} className="text-amber-600" />
          <p className="text-[9px] font-bold text-amber-700 uppercase tracking-tight">
            Manual Entry: This diagnosis will be flagged for review.
          </p>
        </div>
      )}

      {isOpen && (suggestions.length > 0 || query.length > 0) && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white border border-slate-100 rounded-2xl shadow-xl z-[100] overflow-hidden animate-in slide-in-from-top-2">
          <div className="py-2">
            <p className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
              {suggestions.length > 0 ? 'Suggested Diagnoses' : 'No matches found'}
            </p>
            
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSelect(suggestion)}
                className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0 flex items-center gap-3 group"
              >
                <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <CheckCircle2 size={14} />
                </div>
                <span className="text-xs font-bold text-slate-700 group-hover:text-blue-700">{suggestion}</span>
              </button>
            ))}

            {query.length > 0 && !MASTER_DIAGNOSES.includes(query) && (
              <button
                onClick={handleManualEntry}
                className="w-full text-left px-4 py-3 hover:bg-amber-50 transition-colors flex items-center gap-3 group"
              >
                <div className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Plus size={14} />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-700 group-hover:text-amber-700">Use "{query}" as manual entry</span>
                  <p className="text-[9px] text-slate-400 font-medium">Encouraged to select from standardized list</p>
                </div>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiagnosisAutocomplete;
