import { useState } from 'react';
import { X, CreditCard, Banknote, CheckCircle2, Lock, Truck, Download } from 'lucide-react';
import type { CartItem, Order, PaymentMethod, ShippingAddress } from '../types';
import { formatPrice, generateOrderId, generateOrderNumber, generateLicenseKey } from '../lib/utils';
import { supabase } from '../lib/supabase';
import { db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface CheckoutModalProps {
  cartItems: CartItem[];
  onClose: () => void;
  onSuccess: (order: Order) => void;
}

export function CheckoutModal({ cartItems, onClose, onSuccess }: CheckoutModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [processing, setProcessing] = useState(false);
  const [address, setAddress] = useState<ShippingAddress>({
    name: '',
    phone: '',
    line1: '',
    city: '',
    state: '',
    pincode: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const hasPhysical = cartItems.some((i) => i.product.productType === 'physical');
  const hasDigital = cartItems.some((i) => i.product.productType === 'digital');

  const itemTotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const originalTotal = cartItems.reduce((sum, item) => sum + item.product.originalPrice * item.quantity, 0);
  const discount = originalTotal - itemTotal;
  const deliveryFee = !hasPhysical || itemTotal >= 499 ? 0 : 49;
  const total = itemTotal + deliveryFee;

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (hasPhysical) {
      if (!address.name.trim()) errs.name = 'Name is required';
      if (!/^\d{10}$/.test(address.phone)) errs.phone = 'Valid 10-digit phone required';
      if (!address.line1.trim()) errs.line1 = 'Address is required';
      if (!address.city.trim()) errs.city = 'City is required';
      if (!address.state.trim()) errs.state = 'State is required';
      if (!/^\d{6}$/.test(address.pincode)) errs.pincode = 'Valid 6-digit pincode required';
    } else {
      if (!address.name.trim()) errs.name = 'Name is required';
      if (!/^\d{10}$/.test(address.phone)) errs.phone = 'Valid 10-digit phone required';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCheckout = async () => {
    if (!validate()) return;
    setProcessing(true);

    const orderNumber = generateOrderNumber();
    const orderId = generateOrderId();
    const licenseKeys: Record<string, string> = {};
    cartItems.forEach((item) => {
      if (item.product.productType === 'digital') {
        licenseKeys[item.product.id] = generateLicenseKey();
      }
    });

    const order: Order = {
      id: orderId,
      orderNumber,
      items: cartItems,
      itemTotal,
      deliveryFee,
      discount,
      total,
      paymentMethod,
      paymentStatus: paymentMethod === 'online' ? 'paid' : 'pending',
      customerName: address.name,
      customerPhone: address.phone,
      shippingAddress: hasPhysical ? address : undefined,
      status: 'placed',
      hasDigital,
      licenseKeys,
      createdAt: new Date().toISOString(),
    };

    // Save to Firestore (primary)
    try {
      await addDoc(collection(db, 'orders'), {
        orderNumber: order.orderNumber,
        items: JSON.parse(JSON.stringify(cartItems)),
        itemTotal,
        deliveryFee,
        discount,
        total,
        paymentMethod,
        paymentStatus: order.paymentStatus,
        customerName: address.name,
        customerPhone: address.phone,
        customerEmail: null,
        shippingAddress: hasPhysical ? address : null,
        status: 'placed',
        hasDigital,
        licenseKeys: licenseKeys,
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Failed to save order to Firestore:', err);
    }

    // Also save to Supabase (backup)
    try {
      const { error } = await supabase.from('orders').insert({
        id: order.id,
        order_number: order.orderNumber,
        items: JSON.parse(JSON.stringify(cartItems)),
        item_total: itemTotal,
        delivery_fee: deliveryFee,
        discount,
        total,
        payment_method: paymentMethod,
        payment_status: order.paymentStatus,
        customer_name: address.name,
        customer_phone: address.phone,
        shipping_address: hasPhysical ? address : null,
        status: 'placed',
        has_digital: hasDigital,
        license_keys: licenseKeys,
      });
      if (error) throw error;
    } catch (err) {
      console.error('Failed to save order to Supabase:', err);
    }

    setProcessing(false);
    onSuccess(order);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white flex items-center justify-between p-4 border-b border-slate-100 rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-slate-800">Checkout</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Address form */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              {hasPhysical ? <Truck className="w-4 h-4 text-[#f43397]" /> : <Download className="w-4 h-4 text-[#f43397]" />}
              {hasPhysical ? 'Delivery Address' : 'Customer Details'}
            </h3>
            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={address.name}
                  onChange={(e) => setAddress({ ...address, name: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#f43397]"
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              <div>
                <input
                  type="text"
                  placeholder="Phone Number * (10 digits)"
                  value={address.phone}
                  onChange={(e) => setAddress({ ...address, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#f43397]"
                />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
              </div>
              {hasPhysical && (
                <>
                  <div>
                    <textarea
                      placeholder="Address (House No, Street, Area) *"
                      value={address.line1}
                      onChange={(e) => setAddress({ ...address, line1: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#f43397] resize-none"
                    />
                    {errors.line1 && <p className="text-xs text-red-500 mt-1">{errors.line1}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        placeholder="City *"
                        value={address.city}
                        onChange={(e) => setAddress({ ...address, city: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#f43397]"
                      />
                      {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="State *"
                        value={address.state}
                        onChange={(e) => setAddress({ ...address, state: e.target.value })}
                        className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#f43397]"
                      />
                      {errors.state && <p className="text-xs text-red-500 mt-1">{errors.state}</p>}
                    </div>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Pincode * (6 digits)"
                      value={address.pincode}
                      onChange={(e) => setAddress({ ...address, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                      className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-[#f43397]"
                    />
                    {errors.pincode && <p className="text-xs text-red-500 mt-1">{errors.pincode}</p>}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Payment method */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Payment Method</h3>
            <div className="space-y-2">
              <button
                onClick={() => setPaymentMethod('cod')}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${
                  paymentMethod === 'cod' ? 'border-[#f43397] bg-pink-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Banknote className={`w-5 h-5 ${paymentMethod === 'cod' ? 'text-[#f43397]' : 'text-slate-400'}`} />
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-slate-700">Cash on Delivery</p>
                  <p className="text-xs text-slate-400">Pay when you receive your order</p>
                </div>
                {paymentMethod === 'cod' && <CheckCircle2 className="w-5 h-5 text-[#f43397]" />}
              </button>
              <button
                onClick={() => setPaymentMethod('online')}
                className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${
                  paymentMethod === 'online' ? 'border-[#f43397] bg-pink-50' : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <CreditCard className={`w-5 h-5 ${paymentMethod === 'online' ? 'text-[#f43397]' : 'text-slate-400'}`} />
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-slate-700">Online Payment</p>
                  <p className="text-xs text-slate-400">Pay securely via UPI / Card / Net Banking</p>
                </div>
                {paymentMethod === 'online' && <CheckCircle2 className="w-5 h-5 text-[#f43397]" />}
              </button>
            </div>
          </div>

          {/* Price breakdown */}
          <div className="p-4 bg-slate-50 rounded-xl space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Item Total ({cartItems.length} items)</span>
              <span>{formatPrice(itemTotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Delivery Fee</span>
              <span className={deliveryFee === 0 ? 'text-emerald-600 font-medium' : ''}>
                {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
              </span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>Discount</span>
                <span>−{formatPrice(discount)}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-bold text-slate-900">
              <span>Total Amount</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>

          {/* Place order */}
          <button
            onClick={handleCheckout}
            disabled={processing || cartItems.length === 0}
            className="w-full py-3.5 bg-[#f43397] text-white text-sm font-bold rounded-xl hover:bg-[#d62a87] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {processing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Place Order · {formatPrice(total)}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
