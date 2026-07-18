"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { CartProduct } from "@/types";
import { useAuth, useCart } from "./ShopProvider";

export default function AddToCartButton({
  product,
}: {
  product: CartProduct;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthReady } = useAuth();
  const { addItem } = useCart();
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleAddToCart() {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    const result = await addItem(product);

    if (result.ok) {
      setStatus("success");
      return;
    }

    setStatus("error");
    setErrorMessage(result.error || "افزودن کتاب به سبد خرید ناموفق بود.");
  }

  return (
    <div className="text-left">
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={
          !isAuthReady || product.stock === 0 || status === "loading"
        }
        className={`rounded-lg px-8 py-3 font-bold text-white transition-colors ${
          product.stock > 0
            ? "bg-indigo-600 shadow-sm hover:bg-indigo-700"
            : "cursor-not-allowed bg-gray-400"
        } disabled:cursor-not-allowed disabled:bg-gray-400`}
      >
        {product.stock === 0
          ? "ناموجود"
          : status === "loading"
            ? "در حال افزودن..."
            : status === "success"
              ? "به سبد اضافه شد"
              : "افزودن به سبد خرید"}
      </button>
      {status === "error" && (
        <p className="mt-2 max-w-xs text-sm text-rose-600" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
