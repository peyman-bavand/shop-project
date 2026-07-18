"use client";

import Link from "next/link";

export default function BookDetailError({
  unstable_retry,
}: {
  unstable_retry: () => void;
}) {
  return (
    <main className="container mx-auto px-4 py-16 text-center" dir="rtl">
      <h1 className="text-2xl font-bold text-gray-900">
        دریافت اطلاعات کتاب ناموفق بود
      </h1>
      <p className="mt-3 text-gray-500">
        لطفاً دوباره تلاش کنید یا به فهرست کتاب‌ها بازگردید.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700"
        >
          تلاش دوباره
        </button>
        <Link
          href="/"
          className="rounded-lg border border-gray-300 px-5 py-2 font-semibold text-gray-700 hover:bg-gray-50"
        >
          بازگشت به فروشگاه
        </Link>
      </div>
    </main>
  );
}
