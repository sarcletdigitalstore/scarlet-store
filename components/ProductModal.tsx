import { useState } from 'react';
import { X, Star, Download, Truck, CheckCircle2, MapPin, Shield, Clock } from 'lucide-react';
import type { Product } from '../types';
import { formatPrice } from '../lib/utils';

interface ProductModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (p: Product, qty: number) => void;
  onBuyNow: (p: Product) => void;
}

export function ProductModal({ product, onClose, onAddToCart, onBuyNow }: ProductModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [pincode, setPincode] = useState('');
  const [pincodeResult, setPincodeResult] = useState<string | null>(null);

  const discount = Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100);
  const isDigital = product.productType === 'digital';
  const outOfStock = product.stock === 0;

  const checkPincode = () => {
    if (!/^\d{6}$/.test(pincode)) {
      setPincodeResult('Please enter a valid 6-digit pincode');
      return;
    }
    const deliverable = parseInt(pincode) % 3 !== 0;
    if (deliverable) {
      setPincodeResult(`Deliverable! Expected delivery in ${product.deliveryDays + 1}-${product.deliveryDays + 3} days`);
    } else {
      setPincodeResult('Sorry, delivery not available at this pincode');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/80 backdrop-blur shadow-md flex items-center justify-center hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>

        <div className="grid md:grid-cols-2 gap-0">
          {/* Image */}
          <div className="relative aspect-square md:aspect-auto bg-slate-100">
            <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
            {discount > 0 && (
              <div className="absolute top-3 left-3 bg-[#f43397] text-white text-sm font-bold px-3 py-1.5 rounded-lg">
                {discount}% OFF
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-5 sm:p-6 flex flex-col">
            {/* Type badge */}
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                isDigital ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
              }`}>
                {isDigital ? <Download className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                {isDigital ? 'Digital Product' : 'Physical Product'}
              </span>
              {product.badge && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600">
                  {product.badge}
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-800">{product.title}</h2>

            {/* Rating */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-0.5 bg-emerald-50 px-2 py-1 rounded">
                <Star className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
                <span className="text-sm font-semibold text-emerald-700">{product.rating}</span>
              </div>
              <span className="text-sm text-slate-400">{product.reviewsCount.toLocaleString()} reviews</span>
            </div>

            {/* Price */}
            <div className="flex items-center gap-3 mt-3">
              <span className="text-2xl font-bold text-slate-900">{formatPrice(product.price)}</span>
              <span className="text-base text-slate-400 line-through">{formatPrice(product.originalPrice)}</span>
              {discount > 0 && (
                <span className="text-sm font-semibold text-[#f43397]">{discount}% off</span>
              )}
            </div>

            {/* Description */}
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">{product.description}</p>

            {/* Digital file info */}
            {isDigital && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg space-y-1.5">
                <div className="flex items-center gap-2 text-sm text-blue-700">
                  <Download className="w-4 h-4" />
                  <span className="font-semibold">Instant Digital Download</span>
                </div>
                <div className="text-xs text-blue-600 space-y-0.5">
                  <div>File: {product.fileName} ({product.fileSize})</div>
                  <div>Format: {product.fileFormat}</div>
                  <div className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Email delivery with license key</div>
                </div>
              </div>
            )}

            {/* Stock status */}
            {!isDigital && (
              <div className="mt-3">
                {outOfStock ? (
                  <span className="text-sm font-medium text-red-500">Currently Out of Stock</span>
                ) : product.stock <= 10 ? (
                  <span className="text-sm font-medium text-orange-500">Only {product.stock} left in stock!</span>
                ) : (
                  <span className="text-sm font-medium text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> In Stock ({product.stock} available)
                  </span>
                )}
              </div>
            )}

            {/* Pincode checker - physical only */}
            {!isDigital && !outOfStock && (
              <div className="mt-4 p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">Check Delivery</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit pincode"
                    className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#f43397]"
                  />
                  <button
                    onClick={checkPincode}
                    className="px-4 py-2 text-sm font-semibold bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                  >
                    Check
                  </button>
                </div>
                {pincodeResult && (
                  <p className={`text-xs mt-2 flex items-center gap-1 ${
                    pincodeResult.includes('Deliverable') ? 'text-emerald-600' : 'text-red-500'
                  }`}>
                    {pincodeResult.includes('Deliverable') ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
                    {pincodeResult}
                  </p>
                )}
              </div>
            )}

            {/* Trust badges */}
            <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
              {isDigital ? (
                <>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Instant Access</span>
                  <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Secure License</span>
                </>
              ) : (
                <>
                  <span className="flex items-center gap-1"><Truck className="w-3.5 h-3.5" /> Fast Delivery</span>
                  <span className="flex items-center gap-1"><Shield className="w-3.5 h-3.5" /> Quality Assured</span>
                </>
              )}
            </div>

            {/* Quantity + Actions */}
            <div className="mt-auto pt-5">
              {!isDigital && !outOfStock && (
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-sm font-medium text-slate-600">Qty:</span>
                  <div className="flex items-center border border-slate-200 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-l-lg"
                    >−</button>
                    <span className="w-10 text-center text-sm font-semibold">{quantity}</span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded-r-lg"
                    >+</button>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {!isDigital && !outOfStock && (
                  <button
                    onClick={() => onAddToCart(product, quantity)}
                    className="flex-1 py-3 text-sm font-bold border-2 border-[#f43397] text-[#f43397] rounded-xl hover:bg-pink-50 transition-colors"
                  >
                    Add to Cart
                  </button>
                )}
                <button
                  onClick={() => onBuyNow(product)}
                  disabled={outOfStock}
                  className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                    outOfStock
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                      : 'bg-[#f43397] text-white hover:bg-[#d62a87] active:scale-[0.98]'
                  }`}
                >
                  {outOfStock ? 'Unavailable' : isDigital ? 'Buy & Download' : 'Buy Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
