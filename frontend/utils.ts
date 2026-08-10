import html2canvas from 'html2canvas';

/**
 * Standard date formatting for ClaimNX App
 * Format: DD-MM-YYYY
 */
export const parseDate = (date: any): Date => {
  if (!date) return new Date(NaN);
  if (typeof Date === 'function' && date instanceof Date) return date;
  
  if (date && typeof date.toDate === 'function') return date.toDate();
  if (date && typeof date === 'object' && ('seconds' in date || '_seconds' in date)) {
    const s = date.seconds || date._seconds;
    return new Date(s * 1000);
  }

  // Handle DD-MM-YYYY strings safely
  if (typeof date === 'string' && date.includes('-')) {
    const parts = date.split('-');
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      }
    }
  }
  
  const d = new Date(date);
  return d;
};

export const formatDate = (date: any): string => {
  const d = parseDate(date);
  if (isNaN(d.getTime())) return 'N/A';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  
  return `${day}-${month}-${year}`;
};

export const safeFormatYmd = (date: any): string => {
  if (!date) return '';
  try {
    const d = parseDate(date);
    if (!d || isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    console.error("Error safe-formatting date to YMD:", e);
    return '';
  }
};

export const isValidYearFormat = (dateStr: string): boolean => {
  if (!dateStr) return true;
  const d = parseDate(dateStr);
  if (isNaN(d.getTime())) return true;
  const year = d.getFullYear();
  return year.toString().length === 4;
};

export const checkDateReasonability = (date: any, type: 'dob' | 'other' = 'other'): { 
  isReasonable: boolean; 
  message: string;
  isFuture: boolean;
  isOld: boolean;
} => {
  const d = parseDate(date);

  if (isNaN(d.getTime())) return { isReasonable: true, message: '', isFuture: false, isOld: false };

  const now = new Date();
  const currentYear = now.getFullYear();
  const dateYear = d.getFullYear();
  
  if (type === 'dob') {
    if (dateYear < currentYear - 120) {
      return { isReasonable: false, message: 'entered an unusually old Date of Birth', isFuture: false, isOld: true };
    }
    if (d > now) {
      return { isReasonable: false, message: 'entered a future Date of Birth', isFuture: true, isOld: false };
    }
  } else {
    if (dateYear < currentYear - 10) {
      return { isReasonable: false, message: 'entered a date from over 10 years ago', isFuture: false, isOld: true };
    }
    if (dateYear > currentYear + 10) {
      return { isReasonable: false, message: 'entered a date over 10 years in the future', isFuture: true, isOld: false };
    }
  }

  return { isReasonable: true, message: '', isFuture: false, isOld: false };
};

export const formatDateTime = (date: any): string => {
  const d = parseDate(date);
  if (isNaN(d.getTime())) return 'N/A';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return `${day}-${month}-${year} ${hours}:${minutes}`;
};

export const formatTAT = (startDate: any, endDate: any = new Date()): string => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '---';
  
  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return '00:00';
  
  const totalMinutes = Math.floor(diffMs / 60000);
  const totalHrs = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  
  if (totalHrs >= 24) {
    const days = Math.floor(totalHrs / 24);
    const remHrs = totalHrs % 24;
    return `${days}d ${remHrs}h`;
  }
  
  return `${totalHrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

export function resolveOklchColor(colorStr: string): string {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = colorStr;
      const resolved = ctx.fillStyle;
      if (resolved && !resolved.includes('oklch')) {
        return resolved;
      }
    }
  } catch (e) {}

  try {
    const parts = colorStr.match(/oklch\(\s*([0-9.%]+)\s+([0-9.]+)\s+([0-9.]+)(?:\s*\/\s*([0-9.%]+))?\s*\)/);
    if (parts) {
      const lAttr = parts[1];
      const l = lAttr.endsWith('%') ? parseFloat(lAttr) / 100 : parseFloat(lAttr);
      const c = parseFloat(parts[2]);
      const h = parseFloat(parts[3]);
      const aAttr = parts[4];
      const a = aAttr ? (aAttr.endsWith('%') ? parseFloat(aAttr) / 100 : parseFloat(aAttr)) : 1;

      const hueRad = (h * Math.PI) / 180;
      
      const l_ = l;
      const a_ = c * Math.cos(hueRad);
      const b_ = c * Math.sin(hueRad);

      let r_ = l_ + 0.3963377774 * a_ + 0.2158037573 * b_;
      let g_ = l_ - 0.1055613458 * a_ - 0.0638541728 * b_;
      let b__ = l_ - 0.0894841775 * a_ - 1.291485548 * b_;

      const gamma = (x: number) => {
        const cx = Math.max(0, Math.min(1, x));
        return cx <= 0.0031308 ? 12.92 * cx : 1.055 * Math.pow(cx, 1 / 2.4) - 0.055;
      };

      const r = Math.round(gamma(r_) * 255);
      const g = Math.round(gamma(g_) * 255);
      const blue = Math.round(gamma(b__) * 255);

      return `rgba(${r}, ${g}, ${blue}, ${a})`;
    }
  } catch (err) {}

  return 'rgb(128, 128, 128)';
}

export function replaceOklchWithRgb(cssValue: string): string {
  if (typeof cssValue !== 'string') return cssValue;
  if (!cssValue.includes('oklch')) return cssValue;
  
  try {
    return cssValue.replace(/oklch\([^)]+\)/g, (match) => {
      return resolveOklchColor(match);
    });
  } catch (e) {
    return 'rgb(128, 128, 128)';
  }
}

export function resolveOklabColor(colorStr: string): string {
  if (typeof colorStr !== 'string') return colorStr;
  
  try {
    const parts = colorStr.match(/oklab\(\s*([0-9.%]+)\s+([-0-9.]+)\s+([-0-9.]+)(?:\s*\/\s*([0-9.%]+))?\s*\)/);
    if (parts) {
      const lAttr = parts[1];
      const l = lAttr.endsWith('%') ? parseFloat(lAttr) / 100 : parseFloat(lAttr);
      const a_ = parseFloat(parts[2]);
      const b_ = parseFloat(parts[3]);
      const aAttr = parts[4];
      const a = aAttr ? (aAttr.endsWith('%') ? parseFloat(aAttr) / 100 : parseFloat(aAttr)) : 1;

      let r_ = l + 0.3963377774 * a_ + 0.2158037573 * b_;
      let g_ = l - 0.1055613458 * a_ - 0.0638541728 * b_;
      let b__ = l - 0.0894841775 * a_ - 1.291485548 * b_;

      const gamma = (x: number) => {
        const cx = Math.max(0, Math.min(1, x));
        return cx <= 0.0031308 ? 12.92 * cx : 1.055 * Math.pow(cx, 1 / 2.4) - 0.055;
      };

      const r = Math.round(gamma(r_) * 255);
      const g = Math.round(gamma(g_) * 255);
      const blue = Math.round(gamma(b__) * 255);

      return `rgba(${r}, ${g}, ${blue}, ${a})`;
    }
  } catch (err) {}

  return 'rgb(128, 128, 128)';
}

export function replaceOklabWithRgb(cssValue: string): string {
  if (typeof cssValue !== 'string') return cssValue;
  if (!cssValue.includes('oklab')) return cssValue;
  
  try {
    return cssValue.replace(/oklab\([^)]+\)/g, (match) => {
      return resolveOklabColor(match);
    });
  } catch (e) {
    return 'rgb(128, 128, 128)';
  }
}

export async function safeHtml2Canvas(element: HTMLElement, options: any = {}): Promise<HTMLCanvasElement> {
  const originalGetComputedStyle = window.getComputedStyle;
  
  const customGetComputedStyle = function(el: Element, pseudoElt?: string) {
    const style = originalGetComputedStyle.call(window, el, pseudoElt);
    return new Proxy(style, {
      get(target, prop, receiver) {
        if (prop === 'getPropertyValue') {
          return function(propertyName: string) {
            const value = target.getPropertyValue(propertyName);
            if (typeof value === 'string' && (value.includes('oklch') || value.includes('oklab'))) {
              return replaceOklabWithRgb(replaceOklchWithRgb(value));
            }
            return value;
          };
        }
        
        const val = Reflect.get(target, prop);
        if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
          return replaceOklabWithRgb(replaceOklchWithRgb(val));
        }
        if (typeof val === 'function') {
          return val.bind(target);
        }
        return val;
      }
    });
  } as any;

  window.getComputedStyle = customGetComputedStyle;

  const originalOnClone = options.onclone;
  options.onclone = function(clonedDoc: Document, clonedEl: HTMLElement) {
    const clonedWin = clonedDoc.defaultView;
    if (clonedWin) {
      const origClonedGetComputedStyle = clonedWin.getComputedStyle;
      clonedWin.getComputedStyle = function(el: Element, pseudoElt?: string) {
        const style = origClonedGetComputedStyle.call(clonedWin, el, pseudoElt);
        return new Proxy(style, {
          get(target, prop, receiver) {
            if (prop === 'getPropertyValue') {
              return function(propertyName: string) {
                const value = target.getPropertyValue(propertyName);
                if (typeof value === 'string' && (value.includes('oklch') || value.includes('oklab'))) {
                  return replaceOklabWithRgb(replaceOklchWithRgb(value));
                }
                return value;
              };
            }
            
            const val = Reflect.get(target, prop);
            if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
              return replaceOklabWithRgb(replaceOklchWithRgb(val));
            }
            if (typeof val === 'function') {
              return val.bind(target);
            }
            return val;
          }
        });
      } as any;
    }
    
    if (originalOnClone) {
      originalOnClone(clonedDoc, clonedEl);
    }
  };

  try {
    const canvas = await html2canvas(element, options);
    return canvas;
  } finally {
    window.getComputedStyle = originalGetComputedStyle;
  }
}