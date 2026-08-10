import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface FastDOBPickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const FastDOBPicker: React.FC<FastDOBPickerProps> = ({
  value,
  onChange,
  placeholder = "Select Date of Birth",
  className = "",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'year' | 'month' | 'day'>('year');
  
  const [selectedYear, setSelectedYear] = useState<number>(1995);
  const [selectedMonth, setSelectedMonth] = useState<number>(5); // 1-indexed (1-12)
  const [selectedDay, setSelectedDay] = useState<number>(16);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Years range from 1930 to current year
  const currentYear = new Date().getFullYear();
  const startYear = 1930;
  const years: number[] = [];
  for (let y = currentYear; y >= startYear; y--) {
    years.push(y);
  }

  const months = [
    { name: "January", short: "Jan", val: 1 },
    { name: "February", short: "Feb", val: 2 },
    { name: "March", short: "Mar", val: 3 },
    { name: "April", short: "Apr", val: 4 },
    { name: "May", short: "May", val: 5 },
    { name: "June", short: "Jun", val: 6 },
    { name: "July", short: "Jul", val: 7 },
    { name: "August", short: "Aug", val: 8 },
    { name: "September", short: "Sep", val: 9 },
    { name: "October", short: "Oct", val: 10 },
    { name: "November", short: "Nov", val: 11 },
    { name: "December", short: "Dec", val: 12 },
  ];

  // Parse existing value
  useEffect(() => {
    if (value && value.includes('-')) {
      const parts = value.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        if (!isNaN(y)) setSelectedYear(y);
        if (!isNaN(m)) setSelectedMonth(m);
        if (!isNaN(d)) setSelectedDay(d);
      }
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Scroll active year into view in grid
  useEffect(() => {
    if (isOpen && step === 'year' && scrollRef.current) {
      setTimeout(() => {
        const activeElem = scrollRef.current?.querySelector('[data-active-year="true"]');
        if (activeElem) {
          activeElem.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
      }, 50);
    }
  }, [isOpen, step]);

  const handleOpen = () => {
    if (disabled) return;
    setStep('year'); // Show Year first as requested
    setIsOpen(true);
  };

  // Days count helper
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setStep('month');
  };

  const handleMonthSelect = (monthVal: number) => {
    setSelectedMonth(monthVal);
    setStep('day');
  };

  const handleDaySelect = (day: number) => {
    setSelectedDay(day);
    const formattedMonth = String(selectedMonth).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const fullDate = `${selectedYear}-${formattedMonth}-${formattedDay}`;
    onChange(fullDate);
    setIsOpen(false);
  };

  const daysCount = getDaysInMonth(selectedYear, selectedMonth);
  const days = Array.from({ length: daysCount }, (_, i) => i + 1);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div 
        onClick={handleOpen}
        className={`flex items-center justify-between w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 cursor-pointer select-none focus-within:ring-4 focus-within:ring-blue-50 focus-within:border-blue-400 transition-all ${disabled ? "opacity-60 cursor-not-allowed bg-slate-100" : ""} ${className}`}
      >
        <span className={value ? "text-slate-800 font-bold" : "text-slate-400 font-bold"}>
          {value || placeholder}
        </span>
        <button 
          type="button"
          tabIndex={-1}
          className="text-slate-400 hover:text-blue-500 transition-colors"
        >
          <Calendar size={16} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-[9000] p-4 animate-in fade-in zoom-in-95 duration-100">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <span 
                className={`cursor-pointer hover:text-blue-600 ${step === 'year' ? 'text-blue-600 font-extrabold underline' : ''}`}
                onClick={() => setStep('year')}
              >
                {selectedYear || 'Year'}
              </span>
              <span className="text-slate-300">/</span>
              <span 
                className={`cursor-pointer hover:text-blue-600 ${step === 'month' ? 'text-blue-600 font-extrabold underline' : ''} ${step === 'year' ? 'opacity-40 pointer-events-none' : ''}`}
                onClick={() => setStep('month')}
              >
                {months.find(m => m.val === selectedMonth)?.short || 'Month'}
              </span>
              <span className="text-slate-300">/</span>
              <span 
                className={`cursor-pointer hover:text-blue-600 ${step === 'day' ? 'text-blue-600 font-extrabold underline' : ''} ${step !== 'day' ? 'opacity-40 pointer-events-none' : ''}`}
                onClick={() => setStep('day')}
              >
                Day
              </span>
            </div>
            <button 
              type="button" 
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded"
            >
              <X size={14} />
            </button>
          </div>

          {/* Stepper Content */}
          {step === 'year' && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 text-center">
                Select Year
              </p>
              <div 
                ref={scrollRef}
                className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1 no-scrollbar-y"
              >
                {years.map((y) => (
                  <button
                    key={y}
                    type="button"
                    data-active-year={y === selectedYear}
                    onClick={() => handleYearSelect(y)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                      y === selectedYear 
                        ? 'bg-blue-900 text-white shadow-sm' 
                        : 'bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    {y}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'month' && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 text-center">
                Select Month
              </p>
              <div className="grid grid-cols-3 gap-2">
                {months.map((m) => (
                  <button
                    key={m.val}
                    type="button"
                    onClick={() => handleMonthSelect(m.val)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                      m.val === selectedMonth 
                        ? 'bg-blue-900 text-white shadow-sm' 
                        : 'bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    {m.short}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'day' && (
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1 text-center">
                Select Date
              </p>
              <div className="grid grid-cols-7 gap-1 max-h-48 overflow-y-auto">
                {days.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleDaySelect(d)}
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-extrabold transition-all mx-auto ${
                      d === selectedDay 
                        ? 'bg-blue-900 text-white shadow-sm' 
                        : 'bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-600'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
