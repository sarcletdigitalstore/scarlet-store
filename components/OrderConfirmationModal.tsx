import { X, CheckCircle2, Download, Mail, Key, Package, Truck } from 'lucide-react';
import type { Order } from '../types';
import { formatPrice, formatDate } from '../lib/utils';

interface OrderConfirmationModalProps {
  order: Order;
  onClose: () => void;
  onTrackOrder: () => void;
}

export function OrderConfirmationModal({ order, onClose, onTrackOrder }: OrderConfirmationModalProps) {
  const digitalItems = order.items.filter((i) => i.product.productType === 'digital');
  const physicalItems = order.items.filter((i) => i.product.productType === 'physical');

  const handleDownload = (productId: string, fileName: string) => {
    const blob = new Blob(
      [`Scarlet Store - Digital Product\n\nThank you for your purchase!\n\nProduct ID: ${productId}\nOrder: ${order.orderNumber}\n\nThis is a demo download. In production, your actual file would be served here.\n`],
      { type: 'application/octet-stream' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || `download_${productId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/80 backdrop-blur shadow-md flex items-center justify-center hover:bg-slate-100 transition-colors"
        >
          <X className="w-5 h-5 text-slate-600" />
        </button>

        {/* Success header */}
        <div className="bg-gradient-to-b from-emerald-50 to-white p-6 text-center pt-8">
          <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-9 h-9 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Order Confirmed!</h2>
          <p className="text-sm text-slate-500 mt-1">Order #{order.orderNumber}</p>
          <p className="text-xs text-slate-400 mt-0.5">{formatDate(order.createdAt)}</p>
        </div>

        <div className="p-5 space-y-4">
          {/* Digital downloads */}
          {order.hasDigital && digitalItems.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Download className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-blue-800">Your Digital Downloads</h3>
              </div>
              <div className="space-y-3">
                {digitalItems.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3 p-3 bg-white rounded-lg">
                    <img src={item.product.image} alt={item.product.title} className="w-12 h-12 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 line-clamp-1">{item.product.title}</p>
                      {order.licenseKeys[item.product.id] && (
                        <div className="flex items-center gap-1 mt-1">
                          <Key className="w-3 h-3 text-amber-500" />
                          <span className="text-xs font-mono text-slate-500">License: {order.licenseKeys[item.product.id]}</span>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleDownload(item.product.id, item.product.fileName || 'download')}
                      className="px-3 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1 shrink-0"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-xs text-blue-600">
                <Mail className="w-3.5 h-3.5" />
                <span>Download link & license key also sent to your email</span>
              </div>
            </div>
          )}

          {/* Physical items summary */}
          {physicalItems.length > 0 && (
            <div className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <Package className="w-5 h-5 text-slate-600" />
                <h3 className="text-sm font-bold text-slate-700">Physical Items</h3>
              </div>
              <div className="space-y-2">
                {physicalItems.map((item) => (
                  <div key={item.product.id} className="flex items-center gap-3">
                    <img src={item.product.image} alt={item.product.title} className="w-10 h-10 rounded-lg object-cover" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-600 line-clamp-1">{item.product.title}</p>
                      <p className="text-xs text-slate-400">Qty: {item.quantity}</p>
                    </div>
                    <span className="text-sm font-semibold text-slate-700">{formatPrice(item.product.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
              {order.shippingAddress && (
                <div className="mt-3 pt-3 border-t border-slate-200 flex items-start gap-2">
                  <Truck className="w-4 h-4 text-slate-400 mt-0.5" />
                  <div className="text-xs text-slate-500">
                    <p className="font-medium text-slate-600">{order.shippingAddress.name}</p>
                    <p>{order.shippingAddress.line1}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
                    <p>Phone: {order.shippingAddress.phone}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment summary */}
          <div className="p-4 bg-slate-50 rounded-xl space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-600">
              <span>Payment Method</span>
              <span className="font-medium">{order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment'}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Payment Status</span>
              <span className={`font-medium ${order.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-orange-500'}`}>
                {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
              </span>
            </div>
            <div className="flex justify-between font-bold text-slate-900 pt-1.5 border-t border-slate-200">
              <span>Total Paid</span>
              <span>{formatPrice(order.total)}</span>
            </div>
          </div>

          {/* Track order button */}
          <button
            onClick={onTrackOrder}
            className="w-full py-3.5 bg-[#f43397] text-white text-sm font-bold rounded-xl hover:bg-[#d62a87] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Package className="w-4 h-4" />
            Track Your Order
          </button>
        </div>
      </div>
    </div>
  );
}
