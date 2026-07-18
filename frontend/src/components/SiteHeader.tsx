"use client";

import Link from "next/link";
import { useAuth, useCart } from "./ShopProvider";

export default function SiteHeader() {
  const { user, isAuthReady, logOut } = useAuth();
  const { totalItems } = useCart();

  return (
    <header className="border-b bg-white" dir="rtl">
      <div className="container mx-auto flex min-h-16 items-center justify-between gap-4 px-4">
        <Link href="/" className="text-xl font-black text-indigo-700">
          کتاب‌فروشی
        </Link>

        <nav className="flex items-center gap-2 text-sm font-semibold">
          <Link
            href="/cart"
            className="rounded-lg px-3 py-2 text-gray-700 hover:bg-gray-100"
          >
            سبد خرید
            {totalItems > 0 && (
              <span className="mr-2 rounded-full bg-indigo-600 px-2 py-0.5 text-xs text-white">
                {totalItems.toLocaleString("fa-IR")}
              </span>
            )}
          </Link>

          {isAuthReady &&
            (user ? (
              <>
                <span className="hidden text-gray-500 sm:inline" dir="ltr">
                  {user.phone_number}
                </span>
                <button
                  type="button"
                  onClick={logOut}
                  className="rounded-lg px-3 py-2 text-rose-600 hover:bg-rose-50"
                >
                  خروج
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="rounded-lg bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700"
              >
                ورود
              </Link>
            ))}
        </nav>
      </div>
    </header>
  );
}
