import { Search, ShoppingCart, User, Package, Home as HomeIcon, LayoutGrid, Truck } from 'lucide-react';

interface HeaderProps {
  cartCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenCart: () => void;
  onOpenAccount: () => void;
  onOpenTracking: () => void;
  onCategoryClick: (cat: string) => void;
  activeCategory: string;
}

const CATEGORIES = [
  { id: 'all', label: 'All' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'stationery', label: 'Stationery' },
  { id: 'mobile_accessories', label: 'Mobile' },
  { id: 'books', label: 'Books' },
  { id: 'pdf_guides', label: 'PDF Guides' },
  { id: 'templates', label: 'Templates' },
  { id: 'software', label: 'Software' },
];

export function Header({
  cartCount,
  searchQuery,
  onSearchChange,
  onOpenCart,
  onOpenAccount,
  onOpenTracking,
  onCategoryClick,
  activeCategory,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm">
      {/* Top bar */}
      <div className="bg-[#f43397] text-white text-xs px-4 py-1.5 flex items-center justify-center gap-2">
        <Truck className="w-3.5 h-3.5" />
        <span className="font-medium">Free delivery on orders above ₹499 | Instant download on digital products</span>
      </div>

      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 sm:gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-[#f43397] flex items-center justify-center">
            <span className="text-white font-bold text-lg">S</span>
          </div>
          <div className="hidden sm:block">
            <h1 className="text-lg font-bold text-slate-800 leading-none">Scarlet Store</h1>
            <p className="text-[10px] text-slate-400 leading-none mt-0.5">Shop Smart, Live Bright</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search for products, categories..."
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-100 rounded-lg border border-transparent focus:border-[#f43397] focus:bg-white outline-none transition-all"
          />
        </div>

        {/* Track Order */}
        <button
          onClick={onOpenTracking}
          className="hidden md:flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#f43397] transition-colors"
        >
          <Package className="w-4 h-4" />
          <span>Track Order</span>
        </button>

        {/* Cart */}
        <button
          onClick={onOpenCart}
          className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Cart"
        >
          <ShoppingCart className="w-5 h-5 text-slate-700" />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-[#f43397] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>

        {/* Account */}
        <button
          onClick={onOpenAccount}
          className="flex items-center gap-1.5 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          aria-label="Account"
        >
          <User className="w-5 h-5 text-slate-700" />
          <span className="hidden md:inline text-sm font-medium text-slate-600">Account</span>
        </button>
      </div>

      {/* Category bar - desktop */}
      <div className="hidden md:block border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-hide">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onCategoryClick(cat.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-[#f43397] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
