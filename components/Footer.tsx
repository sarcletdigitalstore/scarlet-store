import { Truck, Shield, Headphones, CreditCard } from 'lucide-react';

interface FooterProps {
  onOpenTracking: () => void;
}

export function Footer({ onOpenTracking }: FooterProps) {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-8 pb-20 md:pb-0">
      {/* Trust badges */}
      <div className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <Truck className="w-6 h-6 text-[#f43397]" />
            <div>
              <p className="text-sm font-semibold text-white">Fast Delivery</p>
              <p className="text-xs text-slate-400">Across India</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-[#f43397]" />
            <div>
              <p className="text-sm font-semibold text-white">Secure Payments</p>
              <p className="text-xs text-slate-400">100% Protected</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CreditCard className="w-6 h-6 text-[#f43397]" />
            <div>
              <p className="text-sm font-semibold text-white">Easy Returns</p>
              <p className="text-xs text-slate-400">7-day return policy</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Headphones className="w-6 h-6 text-[#f43397]" />
            <div>
              <p className="text-sm font-semibold text-white">24/7 Support</p>
              <p className="text-xs text-slate-400">Always here to help</p>
            </div>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-8">
        <div>
          <h4 className="text-sm font-bold text-white mb-3">Scarlet Store</h4>
          <ul className="space-y-2 text-xs">
            <li><span className="hover:text-[#f43397] cursor-pointer transition-colors">About Us</span></li>
            <li><span className="hover:text-[#f43397] cursor-pointer transition-colors">Careers</span></li>
            <li><span className="hover:text-[#f43397] cursor-pointer transition-colors">Blog</span></li>
            <li><span className="hover:text-[#f43397] cursor-pointer transition-colors">Press</span></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold text-white mb-3">Help</h4>
          <ul className="space-y-2 text-xs">
            <li><button onClick={onOpenTracking} className="hover:text-[#f43397] transition-colors">Track Order</button></li>
            <li><span className="hover:text-[#f43397] cursor-pointer transition-colors">Returns & Refunds</span></li>
            <li><span className="hover:text-[#f43397] cursor-pointer transition-colors">Shipping Info</span></li>
            <li><span className="hover:text-[#f43397] cursor-pointer transition-colors">FAQs</span></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold text-white mb-3">Policies</h4>
          <ul className="space-y-2 text-xs">
            <li><span className="hover:text-[#f43397] cursor-pointer transition-colors">Privacy Policy</span></li>
            <li><span className="hover:text-[#f43397] cursor-pointer transition-colors">Terms of Service</span></li>
            <li><span className="hover:text-[#f43397] cursor-pointer transition-colors">Return Policy</span></li>
            <li><span className="hover:text-[#f43397] cursor-pointer transition-colors">Warranty</span></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-bold text-white mb-3">Categories</h4>
          <ul className="space-y-2 text-xs">
            <li><span className="hover:text-[#f43397] cursor-pointer transition-colors">Packaging Supplies</span></li>
            <li><span className="hover:text-[#f43397] cursor-pointer transition-colors">Stationery</span></li>
            <li><span className="hover:text-[#f43397] cursor-pointer transition-colors">Mobile Accessories</span></li>
            <li><span className="hover:text-[#f43397] cursor-pointer transition-colors">Digital Downloads</span></li>
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-400">© 2026 Scarlet Store. All rights reserved.</p>
          <p className="text-xs text-slate-400">Made with care in India</p>
        </div>
      </div>
    </footer>
  );
}
