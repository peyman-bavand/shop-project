"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

function PaymentResultContent() {
  const searchParams = useSearchParams();

  const status = searchParams.get("status");
  const reason = searchParams.get("reason");
  const paymentId = searchParams.get("payment_id");
  const orderId = searchParams.get("order_id");
  const referenceId = searchParams.get("reference_id");
  const authority = searchParams.get("authority");
  const message = searchParams.get("message");

  const isSuccess = status === "success";
  const isCanceled = status === "canceled";

  const title = isSuccess
    ? "پرداخت با موفقیت انجام شد"
    : isCanceled
      ? "پرداخت لغو شد"
      : "پرداخت ناموفق بود";

  const description = isSuccess
    ? "سفارش شما با موفقیت ثبت و پرداخت شد."
    : isCanceled
      ? "پرداخت توسط شما لغو شد. در صورت تمایل می‌توانید دوباره تلاش کنید."
      : "متأسفانه پرداخت با مشکل مواجه شد. لطفاً دوباره تلاش کنید یا با پشتیبانی تماس بگیرید.";

  const icon = isSuccess ? "✓" : isCanceled ? "!" : "×";

  const iconClasses = isSuccess
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : isCanceled
      ? "bg-amber-100 text-amber-700 border-amber-200"
      : "bg-red-100 text-red-700 border-red-200";

  const cardClasses = isSuccess
    ? "border-emerald-200"
    : isCanceled
      ? "border-amber-200"
      : "border-red-200";

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900"
    >
      <div className="mx-auto max-w-2xl">
        <section
          className={`rounded-3xl border bg-white p-6 shadow-sm sm:p-8 ${cardClasses}`}
        >
          <div className="flex flex-col items-center text-center">
            <div
              className={`mb-5 flex h-20 w-20 items-center justify-center rounded-full border text-4xl font-bold ${iconClasses}`}
            >
              {icon}
            </div>

            <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>

            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-600 sm:text-base">
              {description}
            </p>

            {message && (
              <p className="mt-3 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
                {message}
              </p>
            )}
          </div>

          <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h2 className="mb-4 text-base font-semibold text-slate-800">
              جزئیات تراکنش
            </h2>

            <dl className="space-y-3 text-sm">
              <InfoRow label="وضعیت" value={status || "-"} />
              <InfoRow label="علت" value={reason || "-"} />
              <InfoRow label="شناسه سفارش" value={orderId || "-"} />
              <InfoRow label="شناسه پرداخت" value={paymentId || "-"} />
              <InfoRow label="شماره پیگیری" value={referenceId || "-"} />
              <InfoRow label="Authority" value={authority || "-"} mono />
            </dl>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {isSuccess ? (
              <>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  بازگشت به صفحه اصلی
                </Link>

                {orderId && (
                  <Link
                    href={`/orders/${orderId}`}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                  >
                    مشاهده سفارش
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link
                  href="/cart"
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  بازگشت به سبد خرید
                </Link>

                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  صفحه اصلی
                </Link>
              </>
            )}
          </div>
        </section>

        <p className="mt-5 text-center text-xs leading-6 text-slate-500">
          اگر مبلغی از حساب شما کم شده اما سفارش پرداخت‌شده نمایش داده نمی‌شود،
          شماره پیگیری را برای پشتیبانی ارسال کنید.
        </p>
      </div>
    </main>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-200 pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={`break-all text-left font-medium text-slate-800 ${
          mono ? "font-mono text-xs" : ""
        }`}
        dir={mono ? "ltr" : "rtl"}
      >
        {value}
      </dd>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense
      fallback={
        <main
          dir="rtl"
          className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-slate-900"
        >
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            در حال بارگذاری نتیجه پرداخت...
          </div>
        </main>
      }
    >
      <PaymentResultContent />
    </Suspense>
  );
}


