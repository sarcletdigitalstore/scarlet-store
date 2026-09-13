import { Home, LayoutGrid, Package, ShoppingCart, User } from 'lucide-react';

interface BottomNavProps {
  cartCount: number;
  onOpenHome: () => void;
  onOpenCategories: () => void;
  onOpenOrders: () => void;
  onOpenCart: () => void;
  onOpenAccount: () => void;
  active: string;
}

export function BottomNav({
  cartCount,
  onOpenHome,
  onOpenCategories,
  onOpenOrders,
  onOpenCart,
  onOpenAccount,
  active,
}: BottomNavProps) {
  const items = [
    { id: 'home', label: 'Home', icon: Home, onClick: onOpenHome },
    { id: 'categories', label: 'Categories', icon: LayoutGrid, onClick: onOpenCategories },
    { id: 'orders', label: 'Orders', icon: Package, onClick: onOpenOrders },
    { id: 'cart', label: 'Cart', icon: ShoppingCart, onClick: onOpenCart, badge: cartCount },
    { id: 'account', label: 'Account', icon: User, onClick: onOpenAccount },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-lg">
      <div className="flex items-center justify-around px-2 py-1.5">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                isActive ? 'text-[#f43397]' : 'text-slate-500'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#f43397] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
