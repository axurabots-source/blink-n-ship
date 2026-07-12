"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/Toast";
import { normalizePakistaniPhone, normalizePakistaniPhoneOnBlur, isValidPakistaniPhone } from "@/lib/phone";
import {
  Loader2,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Sparkles,
  PackageCheck,
  Trash2,
  AlertTriangle,
  Undo,
  Edit2,
  Check,
  X,
  Filter,
  Plus,
  Minus,
} from "lucide-react";

type OrderItem = {
  id: string;
  productId: string | null;
  productName: string | null;
  quantity: number;
  costPrice: string | null;
  saleAmount: string | null;
  profit: string | null;
};

type Order = {
  id: string;
  customerName: string | null;
  phoneNumber: string | null;
  address: string | null;
  city: string | null;
  productInfo: string | null;
  productId: string | null;
  quantity: number;
  costPrice: string | null;
  saleAmount: string | null;
  sellingPrice: string | null;
  profit: string | null;
  status: string;
  trackingNumber: string | null;
  weight: string | null;
  shippingType: string | null;
  createdAt: string;
  bookedAt: string | null;
  items?: OrderItem[];
};

type Product = {
  id: string;
  name: string;
  costPrice: string;
  stockQuantity: number;
  weight: string;
};

type Profile = {
  id: string;
  accountType: "inventory_holder" | "reseller";
  businessName: string | null;
};

const T = {
  bg: "#ffffff",
  fg: "#0a0a0a",
  accent: "#CC785C",
  accentHover: "#b8694e",
  accentLight: "#fff5f0",
  border: "#e5e5e5",
  muted: "#737373",
  card: "#fafafa",
};

const getShippingTypeFromWeight = (w: number) => {
  if (w > 3) return "Overland";
  if (w > 1) return "Detain";
  return "Overnight";
};

const isPhoneInvalid = (phone: string | null) => {
  if (!phone) return true;
  return !isValidPakistaniPhone(phone);
};

export default function OrdersPage() {
  const { toast } = useToast();
  const [rawText, setRawText] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set());
  const [selectedBooked, setSelectedBooked] = useState<Set<string>>(new Set());
  const [expandedDrafts, setExpandedDrafts] = useState<Set<string>>(new Set());
  const [productsLoaded, setProductsLoaded] = useState(false);

  // Inline editing booked orders state
  const [editingBookedId, setEditingBookedId] = useState<string | null>(null);
  const [editBookedForm, setEditBookedForm] = useState<Partial<Order>>({});

  const [savingEdit, setSavingEdit] = useState(false);

  const [extracting, setExtracting] = useState(false);
  const [booking, setBooking] = useState(false);
  const [unbooking, setUnbooking] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState<Set<string>>(
    new Set(),
  );
  // Per-order field-level errors: Record<orderId, Set<fieldName>>
  const [fieldErrors, setFieldErrors] = useState<Record<string, Set<string>>>(
    {},
  );
  // Hydrate orderItemsMap from API-loaded orders (items are not in local state initially)
  function hydrateItemsFromOrders(orders: Order[]) {
    const map: Record<string, OrderItem[]> = {};
    for (const o of orders) {
      if (o.items && o.items.length > 0) {
        map[o.id] = o.items.map((item) => ({ ...item }));
      }
    }
    setOrderItemsMap((prev) => ({ ...prev, ...map }));
  }
  // Order items per order (multi-product support)
  const [orderItemsMap, setOrderItemsMap] = useState<
    Record<string, OrderItem[]>
  >({});
  // Add another product push counter for unique keys per order
  const [orderItemKey, setOrderItemKey] = useState<Record<string, number>>({});

  // City dropdown open state: Record<orderId, boolean>
  const [cityDropdownOpen, setCityDropdownOpen] = useState<
    Record<string, boolean>
  >({});
  const [syncingCities, setSyncingCities] = useState(false);
  // Keyboard navigation highlight index for cities dropdown: Record<orderId, number>
  const [activeCityIndex, setActiveCityIndex] = useState<
    Record<string, number>
  >({});
  // Courier dropdown open state: Record<orderId, boolean>
  const [courierDropdownOpen, setCourierDropdownOpen] = useState<
    Record<string, boolean>
  >({});
  const [syncingCompanies, setSyncingCompanies] = useState(false);
  // Keyboard navigation for courier dropdown: Record<orderId, number>
  const [activeCourierIndex, setActiveCourierIndex] = useState<
    Record<string, number>
  >({});
  // Courier search text: Record<orderId, string> (separate from selectedCourier which stores the code)
  const [courierSearch, setCourierSearch] = useState<Record<string, string>>(
    {},
  );
  // Product dropdown state: Record<orderId, boolean>
  const [productDropdownOpen, setProductDropdownOpen] = useState<
    Record<string, boolean>
  >({});
  // Product search text: Record<orderId, string>
  const [productSearch, setProductSearch] = useState<Record<string, string>>(
    {},
  );
  // Keyboard navigation for product dropdown: Record<orderId, number>
  const [activeProductIndex, setActiveProductIndex] = useState<
    Record<string, number>
  >({});
  // Bulk bar custom select state
  const [bulkSelectOpen, setBulkSelectOpen] = useState(false);
  const [bulkSelectLabel, setBulkSelectLabel] = useState("Select...");
  // Touched fields tracking: Record<orderId, Set<string>>
  const [touchedFields, setTouchedFields] = useState<
    Record<string, Set<string>>
  >({});
  // Input references for scrolling to first invalid field
  const fieldRefs = useRef<
    Record<string, HTMLInputElement | HTMLSelectElement | null>
  >({});

  // Animated delete confirmation state
  const [deletingTarget, setDeletingTarget] = useState<string | null>(null);
  const [deleteProgress, setDeleteProgress] = useState<number | null>(null);
  const [hoveredBtn, setHoveredBtn] = useState<string | null>(null);

  // Unbook animation state
  const [unbookingId, setUnbookingId] = useState<string | null>(null);
  const [unbookProgress, setUnbookProgress] = useState<number | null>(null);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"drafts" | "booked">("drafts");

  // Per-order rate estimate state
  const [rateEstimates, setRateEstimates] = useState<Record<string, any>>({});
  // Per-order selected courier
  const [selectedCourier, setSelectedCourier] = useState<
    Record<string, string>
  >({});
  // Cities and courier companies lists
  const [dbCities, setDbCities] = useState<
    { id: string; name: string; code: string }[]
  >([]);
  const [courierCompanies, setCourierCompanies] = useState<
    { id: string; name: string; code: string }[]
  >([]);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    abortRef.current = controller;

    // Hydrate state from memory cache instantly
    const cache = (window as any).__BNS_CACHE__;
    if (cache) {
      if (cache.orders) {
        setOrders(cache.orders);
        hydrateItemsFromOrders(cache.orders);
      }
      if (cache.profile) setProfile(cache.profile);
      if (cache.products) {
        setProducts(cache.products);
        setProductsLoaded(true);
      }
      if (cache.dbCities) setDbCities(cache.dbCities);
      if (cache.courierCompanies) setCourierCompanies(cache.courierCompanies);
    }

    async function init() {
      try {
        await Promise.all([refresh(), loadProducts(), loadCourierMeta()]);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("OrdersPage init error:", err);
        }
      }
    }
    init();

    return () => controller.abort();
  }, []);

  // Auto-sum order items totals into main costPrice/saleAmount/profit/weight fields
  useEffect(() => {
    Object.keys(orderItemsMap).forEach((orderId) => {
      const items = orderItemsMap[orderId] || [];
      const totalCost = items.reduce(
        (s, i) => s + Number(i.costPrice || 0) * i.quantity, 0,
      );
      const totalSale = items.reduce(
        (s, i) => s + Number(i.saleAmount || 0) * i.quantity, 0,
      );
      const allInventory = items.length > 0 && items.every(i => i.productId);
      let totalWeight = 0;
      if (allInventory) {
        totalWeight = items.reduce((s, i) => {
          if (i.productId) {
            const prod = products.find(p => p.id === i.productId);
            return s + (parseFloat(prod?.weight || "0") || 0) * i.quantity;
          }
          return s;
        }, 0);
      }
      const hasSomeCost = items.some(i => i.costPrice && Number(i.costPrice) > 0);
      const hasSomeSale = items.some(i => i.saleAmount && Number(i.saleAmount) > 0);
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === orderId) {
            const profit = totalCost && totalSale
              ? String(totalSale - totalCost)
              : null;
            return {
              ...o,
              costPrice: hasSomeCost ? String(totalCost) : o.costPrice,
              saleAmount: hasSomeSale ? String(totalSale) : o.saleAmount,
              profit,
              weight: allInventory && totalWeight > 0 ? String(totalWeight) : o.weight,
            };
          }
          return o;
        }),
      );
    });
  }, [orderItemsMap, products]);

  // Auto-fetch rate estimates whenever the orders list changes (initial load + after refresh)
  // Only fires for draft orders that have both weight and city populated.
  useEffect(() => {
    const drafts = orders.filter(
      (o) => o.status === "draft" && o.weight && o.city,
    );
    if (drafts.length === 0) return;
    for (const order of drafts) {
      // Only trigger if we don't already have an estimate for this order
      if (!rateEstimates[order.id]) {
        fetchRateEstimate(
          order.id,
          parseFloat(String(order.weight || "0")) || 0,
          order.city || "",
          selectedCourier[order.id],
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const loadCourierMeta = useCallback(async () => {
    try {
      const controller = abortRef.current;
      const [citiesRes, companiesRes] = await Promise.all([
        fetch("/api/courier/cities", { signal: controller?.signal }),
        fetch("/api/courier/companies", { signal: controller?.signal }),
      ]);
      let fetchedCities = [];
      let fetchedCompanies = [];
      if (citiesRes.ok) {
        const body = await citiesRes.json();
        fetchedCities = body.cities || [];
        setDbCities(fetchedCities);
      }
      if (companiesRes.ok) {
        const body = await companiesRes.json();
        fetchedCompanies = body.companies || [];
        setCourierCompanies(fetchedCompanies);
      }

      // Update cache
      if (!(window as any).__BNS_CACHE__) (window as any).__BNS_CACHE__ = {};
      (window as any).__BNS_CACHE__.dbCities = fetchedCities;
      (window as any).__BNS_CACHE__.courierCompanies = fetchedCompanies;
    } catch (err: any) {
      if (err.name !== "AbortError") {
        // courier not connected — silently ignore
      }
    }
  }, []);

  async function handleSyncCities() {
    setSyncingCities(true);
    setError("");
    try {
      const res = await fetch("/api/courier/cities", { method: "POST" });
      if (!res.ok) {
        const b = await res.json();
        throw new Error(b.error || "Failed to synchronize operational cities.");
      }
      const body = await res.json();
      setDbCities(body.cities || []);
      if ((window as any).__BNS_CACHE__)
        (window as any).__BNS_CACHE__.dbCities = body.cities || [];
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncingCities(false);
    }
  }

  async function handleSyncCompanies() {
    setSyncingCompanies(true);
    setError("");
    try {
      const res = await fetch("/api/courier/companies", { method: "POST" });
      if (!res.ok) {
        const b = await res.json();
        throw new Error(b.error || "Failed to synchronize courier companies.");
      }
      const body = await res.json();
      setCourierCompanies(body.companies || []);
      if ((window as any).__BNS_CACHE__)
        (window as any).__BNS_CACHE__.courierCompanies = body.companies || [];
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSyncingCompanies(false);
    }
  }

  const refresh = useCallback(async () => {
    try {
      const controller = abortRef.current;
      const res = await fetch("/api/orders", { signal: controller?.signal });
      const body = await res.json();
      const fetchedOrders = body.orders || [];
      setOrders(fetchedOrders);
      hydrateItemsFromOrders(fetchedOrders);
      if (body.profile) {
        setProfile(body.profile);
      }
      // Update cache
      if (!(window as any).__BNS_CACHE__) (window as any).__BNS_CACHE__ = {};
      (window as any).__BNS_CACHE__.orders = fetchedOrders;
      if (body.profile) (window as any).__BNS_CACHE__.profile = body.profile;
    } catch (err: any) {
      if (err.name !== "AbortError") setError(err.message);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    const controller = abortRef.current;
    try {
      const res = await fetch("/api/products", { signal: controller?.signal });
      const body = await res.json();
      const fetchedProducts = body.products || [];
      setProducts(fetchedProducts);
      setProductsLoaded(true);
      if (!(window as any).__BNS_CACHE__) (window as any).__BNS_CACHE__ = {};
      (window as any).__BNS_CACHE__.products = fetchedProducts;
    } catch (err: any) {
      if (err.name !== "AbortError") throw err;
    }
  }, []);

  async function handleExtract() {
    if (!rawText.trim()) return;
    setExtracting(true);
    setError("");
    try {
      const res = await fetch("/api/orders/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_text: rawText }),
      });
      if (!res.ok) {
        const b = await res.json();
        throw new Error(b.error || "Extraction failed");
      }
      setRawText("");
      toast("success", "Orders extracted successfully");
      await refresh();
    } catch (err: any) {
      setError(err.message);
      toast("error", err.message);
    } finally {
      setExtracting(false);
    }
  }

  function editLocal(orderId: string, field: keyof Order, value: any) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, [field]: value } : o)),
    );

    // Remove field validation error instantly once corrected
    setTouchedFields((prev) => {
      const next = { ...prev };
      if (!next[orderId]) next[orderId] = new Set();
      next[orderId].add(String(field));
      return next;
    });

    setFieldErrors((prev) => {
      const next = { ...prev };
      if (next[orderId]) {
        const missing = new Set(next[orderId]);
        let isFilled = false;
        if (typeof value === "string") {
          isFilled = !!value.trim();
        } else {
          isFilled = value !== null && value !== undefined && value !== "";
        }

        // Additional check for city matching operational cities list
        if (field === "city" && isFilled) {
          const exists = dbCities.some(
            (c) => c.name.toLowerCase() === String(value).trim().toLowerCase(),
          );
          isFilled = exists;
        }

        if (isFilled) {
          missing.delete(String(field));
          if (missing.size === 0) {
            delete next[orderId];
            setValidationErrors((prevVal) => {
              const newVal = new Set(prevVal);
              newVal.delete(orderId);
              return newVal;
            });
          } else {
            next[orderId] = missing;
          }
        } else {
          missing.add(String(field));
          next[orderId] = missing;
        }
      }
      return next;
    });
  }

  async function saveFieldsBatch(
    orderId: string,
    updatesObj: Record<string, any>,
  ) {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatesObj),
      });
      if (!res.ok) {
        throw new Error("Failed to update order");
      }
      // Merge only the fields we sent back into local state — do NOT merge the
      // full server response because it may overwrite auto-summed totals with stale null values
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== orderId) return o;
          return { ...o, ...updatesObj };
        }),
      );
      if ("productId" in updatesObj && updatesObj.productId) {
        setValidationErrors((prev) => {
          const next = new Set(prev);
          next.delete(orderId);
          return next;
        });
      }
    } catch (err: any) {
      setError(err.message);
    }
  }

  async function saveField(orderId: string, field: string, value: any) {
    saveFieldsBatch(orderId, { [field]: value });
  }

  function addOrderItem(
    orderId: string,
    productId: string,
    productName: string,
  ) {
    const product = products.find((p) => p.id === productId);
    const isNoInv = productId === "__no_inventory__";

    const newItem: OrderItem = {
      id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      productId: isNoInv ? null : productId,
      productName: isNoInv ? "Book Without Inventory" : productName,
      quantity: 1,
      costPrice: product ? String(product.costPrice) : null,
      saleAmount: null,
      profit: null,
    };

    setOrderItemsMap((prev) => {
      const existing = [...(prev[orderId] || [])];
      existing.push(newItem);
      const updated = { ...prev, [orderId]: existing };
      // Persist immediately so items survive navigation
      saveFieldsBatch(orderId, { orderItems: existing });
      return updated;
    });

    // If it's a real inventory product, auto-set first product's details on order
    if (product && !isNoInv) {
      const weightVal = parseFloat(product.weight) || 0;
      const shippingVal = getShippingTypeFromWeight(weightVal);
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id === orderId) {
            fetchRateEstimate(orderId, weightVal, o.city || "");
            return {
              ...o,
              productId,
              weight: weightVal > 0 ? String(weightVal) : o.weight,
              shippingType: shippingVal,
            };
          }
          return o;
        }),
      );
    }
  }

  function handleProductSelect(orderId: string, productId: string) {
    // Deprecated: use addOrderItem instead
    addOrderItem(
      orderId,
      productId,
      products.find((p) => p.id === productId)?.name || "",
    );
  }

  async function fetchRateEstimate(
    orderId: string,
    weight: number,
    city: string,
    company?: string,
  ) {
    if (!weight || !city) return;
    try {
      const params = new URLSearchParams({ weight: String(weight), city });
      if (company) params.set("company", company);
      const res = await fetch(`/api/courier/rate-estimate?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      setRateEstimates((prev) => ({ ...prev, [orderId]: data }));
    } catch (err: any) {
      if (err.name !== "AbortError") {
        // silently fail — courier may not be connected
      }
    }
  }

  function handleWeightChange(orderId: string, weightStr: string) {
    const w = parseFloat(weightStr) || 0;
    const suggestedShipping = getShippingTypeFromWeight(w);
    const updates = { weight: w, shippingType: suggestedShipping };
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          fetchRateEstimate(orderId, w, o.city || "", selectedCourier[orderId]);
          return { ...o, weight: weightStr, shippingType: suggestedShipping };
        }
        return o;
      }),
    );
    saveFieldsBatch(orderId, updates);
  }

  function handleCourierChange(
    orderId: string,
    company: string,
    weight: string,
    city: string,
  ) {
    setSelectedCourier((prev) => ({ ...prev, [orderId]: company }));
    fetchRateEstimate(orderId, parseFloat(weight) || 0, city, company);
  }

  // Toggle expands
  function toggleExpand(id: string) {
    setExpandedDrafts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Draft checkboxes
  function toggleSelectDraft(id: string) {
    setSelectedDrafts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Booked checkboxes
  function toggleSelectBooked(id: string) {
    setSelectedBooked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const draftOrders = useMemo(
    () => orders.filter((o) => o.status === "draft"),
    [orders],
  );
  const bookedOrders = useMemo(
    () => orders.filter((o) => o.status === "booked"),
    [orders],
  );

  // Bulk selection logic
  function handleBulkSelectDraft(type: "all" | "none" | "valid") {
    if (type === "none") {
      setSelectedDrafts(new Set());
    } else if (type === "all") {
      setSelectedDrafts(new Set(draftOrders.map((o) => o.id)));
    } else if (type === "valid") {
      const valids = draftOrders
        .filter((o) => !isPhoneInvalid(o.phoneNumber))
        .map((o) => o.id);
      setSelectedDrafts(new Set(valids));
    }
  }

  // Bulk delete drafts — now uses animated confirm modal
  async function handleDeleteSelectedDrafts() {
    if (selectedDrafts.size === 0) return;
    setDeletingTarget("bulk-draft");
    setDeleteProgress(null);
  }

  async function executeDeleteDrafts() {
    let current = 0;
    const interval = setInterval(() => {
      current += 4;
      setDeleteProgress(current);
      if (current >= 100) {
        clearInterval(interval);
        performDeleteDrafts();
      }
    }, 25);
  }

  async function performDeleteDrafts() {
    setError("");
    const ids =
      deletingTarget === "bulk-draft"
        ? Array.from(selectedDrafts)
        : deletingTarget
          ? [deletingTarget]
          : [];

    if (ids.length === 0) return;

    // Optimistically remove from state instantly
    setOrders((prev) => prev.filter((o) => !ids.includes(o.id)));
    if (deletingTarget === "bulk-draft") {
      setSelectedDrafts(new Set());
    } else {
      setSelectedDrafts((prev) => {
        const next = new Set(prev);
        next.delete(deletingTarget as string);
        return next;
      });
    }

    setDeleting(false);
    setDeletingTarget(null);
    setDeleteProgress(null);

    // Perform deletions in the background concurrently
    Promise.all(
      ids.map((id) =>
        fetch(`/api/orders/${id}`, { method: "DELETE" }).then((res) => {
          if (!res.ok) throw new Error(`Failed to delete order ${id}`);
          return res;
        })
      )
    )
      .then(() => {
        toast("success", `${ids.length} draft(s) deleted`);
        refresh();
      })
      .catch((err: any) => {
        toast("error", "Failed to delete some drafts");
        refresh();
      });
  }

  // Book selected drafts
  async function handleBookSelected() {
    if (selectedDrafts.size === 0) return;

    setError("");
    setBooking(true);

    // Step 1: Refresh merchant data from local DB before validating
    let freshCities = dbCities;
    let freshCompanies = courierCompanies;
    try {
      const [citiesRes, companiesRes] = await Promise.all([
        fetch("/api/courier/cities"),
        fetch("/api/courier/companies"),
      ]);
      if (citiesRes.ok) {
        const b = await citiesRes.json();
        freshCities = b.cities || [];
        setDbCities(freshCities);
      }
      if (companiesRes.ok) {
        const b = await companiesRes.json();
        freshCompanies = b.companies || [];
        setCourierCompanies(freshCompanies);
      }
    } catch {
      setError(
        "Failed to refresh merchant data before booking. Please try again.",
      );
      setBooking(false);
      return;
    }

    // Step 2: Mark all fields of selected orders as touched so errors show
    const allFields = [
      "customerName",
      "phoneNumber",
      "city",
      "address",
      "sellingPrice",
      "weight",
      "courier",
    ];
    setTouchedFields((prev) => {
      const next = { ...prev };
      selectedDrafts.forEach((id) => {
        if (!next[id]) next[id] = new Set();
        const s = new Set(next[id]);
        allFields.forEach((f) => s.add(f));
        next[id] = s;
      });
      return next;
    });

    // Step 3: Perform validation
    const invalidOrders = new Set<string>();
    const emptyFieldOrders = new Set<string>();
    const newFieldErrors: Record<string, Set<string>> = {};

    selectedDrafts.forEach((id) => {
      const ord = draftOrders.find((o) => o.id === id);
      if (!ord) return;

      const courier = selectedCourier[id];
      const missing = new Set<string>();
      if (!ord.customerName?.trim()) missing.add("customerName");
      if (!ord.phoneNumber?.trim()) missing.add("phoneNumber");

      // Validate city against freshly fetched operational cities
      const cityClean = (ord.city || "").trim().toLowerCase();
      const validCityExists =
        freshCities.length === 0 ||
        freshCities.some((c) => c.name.toLowerCase() === cityClean);
      if (!ord.city?.trim() || !validCityExists) missing.add("city");

      if (!ord.address?.trim()) missing.add("address");
      if (!ord.sellingPrice) missing.add("sellingPrice");
      if (!ord.weight) missing.add("weight");
      if (!courier) missing.add("courier");

      if (missing.size > 0) {
        emptyFieldOrders.add(id);
        newFieldErrors[id] = missing;
      }
    });

    if (emptyFieldOrders.size > 0) {
      setValidationErrors(emptyFieldOrders);
      setFieldErrors(newFieldErrors);
      setExpandedDrafts((prev) => {
        const next = new Set(prev);
        emptyFieldOrders.forEach((id) => next.add(id));
        return next;
      });
      setError(
        "Please fill all required fields (Customer Name, Phone, City, Address, COD Amount, Weight, Courier) before booking.",
      );

      // Scroll to the first invalid field automatically
      setTimeout(() => {
        const firstOrderId = Array.from(emptyFieldOrders)[0];
        const fieldsList = [
          "customerName",
          "phoneNumber",
          "city",
          "address",
          "sellingPrice",
          "weight",
          "courier",
        ];
        const missingList = newFieldErrors[firstOrderId];
        const firstMissingField = fieldsList.find((f) => missingList.has(f));
        if (firstMissingField) {
          const el = fieldRefs.current[`${firstOrderId}-${firstMissingField}`];
          if (el) {
            el.focus();
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }
      }, 100);
      setBooking(false);
      return;
    }

    const hasInvalidPhone = Array.from(selectedDrafts).some((id) => {
      const ord = draftOrders.find((o) => o.id === id);
      return ord && isPhoneInvalid(ord.phoneNumber);
    });

    if (hasInvalidPhone) {
      setError(
        "Please uncheck or fix orders with invalid numbers before booking.",
      );
      setBooking(false);
      return;
    }

    const selectedIds = new Set(selectedDrafts);

    toast("info", "Booking parcels in background...");

    // Optimistically transition status locally
    setOrders((prev) =>
      prev.map((o) =>
        selectedIds.has(o.id) ? { ...o, status: "booked", bookedAt: new Date().toISOString() } : o
      )
    );
    setSelectedDrafts(new Set());
    setActiveTab("booked");
    setBooking(false); // Close loader immediately

    // Perform booking API call in background
    fetch("/api/orders/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_ids: Array.from(selectedIds),
        orderCouriers: selectedCourier,
      }),
    })
      .then(async (res) => {
        const body = await res.json();
        const failed = body.results?.filter((r: any) => !r.success) ?? [];
        const bookedCount = selectedIds.size - failed.length;

        if (failed.length > 0) {
          toast("error", `${failed.length} order(s) failed: ${failed[0].error}`);
        } else if (!res.ok) {
          toast("error", body.error || "Booking failed.");
        }

        if (bookedCount > 0) {
          toast("success", `${bookedCount} parcel(s) booked successfully`);
        }

        // Re-sync with database to ensure exact state matching
        refresh();
        loadProducts();
      })
      .catch((err) => {
        toast("error", "Background booking error: " + err.message);
        refresh();
      });
  }

  // Unbook single booked order — animated
  function handleUnbook(id: string) {
    setUnbookingId(id);
    setUnbookProgress(null);
  }

  async function executeUnbook() {
    if (!unbookingId) return;
    const targetId = unbookingId;
    let current = 0;
    const interval = setInterval(() => {
      current += 5;
      setUnbookProgress(current);
      if (current >= 100) {
        clearInterval(interval);
        performUnbook(targetId);
      }
    }, 20);
  }

  async function performUnbook(id: string) {
    setUnbooking(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });
      if (!res.ok) throw new Error("Failed to unbook shipment");
      toast("success", "Order unbooked successfully");
      await refresh();
      await loadProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUnbooking(false);
      setUnbookingId(null);
      setUnbookProgress(null);
    }
  }

  // Bulk unbook selected
  async function handleUnbookSelected() {
    if (selectedBooked.size === 0) return;
    setUnbooking(true);
    setError("");
    try {
      const res = await fetch("/api/orders/book", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_ids: Array.from(selectedBooked) }),
      });
      if (!res.ok) throw new Error("Bulk unbook failed");
      setSelectedBooked(new Set());
      await refresh();
      toast("success", "Orders unbooked successfully");
      await loadProducts();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUnbooking(false);
    }
  }

  // Inline edit booked row handlers
  function startEditBooked(order: Order) {
    setEditingBookedId(order.id);
    setEditBookedForm({ ...order });
  }

  async function saveInlineEditBooked() {
    if (!editingBookedId) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/orders/${editingBookedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: editBookedForm.customerName,
          city: editBookedForm.city,
          weight: parseFloat(editBookedForm.weight || "0") || 0,
          shippingType: editBookedForm.shippingType,
          sellingPrice: parseFloat(editBookedForm.sellingPrice || "0") || 0,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setEditingBookedId(null);
      await refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <>
      <style>{`
            .bns-orders-booked-table { display: block; }
            .bns-orders-booked-cards { display: none; }
            .bns-order-card {
                border: 1.5px solid ${T.border};
                border-radius: 12px;
                padding: 14px 16px;
                margin-bottom: 10px;
                background: ${T.bg};
            }
            .bns-order-card-row {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 8px;
            }
            .bns-order-card-name {
                font-size: 0.88rem;
                font-weight: 700;
                color: ${T.fg};
                margin-bottom: 4px;
            }
            .bns-order-card-meta {
                display: flex;
                flex-wrap: wrap;
                gap: 4px 12px;
                font-size: 0.76rem;
                color: ${T.muted};
                margin-bottom: 6px;
            }
            .bns-order-card-meta span { display: flex; align-items: center; gap: 4px; }
            .bns-order-card-tracking {
                font-size: 0.72rem;
                font-family: var(--font-geist-mono);
                color: ${T.muted};
                background: ${T.card};
                padding: 2px 8px;
                border-radius: 4px;
                display: inline-block;
            }
            .bns-order-card-profit {
                font-size: 0.82rem;
                font-weight: 700;
                color: #16a34a;
            }
            .bns-order-card-status {
                font-size: 0.65rem;
                font-weight: 600;
                color: #fff;
                background: ${T.accent};
                padding: 1px 8px;
                border-radius: 20px;
                display: inline-block;
            }

            @media (max-width: 768px) {
                .bns-orders-booked-table { display: none; }
                .bns-orders-booked-cards { display: block; margin-top: 16px; }
                .bns-orders-bulk-bar {
                    flex-direction: column !important;
                    align-items: stretch !important;
                    gap: 10px !important;
                }
                .bns-orders-bulk-bar > div:first-child {
                    flex-wrap: wrap !important;
                }
                .bns-orders-bulk-actions {
                    justify-content: flex-start !important;
                    width: 100% !important;
                }
                .bns-orders-draft-bar {
                    flex-direction: column !important;
                    align-items: stretch !important;
                    gap: 10px !important;
                }
                .bns-orders-draft-bar > div:first-child {
                    flex-wrap: wrap !important;
                    gap: 8px !important;
                }
                .bns-orders-draft-bar button:last-child {
                    width: 100% !important;
                    justify-content: center !important;
                }
                .bns-orders-extract {
                    flex-direction: column !important;
                    align-items: stretch !important;
                }
                .bns-orders-extract button {
                    width: 100% !important;
                    justify-content: center !important;
                }
                .bns-orders-tabs {
                    width: 100% !important;
                    display: flex !important;
                }
                .bns-orders-tabs button {
                    flex: 1 !important;
                    text-align: center !important;
                }
                .bns-orders-draft-header {
                    flex-wrap: wrap !important;
                    gap: 6px !important;
                }
                .bns-orders-draft-header > div:first-child {
                    flex-wrap: wrap !important;
                    gap: 6px !important;
                }
            }
            .bns-dropdown {
                scrollbar-width: thin;
                scrollbar-color: #ddd transparent;
            }
            .bns-dropdown::-webkit-scrollbar { width: 5px; }
            .bns-dropdown::-webkit-scrollbar-track { background: transparent; }
            .bns-dropdown::-webkit-scrollbar-thumb { background: #ddd; border-radius: 10px; }
        `}</style>
      {/* Animated Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingTarget && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              paddingTop: 20,
              pointerEvents: "none",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              style={{
                background: "#ffffff",
                border: "1px solid #fecaca",
                borderRadius: 12,
                boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                padding: "20px 24px",
                width: "90%",
                maxWidth: "440px",
                boxSizing: "border-box",
                pointerEvents: "auto",
              }}
            >
              {deleteProgress === null ? (
                <div>
                  <h3
                    style={{
                      margin: "0 0 6px",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: "#dc2626",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <AlertTriangle size={16} /> Confirm Deletion
                  </h3>
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: T.muted,
                      margin: "0 0 16px",
                      lineHeight: 1.4,
                    }}
                  >
                    {deletingTarget === "bulk-draft"
                      ? `Are you sure you want to delete ${selectedDrafts.size} selected draft(s)?`
                      : "Are you sure you want to delete this order?"}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 10,
                    }}
                  >
                    <button
                      onClick={() => {
                        setDeletingTarget(null);
                        setDeleteProgress(null);
                      }}
                      style={{
                        border: `1px solid ${T.border}`,
                        background: "transparent",
                        padding: "6px 14px",
                        borderRadius: 6,
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        color: T.muted,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={executeDeleteDrafts}
                      style={{
                        border: "none",
                        background: "#dc2626",
                        color: "#fff",
                        padding: "6px 16px",
                        borderRadius: 6,
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: T.fg,
                      margin: "0 0 10px",
                    }}
                  >
                    Deleting... {deleteProgress}%
                  </p>
                  <div
                    style={{
                      width: "100%",
                      height: 8,
                      background: T.border,
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${deleteProgress}%`,
                        height: "100%",
                        background: "#dc2626",
                        transition: "width 0.05s linear",
                      }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Unbook Confirmation Modal */}
      <AnimatePresence>
        {unbookingId && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1001,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              paddingTop: 20,
              pointerEvents: "none",
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              style={{
                background: "#ffffff",
                border: "1px solid #fed7aa",
                borderRadius: 12,
                boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                padding: "20px 24px",
                width: "90%",
                maxWidth: "420px",
                boxSizing: "border-box",
                pointerEvents: "auto",
              }}
            >
              {unbookProgress === null ? (
                <div>
                  <h3
                    style={{
                      margin: "0 0 6px",
                      fontSize: "0.95rem",
                      fontWeight: 700,
                      color: "#d97706",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <AlertTriangle size={16} /> Confirm Unbook
                  </h3>
                  <p
                    style={{
                      fontSize: "0.8rem",
                      color: T.muted,
                      margin: "0 0 16px",
                      lineHeight: 1.4,
                    }}
                  >
                    Move this shipment back to Drafts? Stock will be restored.
                  </p>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 10,
                    }}
                  >
                    <button
                      onClick={() => {
                        setUnbookingId(null);
                        setUnbookProgress(null);
                      }}
                      style={{
                        border: `1px solid ${T.border}`,
                        background: "transparent",
                        padding: "6px 14px",
                        borderRadius: 6,
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        color: T.muted,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={executeUnbook}
                      style={{
                        border: "none",
                        background: "#d97706",
                        color: "#fff",
                        padding: "6px 16px",
                        borderRadius: 6,
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      Unbook
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <p
                    style={{
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: T.fg,
                      margin: "0 0 10px",
                    }}
                  >
                    Unbooking... {unbookProgress}%
                  </p>
                  <div
                    style={{
                      width: "100%",
                      height: 8,
                      background: T.border,
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${unbookProgress}%`,
                        height: "100%",
                        background: "#d97706",
                        transition: "width 0.02s linear",
                      }}
                    />
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Extracting animation overlay */}
      <AnimatePresence>
        {extracting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              top: 20,
              right: 24,
              background: "#0a0a0a",
              color: "#fff",
              borderRadius: 10,
              padding: "10px 18px",
              zIndex: 1000,
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: "0.82rem",
              fontWeight: 600,
              boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            >
              <Sparkles size={14} color="#CC785C" />
            </motion.div>
            Extracting orders with AI...
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        style={{
          minHeight: "100vh",
          background: T.bg,
          padding: "40px 48px",
          fontFamily: "var(--font-geist-sans), sans-serif",
          boxSizing: "border-box",
        }}
        className="bns-page"
      >
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontSize: "1.6rem",
              fontWeight: 700,
              color: T.fg,
              margin: 0,
            }}
          >
            Order Booking
          </h1>
          <p
            style={{ color: T.muted, fontSize: "0.875rem", margin: "4px 0 0" }}
          >
            Process raw messages, fill delivery details, and generate courier
            labels instantly.
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "12px 16px",
              color: "#dc2626",
              fontSize: "0.85rem",
              marginBottom: 24,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <AlertTriangle size={15} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Extract section — Always visible at top */}
        <div
          style={{
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
          }}
        >
          <label
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: T.fg,
              display: "block",
              marginBottom: 10,
            }}
          >
            Paste customer orders / messages
          </label>
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste message from customer here. E.g. Name: Aisha Khan, Cell: 03215556789, Address: House 23, Block C, Gulshan, Karachi. Item: 2 lawn suits"
            rows={4}
            style={{
              width: "100%",
              border: `1px solid ${T.border}`,
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: "0.875rem",
              color: T.fg,
              background: T.bg,
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              fontFamily: "inherit",
              lineHeight: 1.6,
            }}
            onFocus={(e) => (e.target.style.borderColor = T.accent)}
            onBlur={(e) => (e.target.style.borderColor = T.border)}
          />
          <div
            className="bns-orders-extract"
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 12,
              marginTop: 14,
            }}
          >
            <AnimatePresence>
              {extracting && (
                <motion.div
                  initial={{ x: -40, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 20, opacity: 0 }}
                  style={{ display: "flex", gap: 5, alignItems: "center" }}
                >
                  {[0, 1, 2].map((i) => (
                    <motion.div
                      key={i}
                      animate={{ y: [0, -5, 0] }}
                      transition={{
                        repeat: Infinity,
                        delay: i * 0.15,
                        duration: 0.5,
                      }}
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#CC785C",
                      }}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            <motion.button
              onClick={handleExtract}
              disabled={extracting || !rawText.trim()}
              whileHover={{ scale: extracting || !rawText.trim() ? 1 : 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background:
                  extracting || !rawText.trim() ? "#e5e5e5" : T.accent,
                color: extracting || !rawText.trim() ? T.muted : "#fff",
                border: "none",
                borderRadius: 8,
                padding: "9px 20px",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor:
                  extracting || !rawText.trim() ? "not-allowed" : "pointer",
              }}
            >
              {extracting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {extracting ? "Extracting..." : "Process Orders"}
            </motion.button>
          </div>
        </div>



        {/* Tabs switcher — Positioned right below extract & warning */}
        <div
          className="bns-orders-tabs"
          style={{
            display: "inline-flex",
            background: T.card,
            border: `1px solid ${T.border}`,
            borderRadius: "8px",
            padding: "3px",
            marginBottom: 24,
          }}
        >
          <button
            onClick={() => setActiveTab("drafts")}
            style={{
              border: "none",
              padding: "7px 20px",
              borderRadius: "6px",
              fontSize: "0.84rem",
              fontWeight: 600,
              cursor: "pointer",
              background: activeTab === "drafts" ? T.bg : "transparent",
              color: activeTab === "drafts" ? T.fg : T.muted,
              boxShadow:
                activeTab === "drafts" ? "0 2px 6px rgba(0,0,0,0.04)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            Drafts ({draftOrders.length})
          </button>
          <button
            onClick={() => setActiveTab("booked")}
            style={{
              border: "none",
              padding: "7px 20px",
              borderRadius: "6px",
              fontSize: "0.84rem",
              fontWeight: 600,
              cursor: "pointer",
              background: activeTab === "booked" ? T.bg : "transparent",
              color: activeTab === "booked" ? T.fg : T.muted,
              boxShadow:
                activeTab === "booked" ? "0 2px 6px rgba(0,0,0,0.04)" : "none",
              transition: "all 0.15s ease",
            }}
          >
            Booked ({bookedOrders.length})
          </button>
        </div>

        {/* Render Drafts Tab */}
        {activeTab === "drafts" && (
          <div>
            {/* Draft section header with bulk actions */}
            {draftOrders.length > 0 && (
              <div
                className="bns-orders-draft-bar"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                  background: T.card,
                  border: `1px solid ${T.border}`,
                  borderRadius: "8px",
                  padding: "10px 16px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ position: "relative" }}>
                    <div
                      onClick={() => setBulkSelectOpen((prev) => !prev)}
                      style={{
                        border: `1px solid ${T.border}`,
                        borderRadius: 10,
                        padding: "7px 32px 7px 12px",
                        fontSize: "0.82rem",
                        color: T.fg,
                        background: T.bg,
                        cursor: "pointer",
                        userSelect: "none",
                        whiteSpace: "nowrap",
                        position: "relative",
                      }}
                    >
                      {bulkSelectLabel}
                      <ChevronDown
                        size={13}
                        style={{
                          position: "absolute",
                          right: 10,
                          top: "50%",
                          transform: bulkSelectOpen
                            ? "rotate(180deg) translateY(50%)"
                            : "translateY(-50%)",
                          color: T.muted,
                          transition: "transform 0.2s",
                        }}
                      />
                    </div>
                    {bulkSelectOpen && (
                      <div
                        className="bns-dropdown"
                        style={{
                          position: "absolute",
                          zIndex: 999,
                          top: "100%",
                          left: 0,
                          minWidth: 180,
                          background: "#fff",
                          border: `1px solid ${T.border}`,
                          borderRadius: 10,
                          boxShadow: "0 8px 28px rgba(0,0,0,0.1)",
                          marginTop: 4,
                          padding: 4,
                        }}
                      >
                        {["all", "none", "valid"].map((val) => (
                          <div
                            key={val}
                            onClick={() => {
                              handleBulkSelectDraft(val as any);
                              setBulkSelectLabel(
                                val === "all"
                                  ? "Select All"
                                  : val === "none"
                                    ? "Select None"
                                    : "Select Valid Only",
                              );
                              setBulkSelectOpen(false);
                            }}
                            style={{
                              padding: "9px 12px",
                              fontSize: "0.82rem",
                              cursor: "pointer",
                              color: T.fg,
                              borderRadius: 6,
                              transition: "background 0.1s ease",
                            }}
                            onMouseEnter={(e) =>
                              (e.currentTarget.style.background = T.accentLight)
                            }
                            onMouseLeave={(e) =>
                              (e.currentTarget.style.background = "transparent")
                            }
                          >
                            {val === "all"
                              ? "Select All"
                              : val === "none"
                                ? "Select None"
                                : "Select Valid Only"}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleSyncCities}
                    disabled={syncingCities}
                    style={{
                      border: `1px solid ${T.border}`,
                      background: T.bg,
                      color: T.fg,
                      borderRadius: "6px",
                      padding: "5px 12px",
                      fontSize: "0.8rem",
                      cursor: syncingCities ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {syncingCities ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Sparkles size={13} />
                    )}
                    Sync Cities
                  </button>

                  <button
                    onClick={handleSyncCompanies}
                    disabled={syncingCompanies}
                    style={{
                      border: `1px solid ${T.border}`,
                      background: T.bg,
                      color: T.fg,
                      borderRadius: "6px",
                      padding: "5px 12px",
                      fontSize: "0.8rem",
                      cursor: syncingCompanies ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {syncingCompanies ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Sparkles size={13} />
                    )}
                    Sync Companies
                  </button>

                  {selectedDrafts.size > 0 && (
                    <button
                      onClick={handleDeleteSelectedDrafts}
                      disabled={deleting}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "#dc2626",
                        cursor: "pointer",
                        fontSize: "0.8rem",
                        fontWeight: 500,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Trash2 size={13} /> Delete Selected (
                      {selectedDrafts.size})
                    </button>
                  )}
                </div>

                <motion.button
                  onClick={handleBookSelected}
                  disabled={selectedDrafts.size === 0 || booking}
                  whileHover={{
                    scale: selectedDrafts.size === 0 || booking ? 1 : 1.02,
                  }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background:
                      selectedDrafts.size === 0 || booking
                        ? "#e5e5e5"
                        : T.accent,
                    color:
                      selectedDrafts.size === 0 || booking ? T.muted : "#fff",
                    border: "none",
                    borderRadius: 8,
                    padding: "8px 18px",
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    cursor:
                      selectedDrafts.size === 0 || booking
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {booking ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <PackageCheck size={13} />
                  )}
                  {booking ? "Booking..." : `Book Now (${selectedDrafts.size})`}
                </motion.button>
              </div>
            )}

            {/* Draft cards list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <AnimatePresence>
                {draftOrders.map((order, i) => {
                  const isInvalidPhone = isPhoneInvalid(order.phoneNumber);
                  const isExpanded = expandedDrafts.has(order.id);
                  const validationError = validationErrors.has(order.id);

                  return (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{
                        opacity: 0,
                        height: 0,
                        overflow: "hidden",
                        marginBottom: 0,
                      }}
                      transition={{
                        duration: 0.35,
                        delay: i * 0.05,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      style={{
                        background: T.bg,
                        border: `1px solid ${validationError ? "#dc2626" : selectedDrafts.has(order.id) ? T.accent : T.border}`,
                        borderRadius: 12,
                        padding: "16px 20px",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.01)",
                      }}
                    >
                      {/* Collapsed view header */}
                      <div
                        className="bns-orders-draft-header"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            flex: 1,
                            cursor: "pointer",
                          }}
                          onClick={() => toggleExpand(order.id)}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectDraft(order.id);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              padding: 0,
                              display: "flex",
                              color: selectedDrafts.has(order.id)
                                ? T.accent
                                : "#d4d4d4",
                            }}
                          >
                            {selectedDrafts.has(order.id) ? (
                              <CheckSquare size={17} />
                            ) : (
                              <Square size={17} />
                            )}
                          </button>

                          <span
                            style={{
                              fontSize: "0.9rem",
                              fontWeight: 600,
                              color: T.fg,
                            }}
                          >
                            {order.customerName || "No Name"}
                          </span>

                          <span
                            style={{
                              fontSize: "0.82rem",
                              color: isInvalidPhone ? "#dc2626" : T.muted,
                              fontWeight: isInvalidPhone ? 600 : 400,
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            {order.phoneNumber || "No Number"}
                            {isInvalidPhone && (
                              <span
                                style={{
                                  background: "#fef2f2",
                                  border: "1px solid #fecaca",
                                  color: "#dc2626",
                                  fontSize: "0.62rem",
                                  fontWeight: 700,
                                  padding: "1px 6px",
                                  borderRadius: 4,
                                }}
                              >
                                Invalid Number
                              </span>
                            )}
                          </span>

                          <span style={{ fontSize: "0.82rem", color: T.muted }}>
                            {order.city || "No City"}
                          </span>
                        </div>

                        <button
                          onClick={() => toggleExpand(order.id)}
                          style={{
                            border: "none",
                            background: "none",
                            color: T.muted,
                            cursor: "pointer",
                          }}
                        >
                          {isExpanded ? (
                            <ChevronUp size={16} />
                          ) : (
                            <ChevronDown size={16} />
                          )}
                        </button>
                      </div>

                      {/* Expanded form details */}
                      {isExpanded && (
                        <div
                          style={{
                            marginTop: 20,
                            paddingTop: 16,
                            borderTop: `1px solid ${T.border}`,
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(220px, 1fr))",
                            gap: 14,
                          }}
                        >
                          {/* Text Inputs */}
                          {(() => {
                            const fe = fieldErrors[order.id];
                            const errBorder = (f: string) =>
                              fe?.has(f) ? "#dc2626" : T.border;
                            const isCityOpen = !!cityDropdownOpen[order.id];
                            const cityQuery = (order.city || "").toLowerCase();
                            const filteredCities = isCityOpen
                              ? dbCities
                                  .filter(
                                    (c) =>
                                      !cityQuery ||
                                      c.name.toLowerCase().includes(cityQuery),
                                  )
                                  .slice(0, 100)
                              : [];
                            return (
                              <>
                                <div>
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      color: fe?.has("customerName")
                                        ? "#dc2626"
                                        : T.muted,
                                      fontWeight: 500,
                                      display: "block",
                                      marginBottom: 4,
                                    }}
                                  >
                                    Customer Name
                                    {fe?.has("customerName") ? " *" : ""}
                                  </span>
                                  <input
                                    type="text"
                                    autoComplete="name"
                                    ref={(el) => {
                                      fieldRefs.current[
                                        `${order.id}-customerName`
                                      ] = el;
                                    }}
                                    value={order.customerName || ""}
                                    onChange={(e) => {
                                      editLocal(
                                        order.id,
                                        "customerName",
                                        e.target.value,
                                      );
                                    }}
                                    onBlur={(e) =>
                                      saveField(
                                        order.id,
                                        "customerName",
                                        e.target.value,
                                      )
                                    }
                                    style={{
                                      width: "100%",
                                      border: `1px solid ${errBorder("customerName")}`,
                                      borderRadius: 8,
                                      padding: "7px 10px",
                                      fontSize: "0.85rem",
                                      color: T.fg,
                                      outline: "none",
                                      boxSizing: "border-box",
                                    }}
                                  />
                                </div>

                                <div>
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      color: fe?.has("phoneNumber")
                                        ? "#dc2626"
                                        : T.muted,
                                      fontWeight: 500,
                                      display: "block",
                                      marginBottom: 4,
                                    }}
                                  >
                                    Phone Number
                                    {fe?.has("phoneNumber") ? " *" : ""}
                                  </span>
                                  <input
                                    type="text"
                                    inputMode="tel"
                                    autoComplete="tel"
                                    ref={(el) => {
                                      fieldRefs.current[
                                        `${order.id}-phoneNumber`
                                      ] = el;
                                    }}
                                    value={order.phoneNumber || ""}
                                    onChange={(e) => {
                                      const selStart =
                                        e.target.selectionStart ??
                                        e.target.value.length;
                                      const { normalized, cursorAdjust } =
                                        normalizePakistaniPhone(
                                          e.target.value,
                                          selStart,
                                        );
                                      editLocal(
                                        order.id,
                                        "phoneNumber",
                                        normalized,
                                      );
                                      requestAnimationFrame(() => {
                                        const el =
                                          fieldRefs.current[
                                            `${order.id}-phoneNumber`
                                          ];
                                        if (el && "setSelectionRange" in el) {
                                          const pos = Math.max(
                                            0,
                                            selStart + cursorAdjust,
                                          );
                                          (
                                            el as HTMLInputElement
                                          ).setSelectionRange(pos, pos);
                                        }
                                      });
                                    }}
                                    onBlur={(e) => {
                                      const norm = normalizePakistaniPhoneOnBlur(e.target.value);
                                      editLocal(order.id, "phoneNumber", norm);
                                      saveField(order.id, "phoneNumber", norm);
                                    }}
                                    style={{
                                      width: "100%",
                                      border: `1px solid ${isInvalidPhone || fe?.has("phoneNumber") ? "#dc2626" : T.border}`,
                                      borderRadius: 8,
                                      padding: "7px 10px",
                                      fontSize: "0.85rem",
                                      color: isInvalidPhone ? "#dc2626" : T.fg,
                                      outline: "none",
                                      boxSizing: "border-box",
                                    }}
                                  />
                                </div>

                                <div style={{ position: "relative" }}>
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      color: fe?.has("city")
                                        ? "#dc2626"
                                        : T.muted,
                                      fontWeight: 500,
                                      display: "block",
                                      marginBottom: 4,
                                    }}
                                  >
                                    City{fe?.has("city") ? " *" : ""}
                                  </span>
                                  <input
                                    type="text"
                                    ref={(el) => {
                                      fieldRefs.current[`${order.id}-city`] =
                                        el;
                                    }}
                                    value={order.city || ""}
                                    autoComplete="off"
                                    onChange={(e) => {
                                      editLocal(
                                        order.id,
                                        "city",
                                        e.target.value,
                                      );
                                      setCityDropdownOpen((prev) => ({
                                        ...prev,
                                        [order.id]: true,
                                      }));
                                      setActiveCityIndex((prev) => ({
                                        ...prev,
                                        [order.id]: 0,
                                      }));
                                    }}
                                    onFocus={() => {
                                      setCityDropdownOpen((prev) => ({
                                        ...prev,
                                        [order.id]: true,
                                      }));
                                      setActiveCityIndex((prev) => ({
                                        ...prev,
                                        [order.id]: 0,
                                      }));
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "ArrowDown") {
                                        e.preventDefault();
                                        setActiveCityIndex((prev) => ({
                                          ...prev,
                                          [order.id]: Math.min(
                                            (prev[order.id] || 0) + 1,
                                            filteredCities.length - 1,
                                          ),
                                        }));
                                      } else if (e.key === "ArrowUp") {
                                        e.preventDefault();
                                        setActiveCityIndex((prev) => ({
                                          ...prev,
                                          [order.id]: Math.max(
                                            (prev[order.id] || 0) - 1,
                                            0,
                                          ),
                                        }));
                                      } else if (e.key === "Enter") {
                                        e.preventDefault();
                                        const idx =
                                          activeCityIndex[order.id] || 0;
                                        if (filteredCities[idx]) {
                                          editLocal(
                                            order.id,
                                            "city",
                                            filteredCities[idx].name,
                                          );
                                          setCityDropdownOpen((prev) => ({
                                            ...prev,
                                            [order.id]: false,
                                          }));
                                          saveField(
                                            order.id,
                                            "city",
                                            filteredCities[idx].name,
                                          );
                                          fetchRateEstimate(
                                            order.id,
                                            parseFloat(order.weight || "0") ||
                                              0,
                                            filteredCities[idx].name,
                                            selectedCourier[order.id],
                                          );
                                        }
                                      } else if (e.key === "Escape") {
                                        setCityDropdownOpen((prev) => ({
                                          ...prev,
                                          [order.id]: false,
                                        }));
                                      }
                                    }}
                                    onBlur={(e) => {
                                      setTimeout(() => {
                                        setCityDropdownOpen((prev) => ({
                                          ...prev,
                                          [order.id]: false,
                                        }));
                                        const cityClean = e.target.value
                                          .trim()
                                          .toLowerCase();
                                        if (!cityClean) {
                                          editLocal(order.id, "city", "");
                                          saveField(order.id, "city", "");
                                          return;
                                        }
                                        // Only validate against list if dbCities is loaded
                                        if (dbCities.length > 0) {
                                          const exists = dbCities.find(
                                            (c) =>
                                              c.name.toLowerCase() ===
                                              cityClean,
                                          );
                                          if (!exists) {
                                            editLocal(order.id, "city", "");
                                            saveField(order.id, "city", "");
                                          } else {
                                            editLocal(
                                              order.id,
                                              "city",
                                              exists.name,
                                            );
                                            saveField(
                                              order.id,
                                              "city",
                                              exists.name,
                                            );
                                            fetchRateEstimate(
                                              order.id,
                                              parseFloat(order.weight || "0") ||
                                                0,
                                              exists.name,
                                              selectedCourier[order.id],
                                            );
                                          }
                                        } else {
                                          // Fallback: save what they typed so it isn't erased if sync hasn't run yet
                                          saveField(
                                            order.id,
                                            "city",
                                            e.target.value.trim(),
                                          );
                                        }
                                      }, 220);
                                    }}
                                    placeholder={
                                      dbCities.length === 0
                                        ? "No operational cities synced yet."
                                        : "Select operational city..."
                                    }
                                    style={{
                                      width: "100%",
                                      border: `1px solid ${errBorder("city")}`,
                                      borderRadius: 8,
                                      padding: "7px 10px",
                                      fontSize: "0.85rem",
                                      color: T.fg,
                                      outline: "none",
                                      boxSizing: "border-box",
                                    }}
                                  />
                                  {cityDropdownOpen[order.id] && (
                                    <div
                                      className="bns-dropdown"
                                      style={{
                                        position: "absolute",
                                        zIndex: 999,
                                        top: "100%",
                                        left: 0,
                                        right: 0,
                                        minWidth: 240,
                                        background: "#fff",
                                        border: `1px solid ${T.border}`,
                                        borderRadius: 10,
                                        boxShadow: "0 8px 28px rgba(0,0,0,0.1)",
                                        maxHeight: 220,
                                        overflowY: "auto",
                                        marginTop: 4,
                                        padding: 4,
                                      }}
                                    >
                                      {filteredCities.length > 0 ? (
                                        filteredCities.map((c, idx) => {
                                          const isActive =
                                            (activeCityIndex[order.id] || 0) ===
                                            idx;
                                          return (
                                            <div
                                              key={c.id}
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                              }}
                                              onClick={() => {
                                                editLocal(
                                                  order.id,
                                                  "city",
                                                  c.name,
                                                );
                                                setCityDropdownOpen((prev) => ({
                                                  ...prev,
                                                  [order.id]: false,
                                                }));
                                                saveField(
                                                  order.id,
                                                  "city",
                                                  c.name,
                                                );
                                                fetchRateEstimate(
                                                  order.id,
                                                  parseFloat(
                                                    order.weight || "0",
                                                  ) || 0,
                                                  c.name,
                                                  selectedCourier[order.id],
                                                );
                                              }}
                                              style={{
                                                padding: "9px 12px",
                                                fontSize: "0.82rem",
                                                cursor: "pointer",
                                                color: T.fg,
                                                background: isActive
                                                  ? T.accentLight
                                                  : "transparent",
                                                borderRadius: 6,
                                                transition:
                                                  "background 0.1s ease",
                                              }}
                                              onMouseEnter={(e) => {
                                                setActiveCityIndex((prev) => ({
                                                  ...prev,
                                                  [order.id]: idx,
                                                }));
                                              }}
                                            >
                                              {c.name}
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <div
                                          style={{
                                            padding: "10px 12px",
                                            fontSize: "0.8rem",
                                            color: "#dc2626",
                                            background: "#fef2f2",
                                            textAlign: "center",
                                          }}
                                        >
                                          No operational Flaship city found.
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </>
                            );
                          })()}

                          <div>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                color: T.muted,
                                fontWeight: 500,
                                display: "block",
                                marginBottom: 4,
                              }}
                            >
                              Quantity
                            </span>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={order.quantity || 1}
                              onChange={(e) =>
                                editLocal(order.id, "quantity", e.target.value)
                              }
                              onBlur={(e) =>
                                saveField(
                                  order.id,
                                  "quantity",
                                  parseInt(e.target.value) || 1,
                                )
                              }
                              style={{
                                width: "100%",
                                border: `1px solid ${T.border}`,
                                borderRadius: 8,
                                padding: "7px 10px",
                                fontSize: "0.85rem",
                                color: T.fg,
                                outline: "none",
                              }}
                            />
                          </div>

                          <div style={{ gridColumn: "1 / -1" }}>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                color: fieldErrors[order.id]?.has("address")
                                  ? "#dc2626"
                                  : T.muted,
                                fontWeight: 500,
                                display: "block",
                                marginBottom: 4,
                              }}
                            >
                              Address
                              {fieldErrors[order.id]?.has("address")
                                ? " *"
                                : ""}
                            </span>
                            <input
                              type="text"
                              ref={(el) => {
                                fieldRefs.current[`${order.id}-address`] = el;
                              }}
                              value={order.address || ""}
                              onChange={(e) =>
                                editLocal(order.id, "address", e.target.value)
                              }
                              onBlur={(e) =>
                                saveField(order.id, "address", e.target.value)
                              }
                              style={{
                                width: "100%",
                                border: `1px solid ${fieldErrors[order.id]?.has("address") ? "#dc2626" : T.border}`,
                                borderRadius: 8,
                                padding: "7px 10px",
                                fontSize: "0.85rem",
                                color: T.fg,
                                outline: "none",
                                boxSizing: "border-box",
                              }}
                            />
                          </div>

                          {/* Multi-product selector (inventory holders) or Product Info (resellers) */}
                          <div style={{ gridColumn: "1 / -1" }}>
                            {profile?.accountType === "reseller" ? (
                              <>
                                <span
                                  style={{
                                    fontSize: "0.7rem",
                                    color: T.muted,
                                    fontWeight: 500,
                                    display: "block",
                                    marginBottom: 4,
                                  }}
                                >
                                  Product Details (optional)
                                </span>
                                <input
                                  type="text"
                                  value={order.productInfo ?? ""}
                                  onChange={(e) =>
                                    editLocal(order.id, "productInfo", e.target.value)
                                  }
                                  onBlur={(e) =>
                                    saveField(order.id, "productInfo", e.target.value)
                                  }
                                  style={{
                                    width: "100%",
                                    border: `1px solid ${T.border}`,
                                    borderRadius: 8,
                                    padding: "7px 10px",
                                    fontSize: "0.85rem",
                                    color: T.fg,
                                    outline: "none",
                                    boxSizing: "border-box",
                                  }}
                                  placeholder="e.g. iPhone 14 Pro Max — 256GB — Gold"
                                />
                              </>
                            ) : (() => {
                              if (products.length === 0) {
                                return (
                                  <div style={{
                                    border: '1px solid #fecaca',
                                    background: '#fef2f2',
                                    borderRadius: 8,
                                    padding: '12px 14px',
                                    fontSize: '0.85rem',
                                    color: '#b91c1c',
                                    fontWeight: 500,
                                  }}>
                                    ⚠ No inventory found.{' '}
                                    <a href="/products" style={{ color: '#CC785C', textDecoration: 'underline' }}>
                                      Add products to your inventory
                                    </a>{' '}
                                    first, or switch to a Reseller account type.
                                  </div>
                                );
                              }
                              const items = orderItemsMap[order.id] || [];
                              const isOpen = !!productDropdownOpen[order.id];
                              const searchTerm = (
                                productSearch[order.id] ?? ""
                              ).toLowerCase();
                              const allOptions = [
                                ...products
                                  .filter(
                                    (p) =>
                                      !searchTerm ||
                                      p.name.toLowerCase().includes(searchTerm),
                                  )
                                  .slice(0, 50)
                                  .map((p) => ({
                                    id: p.id,
                                    name: p.name,
                                    weight: p.weight,
                                    stock: p.stockQuantity,
                                  })),
                                {
                                  id: "__no_inventory__",
                                  name: "📦 Book Without Inventory",
                                  weight: "",
                                  stock: 0,
                                },
                              ];
                              const filteredOptions = isOpen
                                ? allOptions.filter(
                                    (o) =>
                                      !searchTerm ||
                                      o.name.toLowerCase().includes(searchTerm),
                                  )
                                : [];

                              return (
                                <div>
                                  {/* Product list table */}
                                  {items.length > 0 && (
                                    <div
                                      style={{
                                        marginBottom: 10,
                                        overflowX: "auto",
                                      }}
                                    >
                                      <table
                                        style={{
                                          width: "100%",
                                          borderCollapse: "collapse",
                                          fontSize: "0.78rem",
                                          minWidth: 520,
                                        }}
                                      >
                                        <thead>
                                          <tr
                                            style={{
                                              borderBottom: `1px solid ${T.border}`,
                                            }}
                                          >
                                            <th
                                              style={{
                                                padding: "5px 8px",
                                                textAlign: "left",
                                                fontWeight: 600,
                                                color: T.muted,
                                                fontSize: "0.7rem",
                                              }}
                                            >
                                              Product
                                            </th>
                                            <th
                                              style={{
                                                padding: "5px 8px",
                                                textAlign: "center",
                                                fontWeight: 600,
                                                color: T.muted,
                                                fontSize: "0.7rem",
                                              }}
                                            >
                                              Qty
                                            </th>
                                            <th
                                              style={{
                                                padding: "5px 8px",
                                                textAlign: "right",
                                                fontWeight: 600,
                                                color: T.muted,
                                                fontSize: "0.7rem",
                                              }}
                                            >
                                              Cost Price
                                            </th>
                                            <th
                                              style={{
                                                padding: "5px 8px",
                                                textAlign: "right",
                                                fontWeight: 600,
                                                color: T.muted,
                                                fontSize: "0.7rem",
                                              }}
                                            >
                                              Sale Amount
                                            </th>
                                            <th
                                              style={{
                                                padding: "5px 8px",
                                                textAlign: "right",
                                                fontWeight: 600,
                                                color: T.muted,
                                                fontSize: "0.7rem",
                                              }}
                                            >
                                              Line Profit
                                            </th>
                                            <th
                                              style={{
                                                padding: "5px 8px",
                                                width: 30,
                                              }}
                                            ></th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {items.map((item, ii) => {
                                            const ip =
                                              item.costPrice && item.saleAmount
                                                ? Number(item.saleAmount) -
                                                  Number(item.costPrice)
                                                : null;
                                            return (
                                              <tr
                                                key={item.id}
                                                style={{
                                                  borderBottom: `1px solid #f0f0f0`,
                                                }}
                                              >
                                                <td
                                                  style={{
                                                    padding: "5px 8px",
                                                    fontWeight: 500,
                                                    color: T.fg,
                                                  }}
                                                >
                                                  {item.productName ||
                                                    products.find(
                                                      (p) =>
                                                        p.id === item.productId,
                                                    )?.name ||
                                                    "—"}
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "5px 8px",
                                                    textAlign: "center",
                                                  }}
                                                >
                                                  <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => {
                                                      const qty =
                                                        parseInt(
                                                          e.target.value,
                                                        ) || 1;
                                                      setOrderItemsMap(
                                                        (prev) => ({
                                                          ...prev,
                                                          [order.id]:
                                                            prev[order.id]?.map(
                                                              (oi, oii) =>
                                                                oii === ii
                                                                  ? {
                                                                      ...oi,
                                                                      quantity:
                                                                        qty,
                                                                    }
                                                                  : oi,
                                                            ) || [],
                                                        }),
                                                      );
                                                    }}
                                                    onBlur={() => {
                                                      const its =
                                                        orderItemsMap[
                                                          order.id
                                                        ] || [];
                                                      saveFieldsBatch(
                                                        order.id,
                                                        { orderItems: its },
                                                      );
                                                    }}
                                                    style={{
                                                      width: 40,
                                                      border: `1px solid ${T.border}`,
                                                      borderRadius: 4,
                                                      padding: "2px 4px",
                                                      fontSize: "0.78rem",
                                                      textAlign: "center",
                                                    }}
                                                  />
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "5px 8px",
                                                    textAlign: "right",
                                                  }}
                                                >
                                                  {item.productId ? (
                                                    <span style={{ fontSize: "0.78rem", color: T.muted }}>
                                                      Rs {Number(item.costPrice || 0).toFixed(0)}
                                                    </span>
                                                  ) : (
                                                    <input
                                                      type="number"
                                                      inputMode="decimal"
                                                      value={item.costPrice ?? ""}
                                                      onChange={(e) => {
                                                        const cp = e.target.value;
                                                        setOrderItemsMap(
                                                          (prev) => ({
                                                            ...prev,
                                                            [order.id]:
                                                              prev[order.id]?.map(
                                                                (oi, oii) =>
                                                                  oii === ii
                                                                    ? {
                                                                        ...oi,
                                                                        costPrice:
                                                                          cp ||
                                                                          null,
                                                                      }
                                                                    : oi,
                                                              ) || [],
                                                          }),
                                                        );
                                                      }}
                                                      onBlur={() => {
                                                        const its =
                                                          orderItemsMap[
                                                            order.id
                                                          ] || [];
                                                        saveFieldsBatch(
                                                          order.id,
                                                          { orderItems: its },
                                                        );
                                                      }}
                                                      style={{
                                                        width: 70,
                                                        border: `1px solid ${T.border}`,
                                                        borderRadius: 4,
                                                        padding: "2px 4px",
                                                        fontSize: "0.78rem",
                                                        textAlign: "right",
                                                      }}
                                                    />
                                                  )}
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "5px 8px",
                                                    textAlign: "right",
                                                  }}
                                                >
                                                  <input
                                                    type="number"
                                                    inputMode="decimal"
                                                    value={
                                                      item.saleAmount ?? ""
                                                    }
                                                    onChange={(e) => {
                                                      const sa = e.target.value;
                                                      setOrderItemsMap(
                                                        (prev) => ({
                                                          ...prev,
                                                          [order.id]:
                                                            prev[order.id]?.map(
                                                              (oi, oii) =>
                                                                oii === ii
                                                                  ? {
                                                                      ...oi,
                                                                      saleAmount:
                                                                        sa ||
                                                                        null,
                                                                    }
                                                                  : oi,
                                                            ) || [],
                                                        }),
                                                      );
                                                    }}
                                                    onBlur={() => {
                                                      const its =
                                                        orderItemsMap[
                                                          order.id
                                                        ] || [];
                                                      saveFieldsBatch(
                                                        order.id,
                                                        { orderItems: its },
                                                      );
                                                    }}
                                                    style={{
                                                      width: 70,
                                                      border: `1px solid ${T.border}`,
                                                      borderRadius: 4,
                                                      padding: "2px 4px",
                                                      fontSize: "0.78rem",
                                                      textAlign: "right",
                                                    }}
                                                  />
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "5px 8px",
                                                    textAlign: "right",
                                                    fontWeight: 600,
                                                    color:
                                                      ip && ip > 0
                                                        ? "#16a34a"
                                                        : T.muted,
                                                  }}
                                                >
                                                  {ip != null
                                                    ? `Rs ${ip.toFixed(0)}`
                                                    : "—"}
                                                </td>
                                                <td
                                                  style={{
                                                    padding: "5px 8px",
                                                    textAlign: "center",
                                                  }}
                                                >
                                                  <button
                                                    onClick={() => {
                                                      setOrderItemsMap(
                                                        (prev) => ({
                                                          ...prev,
                                                          [order.id]:
                                                            prev[
                                                              order.id
                                                            ]?.filter(
                                                              (_, oii) =>
                                                                oii !== ii,
                                                            ) || [],
                                                        }),
                                                      );
                                                    }}
                                                    style={{
                                                      background: "none",
                                                      border: "none",
                                                      color: "#dc2626",
                                                      cursor: "pointer",
                                                      padding: 2,
                                                    }}
                                                  >
                                                    <X size={12} />
                                                  </button>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}

                                  {/* Totals */}
                                  {items.length > 0 &&
                                    (() => {
                                      const totalCost = items.reduce(
                                        (s, i) =>
                                          s +
                                          Number(i.costPrice || 0) * i.quantity,
                                        0,
                                      );
                                      const totalSale = items.reduce(
                                        (s, i) =>
                                          s +
                                          Number(i.saleAmount || 0) *
                                            i.quantity,
                                        0,
                                      );
                                      const hasAllCost = items.every(
                                        (i) =>
                                          i.costPrice &&
                                          Number(i.costPrice) > 0,
                                      );
                                      const totalProfit = hasAllCost
                                        ? totalSale - totalCost
                                        : null;
                                      return (
                                        <div
                                          style={{
                                            display: "flex",
                                            gap: 16,
                                            justifyContent: "flex-end",
                                            padding: "6px 8px",
                                            background: T.card,
                                            borderRadius: 6,
                                            marginBottom: 8,
                                            fontSize: "0.78rem",
                                            fontWeight: 600,
                                          }}
                                        >
                                          <span>
                                            Total Cost:{" "}
                                            <span style={{ color: T.muted }}>
                                              Rs {totalCost.toFixed(0)}
                                            </span>
                                          </span>
                                          <span>
                                            Total Sale:{" "}
                                            <span style={{ color: T.fg }}>
                                              Rs {totalSale.toFixed(0)}
                                            </span>
                                          </span>
                                          <span>
                                            Total Profit:{" "}
                                            <span
                                              style={{
                                                color:
                                                  totalProfit && totalProfit > 0
                                                    ? "#16a34a"
                                                    : "#d97706",
                                              }}
                                            >
                                              {totalProfit != null
                                                ? `Rs ${totalProfit.toFixed(0)}`
                                                : "Pending Cost Price"}
                                            </span>
                                          </span>
                                        </div>
                                      );
                                    })()}

                                  {/* Product search + Add button */}
                                  <div
                                    style={{
                                      display: "flex",
                                      gap: 8,
                                      alignItems: "center",
                                    }}
                                  >
                                    <div
                                      style={{ position: "relative", flex: 1 }}
                                    >
                                      <input
                                        type="text"
                                        value={
                                          isOpen
                                            ? (productSearch[order.id] ?? "")
                                            : ""
                                        }
                                        autoComplete="off"
                                        placeholder="— Add product or Book Without Inventory —"
                                        onChange={(e) => {
                                          setProductSearch((prev) => ({
                                            ...prev,
                                            [order.id]: e.target.value,
                                          }));
                                          setProductDropdownOpen((prev) => ({
                                            ...prev,
                                            [order.id]: true,
                                          }));
                                          setActiveProductIndex((prev) => ({
                                            ...prev,
                                            [order.id]: 0,
                                          }));
                                        }}
                                        onFocus={() => {
                                          setProductSearch((prev) => ({
                                            ...prev,
                                            [order.id]: "",
                                          }));
                                          setProductDropdownOpen((prev) => ({
                                            ...prev,
                                            [order.id]: true,
                                          }));
                                          setActiveProductIndex((prev) => ({
                                            ...prev,
                                            [order.id]: 0,
                                          }));
                                        }}
                                        onBlur={() => {
                                          setTimeout(
                                            () =>
                                              setProductDropdownOpen(
                                                (prev) => ({
                                                  ...prev,
                                                  [order.id]: false,
                                                }),
                                              ),
                                            220,
                                          );
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === "ArrowDown") {
                                            e.preventDefault();
                                            setActiveProductIndex((prev) => ({
                                              ...prev,
                                              [order.id]: Math.min(
                                                (prev[order.id] || 0) + 1,
                                                filteredOptions.length - 1,
                                              ),
                                            }));
                                          } else if (e.key === "ArrowUp") {
                                            e.preventDefault();
                                            setActiveProductIndex((prev) => ({
                                              ...prev,
                                              [order.id]: Math.max(
                                                (prev[order.id] || 0) - 1,
                                                0,
                                              ),
                                            }));
                                          } else if (e.key === "Enter") {
                                            e.preventDefault();
                                            const idx =
                                              activeProductIndex[order.id] || 0;
                                            if (filteredOptions[idx]) {
                                              addOrderItem(
                                                order.id,
                                                filteredOptions[idx].id,
                                                filteredOptions[idx].name,
                                              );
                                              setProductSearch((prev) => ({
                                                ...prev,
                                                [order.id]: "",
                                              }));
                                              setProductDropdownOpen(
                                                (prev) => ({
                                                  ...prev,
                                                  [order.id]: false,
                                                }),
                                              );
                                            }
                                          } else if (e.key === "Escape") {
                                            setProductDropdownOpen((prev) => ({
                                              ...prev,
                                              [order.id]: false,
                                            }));
                                          }
                                        }}
                                        style={{
                                          width: "100%",
                                          border: `1px solid ${T.border}`,
                                          borderRadius: 10,
                                          padding: "9px 12px",
                                          fontSize: "0.82rem",
                                          color: T.fg,
                                          background: T.bg,
                                          outline: "none",
                                          boxSizing: "border-box",
                                        }}
                                      />
                                      {isOpen && (
                                        <div
                                          className="bns-dropdown"
                                          style={{
                                            position: "absolute",
                                            zIndex: 999,
                                            top: "100%",
                                            left: 0,
                                            right: 0,
                                            background: "#fff",
                                            border: `1px solid ${T.border}`,
                                            borderRadius: 10,
                                            boxShadow:
                                              "0 8px 28px rgba(0,0,0,0.1)",
                                            maxHeight: 220,
                                            overflowY: "auto",
                                            marginTop: 4,
                                            padding: 4,
                                          }}
                                        >
                                          {filteredOptions.length > 0 ? (
                                            filteredOptions.map((opt, idx) => {
                                              const isActive =
                                                (activeProductIndex[order.id] ||
                                                  0) === idx;
                                              const isNoInv =
                                                opt.id === "__no_inventory__";
                                              return (
                                                <div
                                                  key={opt.id}
                                                  onMouseDown={(e) => {
                                                    e.preventDefault();
                                                  }}
                                                  onClick={() => {
                                                    addOrderItem(
                                                      order.id,
                                                      opt.id,
                                                      opt.name,
                                                    );
                                                    setProductSearch(
                                                      (prev) => ({
                                                        ...prev,
                                                        [order.id]: "",
                                                      }),
                                                    );
                                                    setProductDropdownOpen(
                                                      (prev) => ({
                                                        ...prev,
                                                        [order.id]: false,
                                                      }),
                                                    );
                                                  }}
                                                  onMouseEnter={() =>
                                                    setActiveProductIndex(
                                                      (prev) => ({
                                                        ...prev,
                                                        [order.id]: idx,
                                                      }),
                                                    )
                                                  }
                                                  style={{
                                                    padding: "9px 12px",
                                                    fontSize: "0.82rem",
                                                    cursor: "pointer",
                                                    color: T.fg,
                                                    background: isActive
                                                      ? T.accentLight
                                                      : "transparent",
                                                    borderRadius: 6,
                                                    display: "flex",
                                                    justifyContent:
                                                      "space-between",
                                                    alignItems: "center",
                                                    gap: 8,
                                                    borderBottom: isNoInv
                                                      ? `1px solid ${T.border}`
                                                      : "none",
                                                  }}
                                                >
                                                  <span>
                                                    {isNoInv ? (
                                                      opt.name
                                                    ) : (
                                                      <>
                                                        {opt.name} ·{" "}
                                                        <span
                                                          style={{
                                                            color: T.muted,
                                                          }}
                                                        >
                                                          stock: {opt.stock}
                                                        </span>
                                                      </>
                                                    )}
                                                  </span>
                                                  {!isNoInv && (
                                                    <span
                                                      style={{
                                                        fontSize: "0.75rem",
                                                        color: T.muted,
                                                      }}
                                                    >
                                                      {opt.weight} kg
                                                    </span>
                                                  )}
                                                </div>
                                              );
                                            })
                                          ) : (
                                            <div
                                              style={{
                                                padding: "9px 12px",
                                                fontSize: "0.82rem",
                                                color: T.muted,
                                              }}
                                            >
                                              No product found
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {items.length > 0 && (
                                      <button
                                        onClick={() => {
                                          setProductDropdownOpen((prev) => ({
                                            ...prev,
                                            [order.id]: true,
                                          }));
                                          setProductSearch((prev) => ({
                                            ...prev,
                                            [order.id]: "",
                                          }));
                                        }}
                                        style={{
                                          border: `1px solid ${T.border}`,
                                          background: T.bg,
                                          borderRadius: 8,
                                          padding: "9px 12px",
                                          fontSize: "0.78rem",
                                          color: T.accent,
                                          fontWeight: 600,
                                          cursor: "pointer",
                                          whiteSpace: "nowrap",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 4,
                                        }}
                                      >
                                        <Plus size={13} /> Add Product
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Pricing: COD + Sale Amount + Cost Price */}
                          <div>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                color: fieldErrors[order.id]?.has(
                                  "sellingPrice",
                                )
                                  ? "#dc2626"
                                  : T.muted,
                                fontWeight: 500,
                                display: "block",
                                marginBottom: 4,
                              }}
                            >
                              COD Amount (Rs)
                              {fieldErrors[order.id]?.has("sellingPrice")
                                ? " *"
                                : ""}
                            </span>
                            <input
                              type="number"
                              inputMode="decimal"
                              ref={(el) => {
                                fieldRefs.current[`${order.id}-sellingPrice`] =
                                  el;
                              }}
                              value={order.sellingPrice ?? ""}
                              onChange={(e) => {
                                editLocal(
                                  order.id,
                                  "sellingPrice",
                                  e.target.value,
                                );
                              }}
                              onBlur={(e) =>
                                saveFieldsBatch(order.id, {
                                  sellingPrice: parseFloat(e.target.value) || 0,
                                })
                              }
                              style={{
                                width: "100%",
                                border: `1px solid ${fieldErrors[order.id]?.has("sellingPrice") ? "#dc2626" : T.border}`,
                                borderRadius: 8,
                                padding: "7px 10px",
                                fontSize: "0.85rem",
                                color: T.fg,
                                outline: "none",
                                boxSizing: "border-box",
                              }}
                            />
                          </div>

                          <div>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                color: T.muted,
                                fontWeight: 500,
                                display: "block",
                                marginBottom: 4,
                              }}
                            >
                              Sale Amount (Rs)
                            </span>
                            {profile?.accountType === "reseller" ? (
                              <input
                                type="number"
                                inputMode="decimal"
                                value={order.saleAmount ?? ""}
                                onChange={(e) =>
                                  editLocal(order.id, "saleAmount", e.target.value)
                                }
                                onBlur={(e) =>
                                  saveFieldsBatch(order.id, {
                                    saleAmount: parseFloat(e.target.value) || 0,
                                  })
                                }
                                style={{
                                  width: "100%",
                                  border: `1px solid ${T.border}`,
                                  borderRadius: 8,
                                  padding: "7px 10px",
                                  fontSize: "0.85rem",
                                  color: T.fg,
                                  outline: "none",
                                  boxSizing: "border-box",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "100%",
                                  border: `1px solid ${T.border}`,
                                  borderRadius: 8,
                                  padding: "7px 10px",
                                  fontSize: "0.85rem",
                                  color: T.muted,
                                  background: T.card,
                                  boxSizing: "border-box",
                                  minHeight: 34,
                                }}
                              >
                                {order.saleAmount
                                  ? `Rs ${Number(order.saleAmount).toLocaleString("en-PK")}`
                                  : "—"}
                              </div>
                            )}
                          </div>

                          <div>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                color: T.muted,
                                fontWeight: 500,
                                display: "block",
                                marginBottom: 4,
                              }}
                            >
                              Cost Price (Rs)
                            </span>
                            {profile?.accountType === "reseller" ? (
                              <input
                                type="number"
                                inputMode="decimal"
                                value={order.costPrice ?? ""}
                                onChange={(e) =>
                                  editLocal(order.id, "costPrice", e.target.value)
                                }
                                onBlur={(e) =>
                                  saveFieldsBatch(order.id, {
                                    costPrice: parseFloat(e.target.value) || 0,
                                  })
                                }
                                style={{
                                  width: "100%",
                                  border: `1px solid ${T.border}`,
                                  borderRadius: 8,
                                  padding: "7px 10px",
                                  fontSize: "0.85rem",
                                  color: T.fg,
                                  outline: "none",
                                  boxSizing: "border-box",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "100%",
                                  border: `1px solid ${T.border}`,
                                  borderRadius: 8,
                                  padding: "7px 10px",
                                  fontSize: "0.85rem",
                                  color: T.muted,
                                  background: T.card,
                                  boxSizing: "border-box",
                                  minHeight: 34,
                                }}
                              >
                                {order.costPrice
                                  ? `Rs ${Number(order.costPrice).toLocaleString("en-PK")}`
                                  : "—"}
                              </div>
                            )}
                          </div>

                          {/* Weight & Shipping Type */}
                          <div>
                            <span
                              style={{
                                fontSize: "0.7rem",
                                color: fieldErrors[order.id]?.has("weight")
                                  ? "#dc2626"
                                  : T.muted,
                                fontWeight: 500,
                                display: "block",
                                marginBottom: 4,
                              }}
                            >
                              Weight (kg)
                              {fieldErrors[order.id]?.has("weight") ? " *" : ""}
                            </span>
                            {(() => {
                              const isReseller = profile?.accountType === "reseller";
                              const its = orderItemsMap[order.id] || [];
                              const allInventory = !isReseller && its.length > 0 && its.every(i => i.productId);
                              return (
                                <input
                                  type="number"
                                  inputMode="decimal"
                                  step="0.1"
                                  ref={(el) => {
                                    fieldRefs.current[`${order.id}-weight`] = el;
                                  }}
                                  value={order.weight ?? ""}
                                  readOnly={allInventory}
                                  onChange={(e) =>
                                    !allInventory && editLocal(order.id, "weight", e.target.value)
                                  }
                                  onBlur={(e) =>
                                    !allInventory && handleWeightChange(order.id, e.target.value)
                                  }
                                  style={{
                                    width: "100%",
                                    border: `1px solid ${fieldErrors[order.id]?.has("weight") ? "#dc2626" : T.border}`,
                                    borderRadius: 8,
                                    padding: "7px 10px",
                                    fontSize: "0.85rem",
                                    color: allInventory ? T.muted : T.fg,
                                    background: allInventory ? T.card : T.bg,
                                    outline: "none",
                                    boxSizing: "border-box",
                                  }}
                                />
                              );
                            })()}
                          </div>

                          {/* Courier, Shipping Type, Estimated Shipping & Profit in one single row */}
                          <div
                            style={{
                              gridColumn: "1 / -1",
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(180px, 1fr))",
                              gap: 12,
                              alignItems: "end",
                              background: "#fafafa",
                              border: `1px solid ${T.border}`,
                              borderRadius: 10,
                              padding: "12px 14px",
                              marginTop: 8,
                            }}
                          >
                            {/* 1. Courier Dropdown — always rendered, searchable autocomplete */}
                            {(() => {
                              const courierErr =
                                fieldErrors[order.id]?.has("courier");
                              const currentCode =
                                selectedCourier[order.id] || "";
                              const currentName =
                                courierCompanies.find(
                                  (c) => c.code === currentCode,
                                )?.name || currentCode;
                              const isCourierOpen =
                                !!courierDropdownOpen[order.id];
                              const searchTerm = (
                                courierSearch[order.id] ?? currentName
                              ).toLowerCase();
                              const filteredCompanies = isCourierOpen
                                ? courierCompanies
                                    .filter(
                                      (c) =>
                                        !searchTerm ||
                                        c.name
                                          .toLowerCase()
                                          .includes(searchTerm) ||
                                        c.code
                                          .toLowerCase()
                                          .includes(searchTerm),
                                    )
                                    .slice(0, 50)
                                : [];
                              return (
                                <div style={{ position: "relative" }}>
                                  <span
                                    style={{
                                      fontSize: "0.7rem",
                                      color: courierErr ? "#dc2626" : T.muted,
                                      fontWeight: 500,
                                      display: "block",
                                      marginBottom: 4,
                                    }}
                                  >
                                    Courier{courierErr ? " *" : ""}
                                  </span>
                                  <input
                                    type="text"
                                    ref={(el) => {
                                      fieldRefs.current[`${order.id}-courier`] =
                                        el;
                                    }}
                                    value={
                                      courierDropdownOpen[order.id]
                                        ? (courierSearch[order.id] ??
                                          currentName)
                                        : currentName
                                    }
                                    autoComplete="off"
                                    placeholder={
                                      courierCompanies.length === 0
                                        ? syncingCompanies
                                          ? "Syncing..."
                                          : "No companies synced yet"
                                        : "Select courier..."
                                    }
                                    onChange={(e) => {
                                      setCourierSearch((prev) => ({
                                        ...prev,
                                        [order.id]: e.target.value,
                                      }));
                                      setCourierDropdownOpen((prev) => ({
                                        ...prev,
                                        [order.id]: true,
                                      }));
                                      setActiveCourierIndex((prev) => ({
                                        ...prev,
                                        [order.id]: 0,
                                      }));
                                    }}
                                    onFocus={() => {
                                      setCourierSearch((prev) => ({
                                        ...prev,
                                        [order.id]: "",
                                      }));
                                      setCourierDropdownOpen((prev) => ({
                                        ...prev,
                                        [order.id]: true,
                                      }));
                                      setActiveCourierIndex((prev) => ({
                                        ...prev,
                                        [order.id]: 0,
                                      }));
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "ArrowDown") {
                                        e.preventDefault();
                                        setActiveCourierIndex((prev) => ({
                                          ...prev,
                                          [order.id]: Math.min(
                                            (prev[order.id] || 0) + 1,
                                            filteredCompanies.length - 1,
                                          ),
                                        }));
                                      } else if (e.key === "ArrowUp") {
                                        e.preventDefault();
                                        setActiveCourierIndex((prev) => ({
                                          ...prev,
                                          [order.id]: Math.max(
                                            (prev[order.id] || 0) - 1,
                                            0,
                                          ),
                                        }));
                                      } else if (e.key === "Enter") {
                                        e.preventDefault();
                                        const idx =
                                          activeCourierIndex[order.id] || 0;
                                        if (filteredCompanies[idx]) {
                                          const co = filteredCompanies[idx];
                                          handleCourierChange(
                                            order.id,
                                            co.code,
                                            order.weight || "0",
                                            order.city || "",
                                          );
                                          setCourierSearch((prev) => ({
                                            ...prev,
                                            [order.id]: co.name,
                                          }));
                                          setCourierDropdownOpen((prev) => ({
                                            ...prev,
                                            [order.id]: false,
                                          }));
                                        }
                                      } else if (e.key === "Escape") {
                                        setCourierDropdownOpen((prev) => ({
                                          ...prev,
                                          [order.id]: false,
                                        }));
                                        setCourierSearch((prev) => ({
                                          ...prev,
                                          [order.id]: currentName,
                                        }));
                                      }
                                    }}
                                    onBlur={() => {
                                      setTimeout(() => {
                                        setCourierDropdownOpen((prev) => ({
                                          ...prev,
                                          [order.id]: false,
                                        }));
                                        setCourierSearch((prev) => ({
                                          ...prev,
                                          [order.id]: currentName,
                                        }));
                                      }, 220);
                                    }}
                                    style={{
                                      width: "100%",
                                      border: `1px solid ${courierErr ? "#dc2626" : T.border}`,
                                      borderRadius: 10,
                                      padding: "9px 12px",
                                      fontSize: "0.82rem",
                                      color: T.fg,
                                      background: T.bg,
                                      outline: "none",
                                      boxSizing: "border-box",
                                    }}
                                  />
                                  {courierDropdownOpen[order.id] && (
                                    <div
                                      className="bns-dropdown"
                                      style={{
                                        position: "absolute",
                                        zIndex: 1000,
                                        top: "100%",
                                        left: 0,
                                        right: 0,
                                        minWidth: 240,
                                        background: "#fff",
                                        border: `1px solid ${T.border}`,
                                        borderRadius: 10,
                                        boxShadow: "0 8px 28px rgba(0,0,0,0.1)",
                                        maxHeight: 220,
                                        overflowY: "auto",
                                        marginTop: 4,
                                        padding: 4,
                                      }}
                                    >
                                      {syncingCompanies ? (
                                        <div
                                          style={{
                                            padding: "9px 12px",
                                            fontSize: "0.82rem",
                                            color: T.muted,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                          }}
                                        >
                                          <Loader2
                                            size={12}
                                            className="animate-spin"
                                          />{" "}
                                          Syncing companies...
                                        </div>
                                      ) : filteredCompanies.length > 0 ? (
                                        filteredCompanies.map((co, idx) => {
                                          const isActive =
                                            (activeCourierIndex[order.id] ||
                                              0) === idx;
                                          const isSelected =
                                            co.code === currentCode;
                                          return (
                                            <div
                                              key={co.id}
                                              onMouseDown={(e) => {
                                                e.preventDefault();
                                              }}
                                              onClick={() => {
                                                handleCourierChange(
                                                  order.id,
                                                  co.code,
                                                  order.weight || "0",
                                                  order.city || "",
                                                );
                                                setCourierSearch((prev) => ({
                                                  ...prev,
                                                  [order.id]: co.name,
                                                }));
                                                setCourierDropdownOpen(
                                                  (prev) => ({
                                                    ...prev,
                                                    [order.id]: false,
                                                  }),
                                                );
                                              }}
                                              onMouseEnter={() =>
                                                setActiveCourierIndex(
                                                  (prev) => ({
                                                    ...prev,
                                                    [order.id]: idx,
                                                  }),
                                                )
                                              }
                                              style={{
                                                padding: "9px 12px",
                                                fontSize: "0.82rem",
                                                cursor: "pointer",
                                                color: isSelected
                                                  ? T.accent
                                                  : T.fg,
                                                fontWeight: isSelected
                                                  ? 600
                                                  : 400,
                                                background: isActive
                                                  ? T.accentLight
                                                  : "transparent",
                                                borderRadius: 6,
                                                transition:
                                                  "background 0.1s ease",
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                              }}
                                            >
                                              <span>
                                                {co.name ||
                                                  co.code.toUpperCase()}
                                              </span>
                                              {isSelected && (
                                                <Check size={12} />
                                              )}
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <div
                                          style={{
                                            padding: "9px 12px",
                                            fontSize: "0.82rem",
                                            color: T.muted,
                                            textAlign: "center",
                                          }}
                                        >
                                          <div>
                                            No courier companies synchronized.
                                          </div>
                                          <button
                                            onMouseDown={(e) =>
                                              e.preventDefault()
                                            }
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleSyncCompanies();
                                            }}
                                            style={{
                                              marginTop: 6,
                                              border: `1px solid ${T.border}`,
                                              background: T.bg,
                                              color: T.accent,
                                              borderRadius: 6,
                                              padding: "4px 12px",
                                              fontSize: "0.75rem",
                                              fontWeight: 600,
                                              cursor: "pointer",
                                            }}
                                          >
                                            Sync Companies
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}

                            {/* 2. Shipping Type (Auto) */}
                            <div>
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  color: T.muted,
                                  fontWeight: 500,
                                  display: "block",
                                  marginBottom: 4,
                                }}
                              >
                                Shipping Type
                              </span>
                              <div style={{ display: "flex", gap: 4 }}>
                                {["Overnight", "Detain", "Overland"].map(
                                  (type) => {
                                    const calculatedType =
                                      getShippingTypeFromWeight(
                                        parseFloat(order.weight || "0") || 0,
                                      );
                                    const active = calculatedType === type;
                                    return (
                                      <div
                                        key={type}
                                        style={{
                                          flex: 1,
                                          textAlign: "center",
                                          border: `1px solid ${active ? T.accent : T.border}`,
                                          background: active
                                            ? T.accentLight
                                            : T.bg,
                                          color: active ? T.accent : T.muted,
                                          padding: "5px 0",
                                          borderRadius: "4px",
                                          fontSize: "0.65rem",
                                          fontWeight: 600,
                                          userSelect: "none",
                                          opacity: active ? 1 : 0.4,
                                        }}
                                      >
                                        {type}
                                      </div>
                                    );
                                  },
                                )}
                              </div>
                            </div>

                            {/* 3. Estimated Shipping & 4. Estimated Profit */}
                            {(() => {
                              const est = rateEstimates[order.id];
                              const opts = est?.serviceOptions || [];
                              const co = selectedCourier[order.id];
                              // Match the selected courier specifically, fallback to first
                              const opt = co
                                ? opts.find(
                                    (s: any) =>
                                      s.company?.toLowerCase() ===
                                      co.toLowerCase(),
                                  ) || opts[0]
                                : opts[0];
                              const shippingCost = opt ? opt.shippingCost : 0;

                              const saleAmount =
                                parseFloat(order.saleAmount || "0") || 0;
                              const costPrice =
                                parseFloat(order.costPrice || "0") || 0;
                              const hasCostPrice = costPrice > 0;
                              const profit = hasCostPrice
                                ? saleAmount - costPrice
                                : null;
                              const hasEstimate = !!opt;

                              return (
                                <>
                                  <div>
                                    <span
                                      style={{
                                        fontSize: "0.7rem",
                                        color: T.muted,
                                        fontWeight: 500,
                                        display: "block",
                                        marginBottom: 4,
                                      }}
                                    >
                                      Est. Shipping
                                    </span>
                                    <div
                                      style={{
                                        border: `1px solid ${hasEstimate ? "#bfdbfe" : T.border}`,
                                        borderRadius: 6,
                                        padding: "6px 10px",
                                        fontSize: "0.8rem",
                                        fontWeight: 700,
                                        color: hasEstimate
                                          ? "#1d4ed8"
                                          : T.muted,
                                        background: hasEstimate
                                          ? "#eff6ff"
                                          : T.bg,
                                        minHeight: "32px",
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      {hasEstimate ? (
                                        <span>
                                          Rs{" "}
                                          {shippingCost.toLocaleString("en-PK")}{" "}
                                          <span
                                            style={{
                                              fontSize: "0.62rem",
                                              color: "#3b82f6",
                                              fontWeight: 400,
                                            }}
                                          >
                                            incl. 16% GST
                                          </span>
                                        </span>
                                      ) : (
                                        <span
                                          style={{
                                            fontSize: "0.72rem",
                                            fontWeight: 400,
                                          }}
                                        >
                                          {!order.weight || !order.city
                                            ? "Fill weight & city"
                                            : !co
                                              ? "Select courier"
                                              : "No rate card"}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div>
                                    <span
                                      style={{
                                        fontSize: "0.7rem",
                                        color: T.muted,
                                        fontWeight: 500,
                                        display: "block",
                                        marginBottom: 4,
                                      }}
                                    >
                                      Est. Profit
                                    </span>
                                    <div
                                      style={{
                                        border: `1px solid ${profit && profit > 0 ? "#bbf7d0" : profit && profit < 0 ? "#fecaca" : T.border}`,
                                        borderRadius: 6,
                                        padding: "6px 10px",
                                        fontSize: "0.85rem",
                                        fontWeight: 800,
                                        color:
                                          profit && profit > 0
                                            ? "#16a34a"
                                            : profit && profit < 0
                                              ? "#dc2626"
                                              : T.muted,
                                        background:
                                          profit && profit > 0
                                            ? "#f0fdf4"
                                            : profit && profit < 0
                                              ? "#fef2f2"
                                              : T.bg,
                                        minHeight: "32px",
                                        display: "flex",
                                        alignItems: "center",
                                      }}
                                    >
                                      {profit != null ? (
                                        `Rs ${profit.toLocaleString("en-PK")}`
                                      ) : saleAmount > 0 ? (
                                        <span
                                          style={{
                                            fontSize: "0.72rem",
                                            fontWeight: 400,
                                            color: "#d97706",
                                          }}
                                        >
                                          Pending Cost Price
                                        </span>
                                      ) : (
                                        <span
                                          style={{
                                            fontSize: "0.72rem",
                                            fontWeight: 400,
                                          }}
                                        >
                                          Enter Sale Amount
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {draftOrders.length === 0 && !extracting && (
              <div
                style={{
                  textAlign: "center",
                  padding: "80px 0",
                  color: T.muted,
                  fontSize: "0.9rem",
                }}
              >
                No drafts yet. Paste customer orders above to start booking.
              </div>
            )}
          </div>
        )}

        {/* Render Booked Tab */}
        {activeTab === "booked" && (
          <div>
            {/* Bulk actions booked toolbar */}
            {bookedOrders.length > 0 && (
              <div
                className="bns-orders-bulk-bar"
                style={{
                  background: T.card,
                  border: `1px solid ${T.border}`,
                  borderRadius: "8px",
                  padding: "10px 16px",
                  marginBottom: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <button
                    onClick={() => {
                      const allSel = bookedOrders.every((o) =>
                        selectedBooked.has(o.id),
                      );
                      if (allSel) setSelectedBooked(new Set());
                      else
                        setSelectedBooked(
                          new Set(bookedOrders.map((o) => o.id)),
                        );
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      color: bookedOrders.every((o) => selectedBooked.has(o.id))
                        ? T.accent
                        : "#d4d4d4",
                    }}
                  >
                    {bookedOrders.length > 0 &&
                    bookedOrders.every((o) => selectedBooked.has(o.id)) ? (
                      <CheckSquare size={17} />
                    ) : (
                      <Square size={17} />
                    )}
                  </button>

                  <span
                    style={{
                      fontSize: "0.8rem",
                      color: T.muted,
                      fontWeight: 500,
                    }}
                  >
                    {selectedBooked.size} Selected
                  </span>

                  {selectedBooked.size > 0 && (
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      {/* If editing this particular order, show Save / Cancel at the top */}
                      {editingBookedId ? (
                        <>
                          <button
                            onClick={saveInlineEditBooked}
                            disabled={savingEdit}
                            style={{
                              background: "#16a34a",
                              color: "#fff",
                              border: "none",
                              borderRadius: "6px",
                              padding: "6px 14px",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              cursor: savingEdit ? "not-allowed" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            {savingEdit ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Check size={12} />
                            )}
                            {savingEdit ? "Saving..." : "Save Edit"}
                          </button>
                          <button
                            onClick={() => setEditingBookedId(null)}
                            disabled={savingEdit}
                            style={{
                              border: `1px solid ${T.border}`,
                              background: T.bg,
                              color: T.muted,
                              borderRadius: "6px",
                              padding: "6px 14px",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              cursor: savingEdit ? "not-allowed" : "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <X size={12} /> Cancel Edit
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={handleUnbookSelected}
                            disabled={unbooking}
                            style={{
                              border: `1px solid #fecaca`,
                              background: "#fef2f2",
                              color: "#dc2626",
                              borderRadius: "6px",
                              padding: "4px 10px",
                              fontSize: "0.8rem",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            {unbooking ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Undo size={12} />
                            )}{" "}
                            Unbook Selected
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Booked orders table */}
            <div
              className="bns-orders-booked-table"
              style={{
                background: T.bg,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              <div style={{ overflowX: "auto" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    minWidth: "900px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        borderBottom: `1px solid ${T.border}`,
                        background: T.card,
                      }}
                    >
                      <th style={{ padding: "10px 16px", width: "40px" }}></th>
                      {[
                        "Customer",
                        "City",
                        "Product",
                        "Weight",
                        "Shipping",
                        "Tracking",
                        "Status",
                        "Price",
                        "Profit",
                        "Date+Time",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            padding: "10px 16px",
                            textAlign: "left",
                            fontSize: "0.68rem",
                            fontWeight: 600,
                            color: T.muted,
                            letterSpacing: "0.05em",
                            textTransform: "uppercase",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bookedOrders.map((o, i) => {
                      const isEditing = editingBookedId === o.id;
                      const productObj = products.find(
                        (p) => p.id === o.productId,
                      );
                      const displayProduct =
                        productObj?.name ?? o.productInfo ?? "—";

                      return (
                        <tr
                          key={o.id}
                          style={{
                            borderBottom: `1px solid #f0f0f0`,
                            background: isEditing ? "#fffbf8" : "transparent",
                          }}
                        >
                          {/* Checkbox */}
                          <td
                            style={{ padding: "8px 12px", textAlign: "center" }}
                          >
                            <button
                              onClick={() => toggleSelectBooked(o.id)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: 0,
                                display: "flex",
                                color: selectedBooked.has(o.id)
                                  ? T.accent
                                  : "#d4d4d4",
                              }}
                            >
                              {selectedBooked.has(o.id) ? (
                                <CheckSquare size={16} />
                              ) : (
                                <Square size={16} />
                              )}
                            </button>
                          </td>

                          {/* Customer */}
                          <td
                            style={{
                              padding: "8px 12px",
                              fontSize: "0.82rem",
                              color: T.fg,
                              fontWeight: 500,
                            }}
                          >
                            {isEditing ? (
                              <input
                                autoComplete="name"
                                value={editBookedForm.customerName || ""}
                                onChange={(e) =>
                                  setEditBookedForm({
                                    ...editBookedForm,
                                    customerName: e.target.value,
                                  })
                                }
                                style={{
                                  border: `1px solid ${T.border}`,
                                  borderRadius: "4px",
                                  padding: "2px 4px",
                                  fontSize: "0.78rem",
                                  width: "90px",
                                }}
                              />
                            ) : (
                              o.customerName || "—"
                            )}
                          </td>

                          {/* City */}
                          <td
                            style={{
                              padding: "8px 12px",
                              fontSize: "0.82rem",
                              color: T.muted,
                            }}
                          >
                            {isEditing ? (
                              <input
                                autoComplete="address-level2"
                                value={editBookedForm.city || ""}
                                onChange={(e) =>
                                  setEditBookedForm({
                                    ...editBookedForm,
                                    city: e.target.value,
                                  })
                                }
                                style={{
                                  border: `1px solid ${T.border}`,
                                  borderRadius: "4px",
                                  padding: "2px 4px",
                                  fontSize: "0.78rem",
                                  width: "70px",
                                }}
                              />
                            ) : (
                              o.city || "—"
                            )}
                          </td>

                          {/* Product */}
                          <td
                            style={{
                              padding: "8px 12px",
                              fontSize: "0.82rem",
                              color: T.muted,
                            }}
                          >
                            {displayProduct}
                          </td>

                          {/* Weight */}
                          <td
                            style={{
                              padding: "8px 12px",
                              fontSize: "0.82rem",
                              color: T.muted,
                            }}
                          >
                            {isEditing ? (
                              <input
                                type="number"
                                inputMode="decimal"
                                step="0.1"
                                value={editBookedForm.weight || ""}
                                onChange={(e) =>
                                  setEditBookedForm({
                                    ...editBookedForm,
                                    weight: e.target.value,
                                  })
                                }
                                style={{
                                  border: `1px solid ${T.border}`,
                                  borderRadius: "4px",
                                  padding: "2px 4px",
                                  fontSize: "0.78rem",
                                  width: "45px",
                                }}
                              />
                            ) : o.weight ? (
                              `${o.weight} kg`
                            ) : (
                              "—"
                            )}
                          </td>

                          {/* Shipping Type */}
                          <td
                            style={{
                              padding: "8px 12px",
                              fontSize: "0.82rem",
                              color: T.muted,
                            }}
                          >
                            {isEditing ? (
                              <select
                                value={editBookedForm.shippingType || ""}
                                onChange={(e) =>
                                  setEditBookedForm({
                                    ...editBookedForm,
                                    shippingType: e.target.value,
                                  })
                                }
                                style={{
                                  border: `1px solid ${T.border}`,
                                  borderRadius: "4px",
                                  padding: "2px 4px",
                                  fontSize: "0.78rem",
                                }}
                              >
                                <option value="Overnight">Overnight</option>
                                <option value="Detain">Detain</option>
                                <option value="Overland">Overland</option>
                              </select>
                            ) : (
                              o.shippingType || "—"
                            )}
                          </td>

                          {/* Tracking */}
                          <td
                            style={{
                              padding: "8px 12px",
                              fontSize: "0.74rem",
                              color: T.muted,
                              fontFamily: "var(--font-geist-mono)",
                            }}
                          >
                            {o.trackingNumber || "—"}
                          </td>
                          <td style={{ padding: "8px 12px" }}>
                            <span
                              style={{
                                background: T.accent,
                                color: "#fff",
                                fontSize: "0.65rem",
                                fontWeight: 600,
                                padding: "1px 8px",
                                borderRadius: 20,
                              }}
                            >
                              Booked
                            </span>
                          </td>

                          {/* Sell Price */}
                          <td
                            style={{
                              padding: "8px 12px",
                              fontSize: "0.82rem",
                              color: T.fg,
                            }}
                          >
                            {isEditing ? (
                              <input
                                type="number"
                                inputMode="decimal"
                                autoComplete="transaction-amount"
                                value={editBookedForm.sellingPrice || ""}
                                onChange={(e) =>
                                  setEditBookedForm({
                                    ...editBookedForm,
                                    sellingPrice: e.target.value,
                                  })
                                }
                                style={{
                                  border: `1px solid ${T.border}`,
                                  borderRadius: "4px",
                                  padding: "2px 4px",
                                  fontSize: "0.78rem",
                                  width: "70px",
                                }}
                              />
                            ) : o.sellingPrice ? (
                              `Rs ${Number(o.sellingPrice).toLocaleString("en-PK")}`
                            ) : (
                              "—"
                            )}
                          </td>

                          {/* Profit */}
                          <td
                            style={{
                              padding: "8px 12px",
                              fontSize: "0.82rem",
                              fontWeight: 600,
                              color:
                                Number(o.profit ?? 0) > 0
                                  ? "#16a34a"
                                  : "#0a0a0a",
                            }}
                          >
                            {o.profit
                              ? `Rs ${Number(o.profit).toLocaleString("en-PK")}`
                              : "—"}
                          </td>
                          <td
                            style={{
                              padding: "8px 12px",
                              fontSize: "0.78rem",
                              color: T.muted,
                            }}
                          >
                            {new Date(o.createdAt).toLocaleDateString("en-PK")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Booked Cards */}
            <div className="bns-orders-booked-cards">
              {bookedOrders.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 0",
                    color: T.muted,
                    fontSize: "0.9rem",
                  }}
                >
                  No booked shipments yet.
                </div>
              ) : (
                bookedOrders.map((o, i) => {
                  const productObj = products.find((p) => p.id === o.productId);
                  const displayProduct =
                    productObj?.name ?? o.productInfo ?? "—";
                  return (
                    <div key={o.id} className="bns-order-card">
                      <div className="bns-order-card-row">
                        <div>
                          <div className="bns-order-card-name">
                            {o.customerName || "—"}
                          </div>
                          <div className="bns-order-card-meta">
                            <span>📍 {o.city || "—"}</span>
                            <span>📦 {displayProduct}</span>
                            <span>⚖️ {o.weight ? `${o.weight} kg` : "—"}</span>
                            <span>📬 {o.shippingType || "—"}</span>
                          </div>
                          <div className="bns-order-card-tracking">
                            {o.trackingNumber || "—"}
                          </div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                          <div className="bns-order-card-status">Booked</div>
                          <div style={{ marginTop: 8 }}>
                            {o.sellingPrice && (
                              <div
                                style={{
                                  fontSize: "0.78rem",
                                  color: T.fg,
                                  fontWeight: 600,
                                }}
                              >
                                Rs{" "}
                                {Number(o.sellingPrice).toLocaleString("en-PK")}
                              </div>
                            )}
                            <div className="bns-order-card-profit">
                              {o.profit
                                ? `Rs ${Number(o.profit).toLocaleString("en-PK")}`
                                : "—"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
