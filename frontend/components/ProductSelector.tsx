
import React from 'react';
import { CheckCircle as CheckCircleIcon } from 'lucide-react';
import { Product } from '../types';

interface ProductSelectorProps {
  selected?: Product[];
  available?: Product[]; // Optional: restrict visible products
  onChange: (products: Product[]) => void;
  disabled?: boolean;
}

const ProductSelector: React.FC<ProductSelectorProps> = ({ selected = [], available, onChange, disabled }) => {
  const products = available || Object.values(Product);
  
  const toggleProduct = (product: Product) => {
    if (disabled) return;
    if (selected.includes(product)) {
      onChange(selected.filter(p => p !== product));
    } else {
      onChange([...selected, product]);
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Products</label>
      <div className="flex flex-wrap gap-2">
        {products.map(product => (
          <button
            key={product}
            type="button"
            onClick={() => toggleProduct(product as Product)}
            disabled={disabled}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              selected.includes(product as Product)
                ? 'bg-blue-600 text-white shadow-md transform active:scale-95'
                : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
            } disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
          >
            {selected.includes(product as Product) && <CheckCircleIcon size={12} />}
            {product}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProductSelector;
