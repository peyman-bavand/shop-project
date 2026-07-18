"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { AuthUser, CartItem, CartProduct } from "@/types";

const ACCESS_TOKEN_KEY = "shop_access_token";
const REFRESH_TOKEN_KEY = "shop_refresh_token";
const USER_KEY = "shop_user";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ??
  "http://localhost:8000";

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthReady: boolean;
  logIn: (
    accessToken: string,
    refreshToken: string,
    user: AuthUser,
  ) => void;
  logOut: () => void;
}

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  isCartLoading: boolean;
  cartError: string | null;
  refreshCart: () => Promise<void>;
  addItem: (
    product: CartProduct,
    quantity?: number,
  ) => Promise<CartMutationResult>;
  setQuantity: (
    bookId: number,
    quantity: number,
  ) => Promise<void>;
  removeItem: (bookId: number) => Promise<void>;
  clearCart: () => Promise<void>;
  clearCartError: () => void;
}

export interface CartMutationResult {
  ok: boolean;
  error: string | null;
}

interface ApiCartItem {
  id: number;
  book: number;
  book_title: string;
  book_price: string | number;
  quantity: number;
  subtotal: string | number;
  book_slug?: string | null;
  book_author?: string | null;
  book_image?: string | null;
  book_stock?: number | string | null;
}

interface ApiCartResponse {
  id: number;
  items: ApiCartItem[];
  total_items: number;
  total_price: string | number;
}

interface StoredAuthState {
  user: AuthUser | null;
  accessToken: string | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const CartContext = createContext<CartContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isApiCartResponse(value: unknown): value is ApiCartResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    "id" in value &&
    "total_items" in value &&
    "total_price" in value
  );
}

function normalizeStock(item: ApiCartItem): number {
  const parsedStock = Number(item.book_stock);

  if (Number.isFinite(parsedStock) && parsedStock >= 0) {
    return Math.max(parsedStock, item.quantity);
  }

  return Math.max(item.quantity, 1);
}

function mapApiCartItem(item: ApiCartItem): CartItem {
  return {
    id: item.id,
    bookId: item.book,
    title: item.book_title,
    slug: item.book_slug || String(item.book),
    author: item.book_author || "",
    image: item.book_image || null,
    price: item.book_price,
    quantity: item.quantity,
    stock: normalizeStock(item),
  };
}

function extractErrorMessages(
  value: unknown,
  messages: string[],
): void {
  if (typeof value === "string") {
    messages.push(value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => {
      extractErrorMessages(item, messages);
    });
    return;
  }

  if (isRecord(value)) {
    Object.values(value).forEach((item) => {
      extractErrorMessages(item, messages);
    });
  }
}

async function getResponseError(
  response: Response,
): Promise<string> {
  const fallbackMessage =
    `عملیات سبد خرید ناموفق بود. کد خطا: ${response.status}`;

  try {
    const responseBody = (await response.json()) as unknown;
    const messages: string[] = [];

    extractErrorMessages(responseBody, messages);

    return messages.length > 0
      ? messages.join(" ")
      : fallbackMessage;
  } catch {
    return fallbackMessage;
  }
}

function getUnknownErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "خطای ناشناخته‌ای در عملیات سبد خرید رخ داد.";
}

function readStoredAuth(): StoredAuthState {
  if (typeof window === "undefined") {
    return {
      user: null,
      accessToken: null,
    };
  }

  const storedAccessToken = localStorage.getItem(
    ACCESS_TOKEN_KEY,
  );
  const storedUser = localStorage.getItem(USER_KEY);

  if (!storedAccessToken || !storedUser) {
    return {
      user: null,
      accessToken: null,
    };
  }

  try {
    return {
      user: JSON.parse(storedUser) as AuthUser,
      accessToken: storedAccessToken,
    };
  } catch (error) {
    console.error("Failed to restore authentication:", error);
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    return {
      user: null,
      accessToken: null,
    };
  }
}

export default function ShopProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [initialAuthState] = useState<StoredAuthState>(
    readStoredAuth,
  );

  const [user, setUser] = useState<AuthUser | null>(
    initialAuthState.user,
  );
  const [accessToken, setAccessToken] = useState<string | null>(
    initialAuthState.accessToken,
  );

  const isAuthReady = true;

  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartFetching, setIsCartFetching] = useState(false);
  const [pendingMutations, setPendingMutations] = useState(0);
  const [cartError, setCartError] = useState<string | null>(null);

  const accessTokenRef = useRef<string | null>(
    initialAuthState.accessToken,
  );
  const mutationQueueRef = useRef<Promise<void>>(
    Promise.resolve(),
  );

  useEffect(() => {
    accessTokenRef.current = accessToken;
  }, [accessToken]);

  const clearStoredAuth = useCallback(() => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    accessTokenRef.current = null;

    setAccessToken(null);
    setUser(null);
    setItems([]);
  }, []);

  const applyApiCart = useCallback((cart: ApiCartResponse) => {
    setItems(cart.items.map(mapApiCartItem));
  }, []);

  const handleUnauthorized = useCallback(() => {
    clearStoredAuth();

    throw new Error(
      "نشست کاربری منقضی شده است. لطفاً دوباره وارد حساب شوید.",
    );
  }, [clearStoredAuth]);

  const requestCart = useCallback(
    async (
      token: string,
      signal?: AbortSignal,
    ): Promise<ApiCartResponse> => {
      const response = await fetch(`${API_URL}/api/cart/`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
        signal,
      });

      if (response.status === 401) {
        handleUnauthorized();
      }

      if (!response.ok) {
        throw new Error(await getResponseError(response));
      }

      const responseBody = (await response.json()) as unknown;

      if (!isApiCartResponse(responseBody)) {
        throw new Error(
          "ساختار پاسخ سبد خرید با فرمت مورد انتظار مطابقت ندارد.",
        );
      }

      return responseBody;
    },
    [handleUnauthorized],
  );

  const refreshCart = useCallback(async (): Promise<void> => {
    const token = accessTokenRef.current;

    if (!token) {
      setItems([]);
      return;
    }

    setIsCartFetching(true);
    setCartError(null);

    try {
      const cart = await requestCart(token);
      applyApiCart(cart);
    } catch (error) {
      console.error("Failed to refresh cart:", error);
      setCartError(getUnknownErrorMessage(error));
    } finally {
      setIsCartFetching(false);
    }
  }, [applyApiCart, requestCart]);

  useEffect(() => {
    if (!isAuthReady || !user || !accessToken) {
      return;
    }

    const controller = new AbortController();

    async function loadCart(token: string): Promise<void> {
      setIsCartFetching(true);
      setCartError(null);

      try {
        const cart = await requestCart(
          token,
          controller.signal,
        );

        if (!controller.signal.aborted) {
          applyApiCart(cart);
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        console.error("Failed to load cart:", error);

        if (!controller.signal.aborted) {
          setItems([]);
          setCartError(getUnknownErrorMessage(error));
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsCartFetching(false);
        }
      }
    }

    void loadCart(accessToken);

    return () => {
      controller.abort();
    };
  }, [
    accessToken,
    applyApiCart,
    isAuthReady,
    requestCart,
    user,
  ]);

  const logIn = useCallback(
    (
      nextAccessToken: string,
      refreshToken: string,
      nextUser: AuthUser,
    ) => {
      localStorage.setItem(
        ACCESS_TOKEN_KEY,
        nextAccessToken,
      );
      localStorage.setItem(
        REFRESH_TOKEN_KEY,
        refreshToken,
      );
      localStorage.setItem(
        USER_KEY,
        JSON.stringify(nextUser),
      );

      accessTokenRef.current = nextAccessToken;

      setCartError(null);
      setAccessToken(nextAccessToken);
      setUser(nextUser);
    },
    [],
  );

  const logOut = useCallback(() => {
    clearStoredAuth();

    setCartError(null);
    setIsCartFetching(false);
    setPendingMutations(0);

    mutationQueueRef.current = Promise.resolve();
  }, [clearStoredAuth]);

  const executeCartMutation = useCallback(
    async (
      endpoint: string,
      init: RequestInit,
    ): Promise<void> => {
      const token = accessTokenRef.current;

      if (!token) {
        throw new Error(
          "برای تغییر سبد خرید ابتدا وارد حساب شوید.",
        );
      }

      const response = await fetch(`${API_URL}${endpoint}`, {
        ...init,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          ...init.headers,
        },
        cache: "no-store",
      });

      if (response.status === 401) {
        handleUnauthorized();
      }

      if (!response.ok) {
        throw new Error(await getResponseError(response));
      }

      if (response.status !== 204) {
        try {
          const responseBody =
            (await response.json()) as unknown;

          if (isApiCartResponse(responseBody)) {
            applyApiCart(responseBody);
            return;
          }
        } catch {
          // پاسخ JSON ندارد؛ سبد با GET همگام می‌شود.
        }
      }

      const freshCart = await requestCart(token);
      applyApiCart(freshCart);
    },
    [
      applyApiCart,
      handleUnauthorized,
      requestCart,
    ],
  );

  const enqueueCartMutation = useCallback(
    async (
      operation: () => Promise<void>,
    ): Promise<CartMutationResult> => {
      setPendingMutations((current) => current + 1);

      const queuedOperation = mutationQueueRef.current.then(
        operation,
        operation,
      );

      mutationQueueRef.current = queuedOperation.then(
        () => undefined,
        () => undefined,
      );

      try {
        setCartError(null);
        await queuedOperation;
        return { ok: true, error: null };
      } catch (error) {
        console.error("Cart mutation failed:", error);
        const errorMessage = getUnknownErrorMessage(error);
        setCartError(errorMessage);
        return { ok: false, error: errorMessage };
      } finally {
        setPendingMutations((current) =>
          Math.max(0, current - 1),
        );
      }
    },
    [],
  );

  const addItem = useCallback(
    async (
      product: CartProduct,
      quantity = 1,
    ): Promise<CartMutationResult> => {
      const normalizedQuantity = Math.max(
        1,
        Math.trunc(quantity),
      );

      return enqueueCartMutation(() =>
        executeCartMutation("/api/cart/items/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            book: product.bookId,
            quantity: normalizedQuantity,
          }),
        }),
      );
    },
    [enqueueCartMutation, executeCartMutation],
  );

  const removeItem = useCallback(
    async (bookId: number): Promise<void> => {
      const cartItem = items.find(
        (item) => item.bookId === bookId,
      );

      if (!cartItem) {
        setCartError("آیتم موردنظر در سبد خرید پیدا نشد.");
        return;
      }

      await enqueueCartMutation(() =>
        executeCartMutation(
          `/api/cart/items/${cartItem.id}/delete/`,
          {
            method: "DELETE",
          },
        ),
      );
    },
    [enqueueCartMutation, executeCartMutation, items],
  );

  const setQuantity = useCallback(
    async (
      bookId: number,
      quantity: number,
    ): Promise<void> => {
      const normalizedQuantity = Math.trunc(quantity);

      if (normalizedQuantity <= 0) {
        await removeItem(bookId);
        return;
      }

      const cartItem = items.find(
        (item) => item.bookId === bookId,
      );

      if (!cartItem) {
        setCartError("آیتم موردنظر در سبد خرید پیدا نشد.");
        return;
      }

      await enqueueCartMutation(() =>
        executeCartMutation(
          `/api/cart/items/${cartItem.id}/`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              quantity: normalizedQuantity,
            }),
          },
        ),
      );
    },
    [
      enqueueCartMutation,
      executeCartMutation,
      items,
      removeItem,
    ],
  );

  const clearCart = useCallback(async (): Promise<void> => {
    if (items.length === 0) {
      return;
    }

    await enqueueCartMutation(() =>
      executeCartMutation("/api/cart/clear/", {
        method: "POST",
      }),
    );
  }, [
    enqueueCartMutation,
    executeCartMutation,
    items.length,
  ]);

  const clearCartError = useCallback(() => {
    setCartError(null);
  }, []);

  const authValue = useMemo<AuthContextValue>(
    () => ({
      user,
      accessToken,
      isAuthReady,
      logIn,
      logOut,
    }),
    [
      accessToken,
      isAuthReady,
      logIn,
      logOut,
      user,
    ],
  );

  const totalItems = useMemo(
    () =>
      items.reduce(
        (total, item) => total + item.quantity,
        0,
      ),
    [items],
  );

  const totalPrice = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total + Number(item.price) * item.quantity,
        0,
      ),
    [items],
  );

  const cartValue = useMemo<CartContextValue>(
    () => ({
      items,
      totalItems,
      totalPrice,
      isCartLoading:
        isCartFetching || pendingMutations > 0,
      cartError,
      refreshCart,
      addItem,
      setQuantity,
      removeItem,
      clearCart,
      clearCartError,
    }),
    [
      addItem,
      cartError,
      clearCart,
      clearCartError,
      isCartFetching,
      items,
      pendingMutations,
      refreshCart,
      removeItem,
      setQuantity,
      totalItems,
      totalPrice,
    ],
  );

  return (
    <AuthContext.Provider value={authValue}>
      <CartContext.Provider value={cartValue}>
        {children}
      </CartContext.Provider>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside ShopProvider.",
    );
  }

  return context;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart must be used inside ShopProvider.",
    );
  }

  return context;
}
