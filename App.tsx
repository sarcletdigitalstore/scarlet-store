import { useState, useMemo, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile,
  type User as FbUser,
} from 'firebase/auth';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { Header } from './src/components/Header';
import { BottomNav } from './src/components/BottomNav';
import { ProductCard } from './src/components/ProductCard';
import { ProductModal } from './src/components/ProductModal';
import { CartDrawer } from './src/components/CartDrawer';
import { CheckoutModal } from './src/components/CheckoutModal';
import { OrderConfirmationModal } from './src/components/OrderConfirmationModal';
import { OrderTrackingModal } from './src/components/OrderTrackingModal';
import { AccountModal } from './src/components/AccountModal';
import { Footer } from './src/components/Footer';
import { PRODUCTS } from './src/data/products';
import { auth, db } from './src/lib/firebase';
import { supabase } from './src/lib/supabase';
import type { Product, CartItem, Order, UserProfile, SavedAddress } from './src/types';

const CART_KEY = 'scarlet_cart';
const USER_KEY = 'scarlet_user';
const ADDR_KEY = 'scarlet_addresses';

export async function fetchFirestoreProducts(): Promise<Product[]> {
  try {
    const snap = await getDocs(collection(db, 'products'));
    if (snap.empty) return [];
    const products: Product[] = [];
    snap.forEach((doc) => {
      const d = doc.data() as any;
      products.push({
        id: doc.id,
        title: d.title || d.name || '',
        description: d.description || '',
        category: d.category || 'packaging',
        productType: d.productType || d.type || 'physical',
        price: Number(d.price) || 0,
        originalPrice: Number(d.originalPrice || d.mrp || d.price) || 0,
        rating: Number(d.rating) || 4.5,
        reviewsCount: Number(d.reviewsCount || d.reviews) || 0,
        image: d.image || d.imageUrl || 'https://images.pexels.com/photos/906464/pexels-photo-906464.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
        stock: Number(d.stock) || 0,
        badge: d.badge || undefined,
        deliveryDays: Number(d.deliveryDays) || 3,
        fileName: d.fileName || undefined,
        fileSize: d.fileSize || undefined,
        fileFormat: d.fileFormat || undefined,
      });
    });
    return products;
  } catch (err) {
    console.error('Failed to fetch products from Firestore:', err);
    return [];
  }
}

export async function saveOrderToFirestore(order: Order): Promise<void> {
  try {
    await addDoc(collection(db, 'orders'), {
      orderNumber: order.orderNumber,
      items: JSON.parse(JSON.stringify(order.items)),
      itemTotal: order.itemTotal,
      deliveryFee: order.deliveryFee,
      discount: order.discount,
      total: order.total,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail || null,
      shippingAddress: order.shippingAddress || null,
      status: order.status,
      hasDigital: order.hasDigital,
      licenseKeys: order.licenseKeys,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to save order to Firestore:', err);
  }
}

export async function searchFirestoreOrders(queryValue: string): Promise<Order[]> {
  try {
    const isPhone = /^\d{10}$/.test(queryValue.trim());
    let snap;
    if (isPhone) {
      const q = query(collection(db, 'orders'), where('customerPhone', '==', queryValue.trim()));
      snap = await getDocs(q);
    } else {
      const q = query(collection(db, 'orders'), where('orderNumber', '==', queryValue.trim().toUpperCase()));
      snap = await getDocs(q);
    }
    const orders: Order[] = [];
    snap.forEach((doc) => {
      const d = doc.data() as any;
      orders.push({
        id: doc.id,
        orderNumber: d.orderNumber || '',
        items: d.items || [],
        itemTotal: Number(d.itemTotal) || 0,
        deliveryFee: Number(d.deliveryFee) || 0,
        discount: Number(d.discount) || 0,
        total: Number(d.total) || 0,
        paymentMethod: d.paymentMethod || 'cod',
        paymentStatus: d.paymentStatus || 'pending',
        customerName: d.customerName || '',
        customerPhone: d.customerPhone || '',
        customerEmail: d.customerEmail || undefined,
        shippingAddress: d.shippingAddress || undefined,
        status: d.status || 'placed',
        hasDigital: d.hasDigital || false,
        licenseKeys: d.licenseKeys || {},
        createdAt: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      });
    });
    return orders;
  } catch (err) {
    console.error('Failed to search orders in Firestore:', err);
    return [];
  }
}

export { supabase };

export default function App() {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeNav, setActiveNav] = useState('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // User & addresses
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem(USER_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [addresses, setAddresses] = useState<SavedAddress[]>(() => {
    try {
      const stored = localStorage.getItem(ADDR_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState<Order | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Fetch products from Firestore on mount, fallback to local
  useEffect(() => {
    fetchFirestoreProducts().then((firestoreProducts) => {
      if (firestoreProducts.length > 0) {
        setProducts(firestoreProducts);
      }
      setLoadingProducts(false);
    });
  }, []);

  // Firebase auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser: FbUser | null) => {
      if (fbUser) {
        const stored = localStorage.getItem(USER_KEY);
        if (!stored) {
          const profile: UserProfile = {
            uid: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
            phone: (fbUser as any).phoneNumber || '',
            email: fbUser.email || '',
            loggedInAt: new Date().toISOString(),
          };
          setUser(profile);
          localStorage.setItem(USER_KEY, JSON.stringify(profile));
        }
      } else {
        const stored = localStorage.getItem(USER_KEY);
        if (stored) {
          // Only clear if there's no Firebase session but we had one
          // Keep local user for non-Firebase logins
        }
      }
    });
    return () => unsub();
  }, []);

  // Persist cart
  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(cartItems));
  }, [cartItems]);

  // Persist user
  useEffect(() => {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  }, [user]);

  // Persist addresses
  useEffect(() => {
    localStorage.setItem(ADDR_KEY, JSON.stringify(addresses));
  }, [addresses]);

  // Toast auto-dismiss
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (activeCategory !== 'all') {
      list = list.filter((p) => p.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, activeCategory, searchQuery]);

  const handleAddToCart = (product: Product, quantity = 1) => {
    setCartItems((prev) => {
      const existing = prev.findIndex((item) => item.product.id === product.id);
      if (existing > -1) {
        const next = [...prev];
        next[existing] = { ...next[existing], quantity: next[existing].quantity + quantity };
        return next;
      }
      return [...prev, { product, quantity }];
    });
    setToast(`"${product.title}" added to cart!`);
  };

  const handleUpdateQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) => (item.product.id === productId ? { ...item, quantity: qty } : item))
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
    setToast('Item removed from cart');
  };

  const handleBuyNow = (product: Product) => {
    if (product.stock === 0) return;
    handleAddToCart(product);
    setSelectedProduct(null);
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleCheckoutSuccess = (order: Order) => {
    setConfirmedOrder(order);
    setCartItems([]);
    setIsCheckoutOpen(false);
    setIsCartOpen(false);
    localStorage.removeItem(CART_KEY);
  };

  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
    setToast(`Welcome, ${profile.name}!`);
  };

  const handleLogout = async () => {
    try {
      await fbSignOut(auth);
    } catch {
      // ignore if not signed in via Firebase
    }
    setUser(null);
    setIsAccountOpen(false);
    setToast('Logged out successfully');
  };

  const handleOpenAccount = () => {
    setIsAccountOpen(true);
  };

  const handleTrackOrder = (order: Order) => {
    setTrackingOrder(order);
    setIsAccountOpen(false);
    setIsTrackingOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-20 md:bottom-5 right-5 z-[60] bg-slate-900 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-fadeIn">
          <span>{toast}</span>
        </div>
      )}

      <Header
        cartCount={cartCount}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenCart={() => setIsCartOpen(true)}
        onOpenAccount={handleOpenAccount}
        onOpenTracking={() => setIsTrackingOpen(true)}
        onCategoryClick={(cat) => {
          setActiveCategory(cat);
          setActiveNav('home');
        }}
        activeCategory={activeCategory}
      />

      {/* Hero banner */}
      <div className="bg-gradient-to-r from-[#f43397] to-[#d62a87] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold">Mega Sale Live!</h2>
              <p className="text-sm sm:text-base text-pink-100 mt-1">Up to 60% off on packaging, stationery & more</p>
            </div>
            <div className="flex gap-3">
              <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-center">
                <p className="text-2xl font-bold">{products.length}</p>
                <p className="text-xs text-pink-100">Products</p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-center">
                <p className="text-2xl font-bold">60%</p>
                <p className="text-xs text-pink-100">Max Off</p>
              </div>
              <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-center">
                <p className="text-2xl font-bold">FREE</p>
                <p className="text-xs text-pink-100">Delivery ₹499+</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile category pills */}
      <div className="md:hidden bg-white border-b border-slate-100 sticky top-[105px] z-30">
        <div className="flex gap-1.5 overflow-x-auto px-4 py-2 scrollbar-hide">
          {[
            { id: 'all', label: 'All' },
            { id: 'packaging', label: '📦 Packaging' },
            { id: 'stationery', label: '✏️ Stationery' },
            { id: 'mobile_accessories', label: '📱 Mobile' },
            { id: 'books', label: '📚 Books' },
            { id: 'pdf_guides', label: '📄 PDF' },
            { id: 'templates', label: '📋 Templates' },
            { id: 'software', label: '💻 Software' },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-all ${
                activeCategory === cat.id
                  ? 'bg-[#f43397] text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <main id="product-catalog-section" className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">
            {activeCategory === 'all' ? 'All Products' : activeCategory.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </h2>
          <span className="text-sm text-slate-400">
            {loadingProducts ? 'Loading...' : `${filteredProducts.length} products`}
          </span>
        </div>

        {loadingProducts ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
                <div className="aspect-square bg-slate-200" />
                <div className="p-3 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="h-8 bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-slate-400 text-lg">No products found</p>
            <p className="text-sm text-slate-400 mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onSelect={setSelectedProduct}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </main>

      <Footer onOpenTracking={() => setIsTrackingOpen(true)} />

      {/* Mobile bottom nav */}
      <BottomNav
        cartCount={cartCount}
        active={activeNav}
        onOpenHome={() => {
          setActiveNav('home');
          setActiveCategory('all');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        onOpenCategories={() => {
          setActiveNav('categories');
          document.getElementById('product-catalog-section')?.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenOrders={() => {
          setActiveNav('orders');
          if (user) {
            handleOpenAccount();
          } else {
            setIsTrackingOpen(true);
          }
        }}
        onOpenCart={() => {
          setActiveNav('cart');
          setIsCartOpen(true);
        }}
        onOpenAccount={() => {
          setActiveNav('account');
          handleOpenAccount();
        }}
      />

      {/* Modals */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
        />
      )}

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQty}
        onRemoveItem={handleRemoveItem}
        onCheckout={() => {
          setIsCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        onSelectProduct={() => {}}
      />

      {isCheckoutOpen && cartItems.length > 0 && (
        <CheckoutModal
          cartItems={cartItems}
          onClose={() => setIsCheckoutOpen(false)}
          onSuccess={handleCheckoutSuccess}
        />
      )}

      {confirmedOrder && (
        <OrderConfirmationModal
          order={confirmedOrder}
          onClose={() => setConfirmedOrder(null)}
          onTrackOrder={() => {
            setConfirmedOrder(null);
            setTrackingOrder(confirmedOrder);
            setIsTrackingOpen(true);
          }}
        />
      )}

      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
        initialOrder={trackingOrder}
        searchPhone={user?.phone || ''}
      />

      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        user={user}
        onLogin={handleLogin}
        onLogout={handleLogout}
        addresses={addresses}
        onAddressesChange={setAddresses}
        onTrackOrder={handleTrackOrder}
      />
    </div>
  );
}
