export type ProductType = 'physical' | 'digital';

export type Category =
  | 'packaging'
  | 'stationery'
  | 'mobile_accessories'
  | 'books'
  | 'pdf_guides'
  | 'templates'
  | 'software';

export interface Product {
  id: string;
  title: string;
  description: string;
  category: Category;
  productType: ProductType;
  price: number;
  originalPrice: number;
  rating: number;
  reviewsCount: number;
  image: string;
  stock: number;
  badge?: string;
  deliveryDays: number;
  fileName?: string;
  fileSize?: string;
  fileFormat?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export type OrderStatus =
  | 'placed'
  | 'packed'
  | 'shipped'
  | 'out_for_delivery'
  | 'delivered';

export type PaymentMethod = 'cod' | 'online';

export interface ShippingAddress {
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
}

export interface SavedAddress {
  id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

export interface UserProfile {
  uid?: string;
  name: string;
  phone: string;
  email: string;
  loggedInAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  items: CartItem[];
  itemTotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid';
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress?: ShippingAddress;
  status: OrderStatus;
  hasDigital: boolean;
  licenseKeys: Record<string, string>;
  createdAt: string;
}
