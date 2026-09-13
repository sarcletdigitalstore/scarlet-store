import { useState, useEffect } from 'react';
import { X, Search, Package, CheckCircle2, Clock } from 'lucide-react';
import type { Order, OrderStatus } from '../types';
import { ORDER_MILESTONES, getMilestoneIndex, formatDate, formatPrice } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { db } from '../lib/firebase';
import { collection, getDocs, query as firestoreQuery, where } from 'firebase/firestore';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialOrder?: Order | null;
  searchPhone: string;
}

export function OrderTrackingModal({ isOpen, onClose, initialOrder, searchPhone }: OrderTrackingModalProps) {
  const [query, setQuery] = useState('');
  const [searchedOrders, setSearchedOrders] = useState<Order[] | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(initialOrder || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialOrder) {
      setSelectedOrder(initialOrder);
      setSearchedOrders(null);
    }
  }, [initialOrder]);

  useEffect(() => {
    if (searchPhone) setQuery(searchPhone);
  }, [searchPhone]);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSelectedOrder(null);
    let orders: Order[] = [];
    const isPhone = /^\d{10}$/.test(query.trim());

    // Try Firestore first
    try {
      let snap;
      if (isPhone) {
        const q = firestoreQuery(collection(db, 'orders'), where('customerPhone', '==', query.trim()));
        snap = await getDocs(q);
      } else {
        const q = firestoreQuery(collection(db, 'orders'), where('orderNumber', '==', query.trim().toUpperCase()));
        snap = await getDocs(q);
      }
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
    } catch (err) {
      console.error('Firestore search failed:', err);
    }

    // Fallback to Supabase if Firestore returned nothing
    if (orders.length === 0) {
      try {
        let data: any[] = [];
        if (isPhone) {
          const res = await supabase.from('orders').select('*').eq('customer_phone', query.trim());
          data = res.data || [];
        } else {
          const res = await supabase.from('orders').select('*').eq('order_number', query.trim().toUpperCase());
          data = res.data || [];
        }
        orders = data.map((row: any) => ({
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
      } catch (err2) {
        console.error('Supabase search failed:', err2);
      }
    }

    setSearchedOrders(orders);
    if (orders.length === 1) setSelectedOrder(orders[0]);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-slate-100 rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#f43397]" />
            <h2 className="text-lg font-bold text-slate-800">Track Order</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Search bar */}
          <div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter Order ID or Phone Number"
                  className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#f43397]"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-5 py-2.5 text-sm font-bold bg-[#f43397] text-white rounded-lg hover:bg-[#d62a87] transition-colors disabled:opacity-50"
              >
                {loading ? '...' : 'Track'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Try: Order ID (e.g. SS-XXXX-1234) or 10-digit phone number</p>
          </div>

          {/* Search results list */}
          {searchedOrders && searchedOrders.length > 1 && !selectedOrder && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-600">{searchedOrders.length} orders found:</p>
              {searchedOrders.map((ord) => (
                <button
                  key={ord.id}
                  onClick={() => setSelectedOrder(ord)}
                  className="w-full flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-700">#{ord.orderNumber}</p>
                    <p className="text-xs text-slate-400">{formatDate(ord.createdAt)} · {formatPrice(ord.total)}</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    ord.status === 'delivered' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                  }`}>
                    {ORDER_MILESTONES.find((m) => m.status === ord.status)?.label || ord.status}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {searchedOrders && searchedOrders.length === 0 && !selectedOrder && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">No orders found</p>
              <p className="text-sm text-slate-400 mt-1">Check your Order ID or phone number and try again</p>
            </div>
          )}

          {/* Order tracking detail */}
          {selectedOrder && (
            <OrderTrackingDetail order={selectedOrder} />
          )}

          {/* Initial state */}
          {!searchedOrders && !selectedOrder && (
            <div className="text-center py-8">
              <div className="w-16 h-16 mx-auto rounded-full bg-pink-50 flex items-center justify-center mb-3">
                <Package className="w-8 h-8 text-[#f43397]" />
              </div>
              <p className="text-slate-500 font-medium">Track Your Order</p>
              <p className="text-sm text-slate-400 mt-1">Enter your order ID or phone number to see real-time status</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function OrderTrackingDetail({ order }: { order: Order }) {
  const currentIdx = getMilestoneIndex(order.status);
  const isDelivered = order.status === 'delivered';

  return (
    <div className="space-y-4">
      {/* Order info card */}
      <div className="p-4 bg-slate-50 rounded-xl">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm font-bold text-slate-700">Order #{order.orderNumber}</p>
            <p className="text-xs text-slate-400">{formatDate(order.createdAt)}</p>
          </div>
          <span className={`text-xs font-medium px-3 py-1 rounded-full ${
            isDelivered ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
          }`}>
            {isDelivered ? 'Delivered' : 'In Transit'}
          </span>
        </div>
        <div className="flex justify-between text-sm text-slate-600 pt-2 border-t border-slate-200">
          <span>Total: <strong className="text-slate-800">{formatPrice(order.total)}</strong></span>
          <span>{order.items.length} item{order.items.length > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Milestone progress bar */}
      <div className="py-2">
        <div className="relative">
          {/* Progress line */}
          <div className="absolute top-5 left-5 right-5 h-1 bg-slate-200 rounded-full" />
          <div
            className="absolute top-5 left-5 h-1 bg-[#f43397] rounded-full transition-all duration-500"
            style={{ width: `calc(${(currentIdx / (ORDER_MILESTONES.length - 1)) * 100}% - ${currentIdx === 0 ? 0 : 10}px)` }}
          />

          {/* Milestones */}
          <div className="relative flex justify-between">
            {ORDER_MILESTONES.map((milestone, idx) => {
              const isCompleted = idx <= currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <div key={milestone.status} className="flex flex-col items-center gap-2 z-10">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-base transition-all ${
                      isCompleted
                        ? 'bg-[#f43397] text-white scale-100'
                        : 'bg-slate-200 text-slate-400 scale-90'
                    } ${isCurrent ? 'ring-4 ring-pink-200 animate-pulse' : ''}`}
                  >
                    {isCompleted && !isCurrent ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      <span>{milestone.icon}</span>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium text-center max-w-[60px] leading-tight ${
                    isCompleted ? 'text-slate-700' : 'text-slate-400'
                  }`}>
                    {milestone.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Status timeline */}
      <div className="space-y-3">
        {ORDER_MILESTONES.map((milestone, idx) => {
          const isCompleted = idx <= currentIdx;
          const isCurrent = idx === currentIdx;
          if (!isCompleted) return null;
          return (
            <div key={milestone.status} className="flex items-start gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                isCurrent ? 'bg-[#f43397] text-white' : 'bg-emerald-100 text-emerald-600'
              }`}>
                {isCurrent ? <Clock className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              </div>
              <div>
                <p className={`text-sm font-medium ${isCurrent ? 'text-[#f43397]' : 'text-slate-700'}`}>
                  {milestone.label}
                </p>
                {isCurrent && (
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isDelivered ? 'Your order has been delivered successfully' : 'Your order is currently at this stage'}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Items */}
      <div className="p-3 bg-slate-50 rounded-xl">
        <p className="text-xs font-semibold text-slate-600 mb-2">Items in this order:</p>
        <div className="space-y-2">
          {order.items.map((item: any) => (
            <div key={item.product.id} className="flex items-center gap-2">
              <img src={item.product.image} alt={item.product.title} className="w-8 h-8 rounded object-cover" />
              <p className="text-xs text-slate-600 flex-1 line-clamp-1">{item.product.title}</p>
              <span className="text-xs text-slate-400">x{item.quantity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
