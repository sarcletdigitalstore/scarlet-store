import React, { useState, useEffect, useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  Sparkles,
  Zap,
  SlidersHorizontal,
  ArrowUpDown,
  Search,
  CheckCircle2,
  Lock,
  Download,
  AlertCircle,
  MessageCircle,
  Send,
  Star,
  ShieldCheck,
  ExternalLink,
  Package,
  Truck
} from 'lucide-react';
import { Product, Order, Language, ProductCategory, ProductType, CartItem } from './types';
import {
  loadProducts,
  saveProducts,
  resetProducts,
  loadOrders,
  saveOrder,
  toggleProductStatus,
  updateOrder,
  loadCart,
  saveCart,
  clearCartStorage
} from './utils/storage';
import { productService } from './services/productService';
import { sendTelegramOrderAlert } from './utils/telegram';
import { Header } from './components/Header';
import { ProductCard } from './components/ProductCard';
import { ProductDetailsModal } from './components/ProductDetailsModal';
import { UpiCheckoutModal } from './components/UpiCheckoutModal';
import { PhysicalCheckoutModal } from './components/PhysicalCheckoutModal';
import { OrderConfirmationModal } from './components/OrderConfirmationModal';
import { MyDownloadsModal } from './components/MyDownloadsModal';
import { AdminModal } from './components/AdminModal';
import { SupplierPanel } from './components/SupplierPanel';
import { CartDrawer } from './components/CartDrawer';
import { CartCheckoutModal } from './components/CartCheckoutModal';
import { ScarletLogo } from './components/ScarletLogo';
import { Footer } from './components/Footer';
import { CountdownBanner } from './components/CountdownBanner';
import { SocialProofToast } from './components/SocialProofToast';
import { FloatingSupportButton } from './components/FloatingSupportButton';
import { CustomerSupportModal } from './components/CustomerSupportModal';
import { SamplePreviewModal } from './components/SamplePreviewModal';
import { OrderTrackingModal } from './components/OrderTrackingModal';
import { t } from './data/translations';

export default function App() {
  // Core state
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [language, setLanguage] = useState<Language>('en');

  // Dedicated route view detection for Seller Panel (#seller, #/seller, #admin, #/admin)
  const isSellerRoute = () => {
    if (typeof window === 'undefined') return false;
    const hash = (window.location.hash || '').toLowerCase().trim();
    const pathname = (window.location.pathname || '').toLowerCase().trim();
    // Normalize hash: removes leading #, leading /, trailing /
    const cleanHash = hash.replace(/^#\/?/, '').split('?')[0].replace(/\/+$/, '');
    
    return (
      cleanHash === 'seller' ||
      cleanHash === 'supplier' ||
      cleanHash === 'admin' ||
      hash.includes('seller') ||
      hash.includes('supplier') ||
      hash.includes('admin') ||
      pathname.endsWith('/seller') ||
      pathname.endsWith('/supplier') ||
      pathname.endsWith('/admin')
    );
  };
  const [isSellerView, setIsSellerView] = useState<boolean>(isSellerRoute);

  const openSellerPanel = () => {
    try {
      window.location.hash = '#seller';
    } catch {
      // fallback
    }
    setIsSellerView(true);
  };

  const closeSellerPanel = () => {
    try {
      if (window.location.hash) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    } catch {
      window.location.hash = '';
    }
    setIsSellerView(false);
  };

  useEffect(() => {
    const handleRouteSync = () => {
      setIsSellerView(isSellerRoute());
    };

    // Check immediately on mount
    handleRouteSync();

    window.addEventListener('hashchange', handleRouteSync);
    window.addEventListener('popstate', handleRouteSync);
    return () => {
      window.removeEventListener('hashchange', handleRouteSync);
      window.removeEventListener('popstate', handleRouteSync);
    };
  }, []);

  // Filtering and searching: Top-level Type (All | Digital | Physical) + Category (All | eBook | Planner)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | ProductType>('all');
  const [selectedCategory, setSelectedCategory] = useState<'all' | ProductCategory>('all');
  const [sortBy, setSortBy] = useState<'featured' | 'price_low' | 'price_high' | 'rating'>('featured');

  // Modals state
  const [selectedProductForDetails, setSelectedProductForDetails] = useState<Product | null>(null);
  const [selectedProductForCheckout, setSelectedProductForCheckout] = useState<Product | null>(null);
  const [selectedProductForPhysicalCheckout, setSelectedProductForPhysicalCheckout] = useState<Product | null>(null);
  const [latestOrder, setLatestOrder] = useState<Order | null>(null);
  const [isDownloadsOpen, setIsDownloadsOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);

  // Meesho-Themed Order Tracking Modal state
  const [isTrackingOpen, setIsTrackingOpen] = useState(false);
  const [searchPhone, setSearchPhone] = useState('');
  const [selectedTrackingOrder, setSelectedTrackingOrder] = useState<Order | null>(null);

  const handleOpenTracking = (order?: Order) => {
    if (order) {
      setSelectedTrackingOrder(order);
      const phone = order.customerPhone || order.shippingAddress?.phone || '';
      if (phone) {
        setSearchPhone(phone);
      }
    }
    setIsTrackingOpen(true);
  };

  // Cart State (Persisted in localStorage)
  const [cartItems, setCartItems] = useState<CartItem[]>(() => loadCart());
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isCartCheckoutOpen, setIsCartCheckoutOpen] = useState(false);

  // Sync cart items to storage whenever updated
  useEffect(() => {
    saveCart(cartItems);
  }, [cartItems]);

  // Live Toast for Admin and Store feedback
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Centralized Global Catalog Sync & Real-time SSE Connection
  useEffect(() => {
    // 1. Initial cached products
    const initialProds = productService.getCachedProducts();
    setProducts(initialProds);
    const loadedOrds = loadOrders();
    setOrders(loadedOrds);

    // 2. Subscribe to real-time updates (cross-device SSE + cross-tab BroadcastChannel)
    const unsubscribe = productService.subscribe((liveProducts) => {
      setProducts(liveProducts);
    });

    // 3. Fetch latest from server
    productService.fetchGlobalProducts().then((latest) => {
      setProducts(latest);
    }).catch(() => {});

    // 4. Fetch latest orders from server
    fetch('/api/orders')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.orders)) {
          setOrders(data.orders);
        }
      })
      .catch(() => {});

    return () => {
      unsubscribe();
    };
  }, []);

  // Keyboard shortcut (Ctrl+Shift+A or Ctrl+Shift+S) to quickly open secret Seller Hub
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key.toLowerCase() === 'a' || e.key.toLowerCase() === 's')) {
        e.preventDefault();
        openSellerPanel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Admin / Seller Actions with Centralized Server Propagation
  const handleAddProduct = async (newProduct: Product) => {
    const updated = [newProduct, ...products.filter((p) => p.id !== newProduct.id)];
    setProducts(updated);
    triggerToast(t(language, 'productAddedSuccess'));

    await productService.createProduct(newProduct);
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    const updated = products.map((p) => (p.id === updatedProduct.id ? updatedProduct : p));
    setProducts(updated);
    if (selectedProductForDetails?.id === updatedProduct.id) {
      setSelectedProductForDetails(updatedProduct);
    }
    triggerToast(t(language, 'productUpdatedSuccess'));

    await productService.updateProduct(updatedProduct);
  };

  const handleDeleteProduct = async (productId: string) => {
    const updated = products.filter((p) => p.id !== productId);
    setProducts(updated);
    if (selectedProductForDetails?.id === productId) {
      setSelectedProductForDetails(null);
    }
    triggerToast(t(language, 'productDeletedSuccess'));

    await productService.deleteProduct(productId);
  };

  const handleToggleStatus = async (productId: string) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        return { ...p, status: (p.status === 'draft' ? 'live' : 'draft') as any };
      }
      return p;
    });
    setProducts(updated);
    triggerToast('Product catalog status updated.');

    await productService.toggleProductStatus(productId);
  };

  const handleUpdateOrderShipping = (orderId: string, updates: Partial<Order>) => {
    const updated = updateOrder(orderId, updates);
    setOrders(updated);
    triggerToast('Order fulfillment status updated.');
  };

  const handleResetCatalog = async () => {
    triggerToast('Resetting catalog to default...');
    const res = await productService.resetCatalog();
    setProducts(res.products);
    triggerToast(t(language, 'catalogResetSuccess'));
  };

  // Payment Success Handler with Instant Telegram Alert
  const handlePaymentSuccess = (order: Order) => {
    // Save order
    saveOrder(order);
    setOrders((prev) => [order, ...prev]);

    // Fire Instant Telegram Order Alert to Seller
    sendTelegramOrderAlert(order).catch((err) => {
      console.warn('Telegram notification failed:', err);
    });

    // Close checkout modals and open Order Confirmation
    setSelectedProductForCheckout(null);
    setSelectedProductForPhysicalCheckout(null);
    setSelectedProductForDetails(null);
    setLatestOrder(order);
  };

  // Buy Now Handler: Dispatches physical checkout modal or 3-in-1 universal checkout modal
  const handleBuyProduct = (product: Product) => {
    // Check if it's a physical product: zero-loss advance checkout flow
    if (product.productType === 'physical') {
      setSelectedProductForPhysicalCheckout(product);
      return;
    }

    // 3-in-1 Universal Checkout Modal (Razorpay / Paytm / Direct UPI)
    setSelectedProductForCheckout(product);
  };

  // Cart Operations
  const handleAddToCart = (product: Product, quantity = 1) => {
    setCartItems((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + quantity
        };
        return next;
      }
      return [...prev, { product, quantity, addedAt: new Date().toISOString() }];
    });
    triggerToast(
      language === 'hi'
        ? `"${product.titleHi || product.title}" �"ार्�x म�!� �S�9ड़ा �या!`
        : `"${product.title}" added to cart!`
    );
  };

  const handleUpdateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveCartItem(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((item) =>
        item.product.id === productId ? { ...item, quantity } : item
      )
    );
  };

  const handleRemoveCartItem = (productId: string) => {
    setCartItems((prev) => prev.filter((item) => item.product.id !== productId));
    triggerToast('Item removed from cart');
  };

  const handleClearCart = () => {
    setCartItems([]);
    clearCartStorage();
  };

  const handleCartPaymentSuccess = (newOrders: Order[]) => {
    // Save all new generated orders
    for (const ord of newOrders) {
      saveOrder(ord);
    }
    setOrders((prev) => [...newOrders, ...prev]);

    // Clear cart and close checkout modal
    handleClearCart();
    setIsCartCheckoutOpen(false);

    // Show order confirmation for the first order
    if (newOrders.length > 0) {
      setLatestOrder(newOrders[0]);
    }
    triggerToast(
      language === 'hi'
        ? '�x}0 �a�!�"� �0�x एव� �र्डर सफल!'
        : '�x}0 Order confirmed & payment submitted!'
    );
  };

  // Live products for customer storefront (Draft items hidden from public)
  const liveProducts = useMemo(() => products.filter((p) => p.status !== 'draft'), [products]);

  // Counts for filters based on live products
  const digitalCount = useMemo(() => liveProducts.filter((p) => p.productType !== 'physical').length, [liveProducts]);
  const physicalCount = useMemo(() => liveProducts.filter((p) => p.productType === 'physical').length, [liveProducts]);
  const ebookCount = useMemo(() => liveProducts.filter((p) => p.category === 'ebook').length, [liveProducts]);
  const plannerCount = useMemo(() => liveProducts.filter((p) => p.category === 'planner').length, [liveProducts]);

  // Filter & Sort computation for Customer Storefront
  const filteredProducts = useMemo(() => {
    // Exclusively show products with status Live on customer storefront
    let list = products.filter((p) => p.status !== 'draft');

    // 1. Top-Level Product Type Filter [All | Digital | Physical]
    if (selectedType === 'digital') {
      list = list.filter((p) => p.productType !== 'physical');
    } else if (selectedType === 'physical') {
      list = list.filter((p) => p.productType === 'physical');
    }

    // 2. Category sub-filter (eBooks vs Planners)
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.category === selectedCategory);
    }

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const titleMatch = p.title.toLowerCase().includes(q) || (p.titleHi && p.titleHi.toLowerCase().includes(q));
        const descMatch = p.description.toLowerCase().includes(q) || (p.descriptionHi && p.descriptionHi.toLowerCase().includes(q));
        const badgeMatch = p.badge && p.badge.toLowerCase().includes(q);
        return titleMatch || descMatch || badgeMatch;
      });
    }

    // 4. Sorting
    switch (sortBy) {
      case 'price_low':
        list.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        list.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        list.sort((a, b) => b.rating - a.rating);
        break;
      case 'featured':
      default:
        // Keep order or prioritize Bestseller
        list.sort((a, b) => (b.badge ? 1 : 0) - (a.badge ? 1 : 0));
        break;
    }

    return list;
  }, [products, selectedType, selectedCategory, searchQuery, sortBy]);

  // If on dedicated Seller / Admin view route, render Meesho-Style Supplier Panel
  if (isSellerView) {
    return (
      <SupplierPanel
        products={products}
        orders={orders}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
        onToggleStatus={handleToggleStatus}
        onResetCatalog={handleResetCatalog}
        onUpdateOrderShipping={handleUpdateOrderShipping}
        onBackToStorefront={closeSellerPanel}
        language={language}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans text-slate-900">
      {/* 1. Urgency Countdown Timer Top Banner */}
      <CountdownBanner
        language={language}
        onShopNow={() => {
          document.getElementById('product-catalog-section')?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 border border-slate-700 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Header */}
      <Header
        language={language}
        onLanguageChange={setLanguage}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        purchasesCount={orders.length}
        cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
        onOpenCart={() => setIsCartDrawerOpen(true)}
        onOpenDownloads={() => setIsDownloadsOpen(true)}
        onOpenAdmin={openSellerPanel}
        onOpenSeller={openSellerPanel}
        onOpenSupport={() => setIsSupportOpen(true)}
        onOpenTracking={() => handleOpenTracking()}
      />

      {/* Hero section removed for Meesho style layout */}

      {/* Main Content Area */}
      <main id="product-catalog-section" className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
      {/* Product Catalog Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts && filteredProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            language={language}
            onSelectProduct={(p) => setSelectedProduct(p)}
            onAddToCart={(p) => handleAddToCart(p)}
          />
        ))}
      </div>
    </main>

    {/* Store Footer */}
      <Footer
        language={language}
        onOpenAdmin={openSellerPanel}
        onOpenSeller={openSellerPanel}
        onOpenSupport={() => setIsSupportOpen(true)}
        onOpenTracking={() => handleOpenTracking()}
      />

      {/* Floating Dynamic Social Proof Notification */}
      <SocialProofToast language={language} />

      {/* Floating Customer Support Button */}
      <FloatingSupportButton
        onClick={() => setIsSupportOpen(true)}
        language={language}
      />

      {/* MODALS */}

      {/* 1. Product Details Modal */}
      {selectedProductForDetails && (
        <ProductDetailsModal
          product={selectedProductForDetails}
          language={language}
          onClose={() => setSelectedProductForDetails(null)}
          onProceedToCheckout={(prod) => {
            setSelectedProductForDetails(null);
            handleBuyProduct(prod);
          }}
          onAddToCart={(prod) => handleAddToCart(prod)}
          onOpenPreview={(prod) => setPreviewProduct(prod)}
        />
      )}

      {/* 2. Digital Instant UPI Checkout Modal */}
      {selectedProductForCheckout && (
        <UpiCheckoutModal
          product={selectedProductForCheckout}
          language={language}
          onClose={() => setSelectedProductForCheckout(null)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* 2b. Zero-Loss Physical Parcel Checkout Modal (Advance Delivery Fee + Address) */}
      {selectedProductForPhysicalCheckout && (
        <PhysicalCheckoutModal
          product={selectedProductForPhysicalCheckout}
          language={language}
          onClose={() => setSelectedProductForPhysicalCheckout(null)}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* 3. Post-Purchase Order Confirmation Modal with Instant Delivery */}
      {latestOrder && (
        <OrderConfirmationModal
          order={latestOrder}
          product={
            products.find((p) => p.id === latestOrder.productId) || {
              id: latestOrder.productId,
              title: latestOrder.productTitle,
              category: latestOrder.category,
              price: latestOrder.price,
              originalPrice: latestOrder.price,
              coverImage: '',
              description: '',
              highlights: [],
              pdfUrl: latestOrder.pdfUrl,
              rating: 5,
              reviewsCount: 1,
              createdAt: ''
            }
          }
          language={language}
          onClose={() => setLatestOrder(null)}
          onOpenDownloads={() => {
            setLatestOrder(null);
            setIsDownloadsOpen(true);
          }}
          onOpenTracking={(ord) => handleOpenTracking(ord)}
        />
      )}

      {/* 4. Customer Downloads Modal */}
      <MyDownloadsModal
        isOpen={isDownloadsOpen}
        orders={orders}
        products={products}
        language={language}
        onClose={() => setIsDownloadsOpen(false)}
        onExploreProducts={() => setIsDownloadsOpen(false)}
        onOpenTracking={(ord) => handleOpenTracking(ord)}
      />

      {/* 5. Secret Admin Dashboard */}
      <AdminModal
        isOpen={isAdminOpen}
        language={language}
        products={products}
        orders={orders}
        onClose={() => setIsAdminOpen(false)}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
        onResetCatalog={handleResetCatalog}
      />

      {/* 6. Customer Support Modal (Telegram & FAQ & Ticket) */}
      <CustomerSupportModal
        isOpen={isSupportOpen}
        onClose={() => setIsSupportOpen(false)}
        language={language}
      />

      {/* 7. Product Sample Preview "Look Inside" Modal */}
      <SamplePreviewModal
        product={previewProduct}
        isOpen={!!previewProduct}
        onClose={() => setPreviewProduct(null)}
        language={language}
        onBuyNow={(prod) => handleBuyProduct(prod)}
      />

      {/* 8. Slide-out Cart Drawer with Item List & Subtotal */}
      <CartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        cartItems={cartItems}
        language={language}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        onProceedToCheckout={() => {
          setIsCartDrawerOpen(false);
          setIsCartCheckoutOpen(true);
        }}
        onSelectProduct={(prod) => setSelectedProductForDetails(prod)}
      />

      {/* 9. Unified Multi-Item Cart Checkout Modal */}
      {isCartCheckoutOpen && (
        <CartCheckoutModal
          isOpen={isCartCheckoutOpen}
          onClose={() => setIsCartCheckoutOpen(false)}
          cartItems={cartItems}
          language={language}
          onPaymentSuccess={handleCartPaymentSuccess}
        />
      )}

      {/* 10. Meesho-Themed Order Tracking Modal */}
      <OrderTrackingModal
        isOpen={isTrackingOpen}
        onClose={() => setIsTrackingOpen(false)}
        orders={orders}
        initialOrder={selectedTrackingOrder || latestOrder}
        searchPhone={searchPhone}
        onSearchPhoneChange={setSearchPhone}
        language={language}
      />
    </div>
  );
}
