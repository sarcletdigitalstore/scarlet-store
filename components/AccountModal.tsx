import { useState, useEffect } from 'react';
import {
  X, ChevronLeft, User, Phone, Mail, MapPin, Package, Download,
  HelpCircle, LogOut, Plus, Pencil, Check, ChevronRight, Star,
  MessageCircle, Clock, Shield, Truck, FileText, Home, Trash2, Lock,
} from 'lucide-react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile as fbUpdateProfile,
} from 'firebase/auth';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import type { UserProfile, SavedAddress, Order } from '../types';
import { formatPrice, formatDate, ORDER_MILESTONES } from '../lib/utils';
import { auth, db } from '../lib/firebase';
import { supabase } from '../lib/supabase';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onLogin: (user: UserProfile) => void;
  onLogout: () => void;
  addresses: SavedAddress[];
  onAddressesChange: (addresses: SavedAddress[]) => void;
  onTrackOrder: (order: Order) => void;
}

type Tab = 'profile' | 'orders' | 'addresses' | 'downloads' | 'support';
type AuthMode = 'login' | 'signup';
type AuthStep = 'input' | 'otp' | 'details';

export function AccountModal({
  isOpen, onClose, user, onLogin, onLogout, addresses, onAddressesChange, onTrackOrder,
}: AccountModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Auth state
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [authStep, setAuthStep] = useState<AuthStep>('input');
  const [authPhone, setAuthPhone] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authOtp, setAuthOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authPassword, setAuthPassword] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (user) {
      setActiveTab('profile');
      fetchOrders(user.phone);
    }
  }, [isOpen, user]);

  const fetchOrders = async (phone: string) => {
    setLoadingOrders(true);
    let mapped: Order[] = [];
    // Try Firestore first
    try {
      const q = query(
        collection(db, 'orders'),
        where('customerPhone', '==', phone),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        snap.forEach((doc) => {
          const d = doc.data() as any;
          mapped.push({
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
      }
    } catch (err) {
      console.error('Failed to fetch orders from Firestore:', err);
    }
    // Fallback to Supabase if Firestore returned nothing
    if (mapped.length === 0) {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('customer_phone', phone)
          .order('created_at', { ascending: false });
        if (!error && data) {
          mapped = data.map((row: any) => ({
            id: row.id,
            orderNumber: row.order_number,
            items: row.items,
            itemTotal: Number(row.item_total),
            deliveryFee: Number(row.delivery_fee),
            discount: Number(row.discount),
            total: Number(row.total),
            paymentMethod: row.payment_method,
            paymentStatus: row.payment_status,
            customerName: row.customer_name,
            customerPhone: row.customer_phone,
            customerEmail: row.customer_email,
            shippingAddress: row.shipping_address,
            status: row.status,
            hasDigital: row.has_digital,
            licenseKeys: row.license_keys || {},
            createdAt: row.created_at,
          }));
        }
      } catch (err2) {
        console.error('Failed to fetch orders from Supabase:', err2);
      }
    }
    setOrders(mapped);
    setLoadingOrders(false);
  };

  if (!isOpen) return null;

  // === Auth flow ===
  const handleSendOtp = async () => {
    setAuthError('');
    if (authMode === 'signup' && !authName.trim()) {
      setAuthError('Please enter your name');
      return;
    }
    if (!/^\d{10}$/.test(authPhone)) {
      setAuthError('Please enter a valid 10-digit phone number');
      return;
    }
    if (authEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(authEmail)) {
      setAuthError('Please enter a valid email address');
      return;
    }
    setAuthLoading(true);

    // If email + password provided, use Firebase Auth
    if (authEmail && authPassword) {
      try {
        if (authMode === 'signup') {
          const cred = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
          if (authName) {
            await fbUpdateProfile(cred.user, { displayName: authName });
          }
          const profile: UserProfile = {
            uid: cred.user.uid,
            name: authName || authEmail.split('@')[0],
            phone: authPhone,
            email: authEmail,
            loggedInAt: new Date().toISOString(),
          };
          onLogin(profile);
          fetchOrders(authPhone);
        } else {
          const cred = await signInWithEmailAndPassword(auth, authEmail, authPassword);
          const profile: UserProfile = {
            uid: cred.user.uid,
            name: cred.user.displayName || cred.user.email?.split('@')[0] || 'User',
            phone: authPhone,
            email: cred.user.email || authEmail,
            loggedInAt: new Date().toISOString(),
          };
          onLogin(profile);
          fetchOrders(authPhone);
        }
        setAuthLoading(false);
      } catch (err: any) {
        const code = err?.code || '';
        if (code === 'auth/email-already-in-use') setAuthError('This email is already registered. Try logging in.');
        else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') setAuthError('Invalid email or password.');
        else if (code === 'auth/weak-password') setAuthError('Password should be at least 6 characters.');
        else if (code === 'auth/network-request-failed') setAuthError('Network error. Check your connection.');
        else setAuthError(err?.message || 'Authentication failed. Please try again.');
        setAuthLoading(false);
      }
      return;
    }

    // Otherwise use simulated OTP
    setTimeout(() => {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(otp);
      setAuthStep('otp');
      setAuthLoading(false);
    }, 800);
  };

  const handleVerifyOtp = () => {
    setAuthError('');
    if (authOtp !== generatedOtp) {
      setAuthError('Invalid OTP. Please check and try again.');
      return;
    }
    setAuthLoading(true);
    setTimeout(() => {
      const profile: UserProfile = {
        name: authName || `User ${authPhone.slice(-4)}`,
        phone: authPhone,
        email: authEmail || '',
        loggedInAt: new Date().toISOString(),
      };
      onLogin(profile);
      setAuthStep('input');
      setAuthOtp('');
      setAuthLoading(false);
      fetchOrders(authPhone);
    }, 500);
  };

  const handleResendOtp = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    setAuthError('');
  };

  const resetAuth = () => {
    setAuthStep('input');
    setAuthOtp('');
    setAuthError('');
    setAuthMode('login');
    setAuthPassword('');
  };

  // === Address handlers ===
  const handleSaveAddress = (addr: SavedAddress) => {
    let updated: SavedAddress[];
    if (addr.isDefault) {
      updated = [...addresses.map((a) => ({ ...a, isDefault: false })), addr];
    } else if (addresses.length === 0) {
      updated = [{ ...addr, isDefault: true }];
    } else {
      updated = [...addresses, addr];
    }
    if (editingAddress) {
      updated = updated.map((a) => (a.id === editingAddress.id ? addr : a));
      if (!addr.isDefault && addresses.find((a) => a.id === editingAddress.id)?.isDefault) {
        if (updated.length > 0) updated[0].isDefault = true;
      }
    }
    onAddressesChange(updated);
    setShowAddressForm(false);
    setEditingAddress(null);
  };

  const handleDeleteAddress = (id: string) => {
    const updated = addresses.filter((a) => a.id !== id);
    if (updated.length > 0 && !updated.some((a) => a.isDefault)) {
      updated[0].isDefault = true;
    }
    onAddressesChange(updated);
  };

  const handleSetDefault = (id: string) => {
    onAddressesChange(addresses.map((a) => ({ ...a, isDefault: a.id === id })));
  };

  // === Invoice download ===
  const handleDownloadInvoice = (order: Order) => {
    const items = order.items.map((item: any) =>
      `  ${item.product.title} x${item.quantity} = ${formatPrice(item.product.price * item.quantity)}`
    ).join('\n');
    const invoice = `SCARLET STORE - INVOICE\n${'='.repeat(40)}\n\nOrder: ${order.orderNumber}\nDate: ${formatDate(order.createdAt)}\nCustomer: ${order.customerName}\nPhone: ${order.customerPhone}\n${order.shippingAddress ? `Address: ${order.shippingAddress.line1}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}` : ''}\n\n${'-'.repeat(40)}\nItems:\n${items}\n${'-'.repeat(40)}\nItem Total: ${formatPrice(order.itemTotal)}\nDelivery Fee: ${order.deliveryFee === 0 ? 'FREE' : formatPrice(order.deliveryFee)}\nDiscount: -${formatPrice(order.discount)}\n${'='.repeat(40)}\nTotal: ${formatPrice(order.total)}\nPayment: ${order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'} (${order.paymentStatus})\nStatus: ${ORDER_MILESTONES.find((m) => m.status === order.status)?.label || order.status}\n\nThank you for shopping with Scarlet Store!`;
    const blob = new Blob([invoice], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_${order.orderNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadDigital = (productId: string, fileName: string, orderNumber: string) => {
    const blob = new Blob(
      [`Scarlet Store - Digital Product\n\nOrder: ${orderNumber}\nProduct ID: ${productId}\n\nThank you for your purchase!\nThis is a demo download.\n`],
      { type: 'application/octet-stream' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `download_${productId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // === Render ===
  if (!user) {
    return (
      <AuthScreen
        isOpen={isOpen}
        onClose={onClose}
        authMode={authMode}
        setAuthMode={setAuthMode}
        authStep={authStep}
        authPhone={authPhone}
        setAuthPhone={setAuthPhone}
        authEmail={authEmail}
        setAuthEmail={setAuthEmail}
        authName={authName}
        setAuthName={setAuthName}
        authOtp={authOtp}
        setAuthOtp={setAuthOtp}
        authError={authError}
        authLoading={authLoading}
        generatedOtp={generatedOtp}
        onSendOtp={handleSendOtp}
        onVerifyOtp={handleVerifyOtp}
        onResendOtp={handleResendOtp}
        onReset={resetAuth}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
      />
    );
  }

  const digitalOrders = orders.filter((o) => o.hasDigital);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-100 rounded-t-2xl">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-lg font-bold text-slate-800">My Account</h2>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Profile banner */}
        <div className="bg-gradient-to-r from-[#f43397] to-[#d62a87] p-5 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-2xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-bold">{user.name}</h3>
              <p className="text-sm text-pink-100">{user.phone}</p>
              {user.email && <p className="text-xs text-pink-100">{user.email}</p>}
            </div>
          </div>
        </div>

        {/* Menu items */}
        <div className="p-4 space-y-1">
          <MenuItem icon={Package} label="My Orders" subtext={`${orders.length} order${orders.length !== 1 ? 's' : ''}`} onClick={() => setActiveTab('orders')} />
          <MenuItem icon={MapPin} label="Saved Addresses" subtext={`${addresses.length} address${addresses.length !== 1 ? 'es' : ''}`} onClick={() => setActiveTab('addresses')} />
          <MenuItem icon={Download} label="Digital Downloads" subtext={`${digitalOrders.length} purchase${digitalOrders.length !== 1 ? 's' : ''}`} onClick={() => setActiveTab('downloads')} />
          <MenuItem icon={HelpCircle} label="Help & Support" onClick={() => setActiveTab('support')} />
          <MenuItem icon={User} label="Profile Details" onClick={() => setActiveTab('profile')} />
        </div>

        {/* Logout */}
        <div className="p-4 pt-2">
          <button
            onClick={onLogout}
            className="w-full py-3 text-sm font-semibold text-red-500 border border-red-200 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        </div>

        {/* === Tab panels === */}
        {activeTab === 'orders' && (
          <OrdersTab
            orders={orders}
            loading={loadingOrders}
            onBack={() => setActiveTab('profile')}
            onTrack={onTrackOrder}
            onDownloadInvoice={handleDownloadInvoice}
          />
        )}
        {activeTab === 'addresses' && (
          <AddressesTab
            addresses={addresses}
            onBack={() => setActiveTab('profile')}
            onAdd={() => { setEditingAddress(null); setShowAddressForm(true); }}
            onEdit={(addr) => { setEditingAddress(addr); setShowAddressForm(true); }}
            onDelete={handleDeleteAddress}
            onSetDefault={handleSetDefault}
          />
        )}
        {activeTab === 'downloads' && (
          <DownloadsTab
            orders={orders}
            onBack={() => setActiveTab('profile')}
            onDownload={handleDownloadDigital}
          />
        )}
        {activeTab === 'support' && (
          <SupportTab onBack={() => setActiveTab('profile')} />
        )}
        {activeTab === 'profile' && (
          <ProfileTab user={user} addresses={addresses} onBack={() => {}} />
        )}

        {/* Address form overlay */}
        {showAddressForm && (
          <AddressForm
            address={editingAddress}
            onSave={handleSaveAddress}
            onCancel={() => { setShowAddressForm(false); setEditingAddress(null); }}
          />
        )}
      </div>
    </div>
  );
}

// === Sub-components ===

function MenuItem({ icon: Icon, label, subtext, onClick }: { icon: any; label: string; subtext?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
    >
      <div className="w-10 h-10 rounded-lg bg-pink-50 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[#f43397]" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        {subtext && <p className="text-xs text-slate-400">{subtext}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-slate-300" />
    </button>
  );
}

function TabHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-slate-100 flex items-center gap-2 p-4">
      <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
        <ChevronLeft className="w-5 h-5 text-slate-600" />
      </button>
      <h3 className="text-base font-bold text-slate-800">{title}</h3>
    </div>
  );
}

function ProfileTab({ user, addresses, onBack }: { user: UserProfile; addresses: SavedAddress[]; onBack: () => void }) {
  const defaultAddr = addresses.find((a) => a.isDefault);
  return (
    <>
      <TabHeader title="Profile Details" onBack={onBack} />
      <div className="p-4 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <User className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-400">Name</p>
              <p className="text-sm font-semibold text-slate-700">{user.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <Phone className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-400">Mobile</p>
              <p className="text-sm font-semibold text-slate-700">{user.phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <Mail className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xs text-slate-400">Email</p>
              <p className="text-sm font-semibold text-slate-700">{user.email || 'Not provided'}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
            <Home className="w-5 h-5 text-slate-400 mt-0.5" />
            <div>
              <p className="text-xs text-slate-400">Default Address</p>
              {defaultAddr ? (
                <div className="text-sm text-slate-700">
                  <p className="font-semibold">{defaultAddr.name} · {defaultAddr.phone}</p>
                  <p>{defaultAddr.line1}, {defaultAddr.city}, {defaultAddr.state} - {defaultAddr.pincode}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No default address set</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function OrdersTab({ orders, loading, onBack, onTrack, onDownloadInvoice }: {
  orders: Order[]; loading: boolean; onBack: () => void; onTrack: (o: Order) => void; onDownloadInvoice: (o: Order) => void;
}) {
  return (
    <>
      <TabHeader title="My Orders" onBack={onBack} />
      <div className="p-4 space-y-3">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 mx-auto border-2 border-[#f43397] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400 mt-2">Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 mx-auto text-slate-200" />
            <p className="text-slate-500 font-medium mt-3">No orders yet</p>
            <p className="text-sm text-slate-400 mt-1">Your orders will appear here</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-bold text-slate-700">#{order.orderNumber}</p>
                  <p className="text-xs text-slate-400">{formatDate(order.createdAt)}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  order.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  {ORDER_MILESTONES.find((m) => m.status === order.status)?.label || order.status}
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2">
                {order.items.map((item: any) => (
                  <img key={item.product.id} src={item.product.image} alt={item.product.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ))}
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
                <span className="text-sm font-bold text-slate-800">{formatPrice(order.total)}</span>
                <span className="text-xs text-slate-400">{order.items.length} item{order.items.length > 1 ? 's' : ''}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => onTrack(order)}
                  className="flex-1 py-2 text-xs font-bold bg-[#f43397] text-white rounded-lg hover:bg-[#d62a87] transition-colors flex items-center justify-center gap-1"
                >
                  <Truck className="w-3.5 h-3.5" /> Track
                </button>
                <button
                  onClick={() => onDownloadInvoice(order)}
                  className="flex-1 py-2 text-xs font-bold border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-100 transition-colors flex items-center justify-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" /> Invoice
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function AddressesTab({ addresses, onBack, onAdd, onEdit, onDelete, onSetDefault }: {
  addresses: SavedAddress[]; onBack: () => void; onAdd: () => void; onEdit: (a: SavedAddress) => void;
  onDelete: (id: string) => void; onSetDefault: (id: string) => void;
}) {
  return (
    <>
      <TabHeader title="Saved Addresses" onBack={onBack} />
      <div className="p-4 space-y-3">
        <button
          onClick={onAdd}
          className="w-full py-3 text-sm font-bold text-[#f43397] border-2 border-dashed border-[#f43397]/40 rounded-xl hover:bg-pink-50 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add New Address
        </button>
        {addresses.length === 0 ? (
          <div className="text-center py-8">
            <MapPin className="w-12 h-12 mx-auto text-slate-200" />
            <p className="text-slate-500 font-medium mt-3">No saved addresses</p>
            <p className="text-sm text-slate-400 mt-1">Add an address for faster checkout</p>
          </div>
        ) : (
          addresses.map((addr) => (
            <div key={addr.id} className={`p-4 rounded-xl border-2 ${addr.isDefault ? 'border-[#f43397] bg-pink-50' : 'border-slate-200 bg-white'}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-600">{addr.label}</span>
                  {addr.isDefault && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#f43397] text-white">Default</span>
                  )}
                </div>
              </div>
              <p className="text-sm font-semibold text-slate-700">{addr.name} · {addr.phone}</p>
              <p className="text-xs text-slate-500 mt-1">{addr.line1}, {addr.city}, {addr.state} - {addr.pincode}</p>
              <div className="flex gap-2 mt-3">
                {!addr.isDefault && (
                  <button onClick={() => onSetDefault(addr.id)} className="text-xs font-medium text-[#f43397] hover:underline">
                    Set Default
                  </button>
                )}
                <button onClick={() => onEdit(addr)} className="text-xs font-medium text-slate-500 hover:text-slate-700 flex items-center gap-1">
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => onDelete(addr.id)} className="text-xs font-medium text-red-400 hover:text-red-500 flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
}

function DownloadsTab({ orders, onBack, onDownload }: {
  orders: Order[]; onBack: () => void; onDownload: (productId: string, fileName: string, orderNumber: string) => void;
}) {
  const digitalOrders = orders.filter((o) => o.hasDigital);
  return (
    <>
      <TabHeader title="Digital Downloads" onBack={onBack} />
      <div className="p-4 space-y-3">
        {digitalOrders.length === 0 ? (
          <div className="text-center py-12">
            <Download className="w-12 h-12 mx-auto text-slate-200" />
            <p className="text-slate-500 font-medium mt-3">No digital purchases</p>
            <p className="text-sm text-slate-400 mt-1">Your PDFs, templates & software will appear here</p>
          </div>
        ) : (
          digitalOrders.flatMap((order) =>
            order.items
              .filter((item: any) => item.product.productType === 'digital')
              .map((item: any) => (
                <div key={`${order.id}-${item.product.id}`} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <img src={item.product.image} alt={item.product.title} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 line-clamp-1">{item.product.title}</p>
                    <p className="text-xs text-slate-400">Order #{order.orderNumber}</p>
                    {order.licenseKeys[item.product.id] && (
                      <p className="text-[10px] font-mono text-amber-600 mt-0.5">Key: {order.licenseKeys[item.product.id]}</p>
                    )}
                  </div>
                  <button
                    onClick={() => onDownload(item.product.id, item.product.fileName || 'download', order.orderNumber)}
                    className="px-3 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              ))
          )
        )}
      </div>
    </>
  );
}

function SupportTab({ onBack }: { onBack: () => void }) {
  const faqs = [
    { q: 'How can I track my order?', a: 'Go to Track Order and enter your Order ID or phone number to see real-time delivery status.' },
    { q: 'What is the return policy?', a: 'We offer a 7-day return policy on physical products. Digital products are non-refundable once downloaded.' },
    { q: 'How do I download my digital products?', a: 'Visit Digital Downloads in your account or use the download button on your order confirmation page.' },
    { q: 'When will I receive my license key?', a: 'License keys are generated instantly after payment and available in your order confirmation and Digital Downloads.' },
  ];
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <>
      <TabHeader title="Help & Support" onBack={onBack} />
      <div className="p-4 space-y-4">
        {/* Contact options */}
        <div className="grid grid-cols-2 gap-3">
          <a href="https://wa.me/918000000000" target="_blank" rel="noopener noreferrer"
            className="p-4 bg-emerald-50 rounded-xl text-center hover:bg-emerald-100 transition-colors">
            <MessageCircle className="w-7 h-7 mx-auto text-emerald-600" />
            <p className="text-sm font-semibold text-emerald-700 mt-2">WhatsApp</p>
            <p className="text-xs text-emerald-600 mt-0.5">Chat with us</p>
          </a>
          <a href="tel:1800000000"
            className="p-4 bg-blue-50 rounded-xl text-center hover:bg-blue-100 transition-colors">
            <Phone className="w-7 h-7 mx-auto text-blue-600" />
            <p className="text-sm font-semibold text-blue-700 mt-2">Call Helpline</p>
            <p className="text-xs text-blue-600 mt-0.5">1800-000-000</p>
          </a>
        </div>

        {/* Support hours */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
          <Clock className="w-5 h-5 text-slate-400" />
          <div>
            <p className="text-sm font-semibold text-slate-600">Support Hours</p>
            <p className="text-xs text-slate-400">Mon - Sun, 9 AM - 9 PM IST</p>
          </div>
        </div>

        {/* FAQs */}
        <div>
          <h4 className="text-sm font-bold text-slate-700 mb-3">Frequently Asked Questions</h4>
          <div className="space-y-2">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-slate-50 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full flex items-center justify-between p-3 text-left"
                >
                  <span className="text-sm font-medium text-slate-700">{faq.q}</span>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${openFaq === idx ? 'rotate-90' : ''}`} />
                </button>
                {openFaq === idx && (
                  <p className="px-3 pb-3 text-xs text-slate-500 leading-relaxed">{faq.a}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Trust badge */}
        <div className="flex items-center gap-2 p-3 bg-pink-50 rounded-xl">
          <Shield className="w-5 h-5 text-[#f43397]" />
          <p className="text-xs text-slate-600">Your data is safe and secure. We never share your information.</p>
        </div>
      </div>
    </>
  );
}

function AddressForm({ address, onSave, onCancel }: {
  address: SavedAddress | null; onSave: (a: SavedAddress) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState<SavedAddress>(
    address || {
      id: crypto.randomUUID(),
      label: 'Home',
      name: '',
      phone: '',
      line1: '',
      city: '',
      state: '',
      pincode: '',
      isDefault: false,
    }
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Name required';
    if (!/^\d{10}$/.test(form.phone)) errs.phone = 'Valid 10-digit phone required';
    if (!form.line1.trim()) errs.line1 = 'Address required';
    if (!form.city.trim()) errs.city = 'City required';
    if (!form.state.trim()) errs.state = 'State required';
    if (!/^\d{6}$/.test(form.pincode)) errs.pincode = 'Valid 6-digit pincode required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(form);
  };

  return (
    <div className="absolute inset-0 z-30 bg-white rounded-t-2xl sm:rounded-2xl flex flex-col">
      <div className="flex items-center gap-2 p-4 border-b border-slate-100">
        <button onClick={onCancel} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h3 className="text-base font-bold text-slate-800">{address ? 'Edit Address' : 'Add New Address'}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Label selector */}
        <div>
          <p className="text-xs font-medium text-slate-500 mb-1.5">Address Type</p>
          <div className="flex gap-2">
            {['Home', 'Work', 'Other'].map((label) => (
              <button
                key={label}
                onClick={() => setForm({ ...form, label })}
                className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  form.label === label ? 'bg-[#f43397] text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <input type="text" placeholder="Full Name *" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#f43397]" />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>
        <div>
          <input type="text" placeholder="Phone Number * (10 digits)" value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#f43397]" />
          {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
        </div>
        <div>
          <textarea placeholder="Address (House No, Street, Area) *" value={form.line1}
            onChange={(e) => setForm({ ...form, line1: e.target.value })} rows={2}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#f43397] resize-none" />
          {errors.line1 && <p className="text-xs text-red-500 mt-1">{errors.line1}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <input type="text" placeholder="City *" value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#f43397]" />
            {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
          </div>
          <div>
            <input type="text" placeholder="State *" value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#f43397]" />
            {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
          </div>
        </div>
        <div>
          <input type="text" placeholder="Pincode * (6 digits)" value={form.pincode}
            onChange={(e) => setForm({ ...form, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
            className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#f43397]" />
          {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode}</p>}
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
            className="w-4 h-4 accent-[#f43397]" />
          <span className="text-sm text-slate-600">Set as default address</span>
        </label>
      </div>
      <div className="p-4 border-t border-slate-100">
        <button onClick={handleSave}
          className="w-full py-3.5 bg-[#f43397] text-white text-sm font-bold rounded-xl hover:bg-[#d62a87] active:scale-[0.98] transition-all">
          {address ? 'Update Address' : 'Save Address'}
        </button>
      </div>
    </div>
  );
}

// === Auth Screen ===
function AuthScreen({
  isOpen, onClose, authMode, setAuthMode, authStep, authPhone, setAuthPhone,
  authEmail, setAuthEmail, authName, setAuthName, authOtp, setAuthOtp,
  authError, authLoading, generatedOtp, onSendOtp, onVerifyOtp, onResendOtp, onReset,
  authPassword, setAuthPassword,
}: any) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-[#f43397] to-[#d62a87] p-6 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div>
                <h2 className="text-lg font-bold">Scarlet Store</h2>
                <p className="text-xs text-pink-100">Welcome! Login or Sign up</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Mode toggle */}
          {authStep === 'input' && (
            <>
              <div className="flex bg-slate-100 rounded-xl p-1">
                <button
                  onClick={() => setAuthMode('login')}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${authMode === 'login' ? 'bg-white text-[#f43397] shadow-sm' : 'text-slate-500'}`}
                >
                  Login
                </button>
                <button
                  onClick={() => setAuthMode('signup')}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${authMode === 'signup' ? 'bg-white text-[#f43397] shadow-sm' : 'text-slate-500'}`}
                >
                  Sign Up
                </button>
              </div>

              <div className="space-y-3">
                {authMode === 'signup' && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="text" placeholder="Enter your name" value={authName}
                        onChange={(e: any) => setAuthName(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#f43397]" />
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder="10-digit mobile number" value={authPhone}
                      onChange={(e: any) => setAuthPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#f43397]" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Email {authMode === 'signup' ? '' : '(Optional)'}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="email" placeholder="your@email.com" value={authEmail}
                      onChange={(e: any) => setAuthEmail(e.target.value)}
                      className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#f43397]" />
                  </div>
                </div>
                {authEmail && (
                  <div>
                    <label className="text-xs font-medium text-slate-500 mb-1 block">Password {authMode === 'signup' ? '' : '(for Firebase login)'}</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="password" placeholder="Min 6 characters" value={authPassword}
                        onChange={(e: any) => setAuthPassword(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#f43397]" />
                    </div>
                  </div>
                )}
              </div>

              {authError && <p className="text-xs text-red-500">{authError}</p>}

              <button onClick={onSendOtp} disabled={authLoading}
                className="w-full py-3.5 bg-[#f43397] text-white text-sm font-bold rounded-xl hover:bg-[#d62a87] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {authLoading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> {authEmail && authPassword ? 'Authenticating...' : 'Sending OTP...'}</>
                ) : (
                  <>{authEmail && authPassword ? (authMode === 'signup' ? 'Sign Up with Firebase' : 'Login with Firebase') : 'Send OTP'}</>
                )}
              </button>

              <p className="text-xs text-center text-slate-400">
                By continuing, you agree to Scarlet Store's Terms & Conditions
              </p>
            </>
          )}

          {/* OTP step */}
          {authStep === 'otp' && (
            <>
              <div className="text-center py-2">
                <div className="w-16 h-16 mx-auto rounded-full bg-pink-50 flex items-center justify-center mb-3">
                  <Phone className="w-8 h-8 text-[#f43397]" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">Verify OTP</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Enter the 6-digit code sent to <strong>{authPhone}</strong>
                </p>
                {/* Demo OTP hint */}
                <div className="mt-2 inline-block bg-amber-50 px-3 py-1.5 rounded-lg">
                  <p className="text-xs text-amber-700">Demo OTP: <span className="font-mono font-bold">{generatedOtp}</span></p>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={authOtp}
                  onChange={(e: any) => setAuthOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-3 py-3 text-center text-lg font-bold tracking-widest border border-slate-200 rounded-lg outline-none focus:border-[#f43397]"
                />
                {authError && <p className="text-xs text-red-500 mt-1 text-center">{authError}</p>}
              </div>

              <button onClick={onVerifyOtp} disabled={authLoading}
                className="w-full py-3.5 bg-[#f43397] text-white text-sm font-bold rounded-xl hover:bg-[#d62a87] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {authLoading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Verifying...</>
                ) : (
                  <>Verify & Continue</>
                )}
              </button>

              <div className="flex items-center justify-between text-xs">
                <button onClick={onReset} className="text-slate-500 hover:text-slate-700">Change number</button>
                <button onClick={onResendOtp} className="text-[#f43397] font-medium hover:underline">Resend OTP</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
