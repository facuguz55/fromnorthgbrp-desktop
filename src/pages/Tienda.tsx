import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Store, RefreshCw, Search, Pencil, X,
  CheckCircle2, AlertCircle,
  Users, Tag, Plus, Percent, DollarSign, Truck, Phone, Mail, Calendar, ShoppingBag,
  Package, AlertTriangle, Eye, EyeOff,
} from 'lucide-react';
import { getSettings } from '../services/dataService';
import {
  fetchTNProductsForManagement,
  fetchTNCategories,
  updateTNCategory,
  updateTNProductVariant,
  fetchTNCustomers,
  fetchTNCustomerOrders,
  fetchTNProducts,
} from '../services/tiendanubeService';
import type { StockItemWithIds, TNCategory, TNCustomer, TNOrder, StockItem } from '../services/tiendanubeService';
import {
  fetchProductosOcultos,
  insertProductoOculto,
  insertProductosOcultosBulk,
  deleteProductoOculto,
  deleteAllProductosOcultos,
} from '../services/supabaseService';
import './Tienda.css';
import './TiendanubeVentas.css';
import './Clientes.css';
import './Cupones.css';
import './Stock.css';