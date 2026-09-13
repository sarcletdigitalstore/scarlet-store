import { Star, Download, Truck } from 'lucide-react';
import type { Product } from '../types';
import { formatPrice } from '../lib/utils';

interface ProductCardProps {
  product: Product;
  onSelect: (p: Product) => void;
  onAddToCart: (p: Product) => void;
}

export function ProductCard({ product, onSelect, onAddToCart }: ProductCardProps) {
  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
  const isDigital = product.productType === 'digital';
  const outOfStock = product.stock === 0;

  return (
    <div
      className="group bg-white rounded-xl overflow-hidden border border-slate-200 hover:shadow-lg hover:border-[#f43397]/30 transition-all cursor-pointer"
      onClick={() => onSelect(product)}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-slate-100">
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Discount badge */}
        {discount > 0 && (
          <div className="absolute top-2 left-2 bg-[#f43397] text-white text-xs font-bold px-2 py-1 rounded-md">
            {discount}% OFF
          </div>
        )}
        {/* Type badge */}
        <div className={`absolute top-2 right-2 text-xs font-semibold px-2 py-1 rounded-md flex items-center gap-1 ${
          isDigital ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'
        }`}>
          {isDigital ? <Download className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
          {isDigital ? 'Digital' : 'Physical'}
        </div>
        {product.badge && (
          <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
            {product.badge}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="text-sm font-medium text-slate-800 line-clamp-2 min-h-[2.5rem] group-hover:text-[#f43397] transition-colors">
          {product.title}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1 mt-1.5">
          <div className="flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded">
            <Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-700">{product.rating}</span>
          </div>
          <span className="text-[11px] text-slate-400">({product.reviewsCount.toLocaleString()})</span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-base font-bold text-slate-900">{formatPrice(product.price)}</span>
          <span className="text-xs text-slate-400 line-through">{formatPrice(product.originalPrice)}</span>
        </div>

        {/* Stock / Delivery */}
        <div className="mt-1.5">
          {outOfStock ? (
            <span className="text-xs font-medium text-red-500">Out of Stock</span>
          ) : isDigital ? (
            <span className="text-xs font-medium text-blue-600 flex items-center gap-1">
              <Download className="w-3 h-3" /> Instant Download
            </span>
          ) : (
            <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
              <Truck className="w-3 h-3" /> Delivery in {product.deliveryDays} days
            </span>
          )}
        </div>

        {/* Add to cart button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart(product);
          }}
          disabled={outOfStock}
          className={`w-full mt-3 py-2 text-sm font-semibold rounded-lg transition-all ${
            outOfStock
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-[#f43397] text-white hover:bg-[#d62a87] active:scale-[0.98]'
          }`}
        >
          {outOfStock ? 'Unavailable' : isDigital ? 'Buy & Download' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}
