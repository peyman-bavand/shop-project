// "use client";

// import Image from "next/image";
// import Link from "next/link";
// import { useEffect, useMemo, useState } from "react";
// import { useRouter } from "next/navigation";
// import { useAuth, useCart } from "@/components/ShopProvider";

// function formatPrice(price: number | string): string {
//   const value = Number(price);
//   return Number.isNaN(value) ? String(price) : value.toLocaleString("fa-IR");
// }

// const API_URL =
//   process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "") ??
//   "http://localhost:8000";

// async function getApiError(response: Response): Promise<string> {
//   try {
//     const data = (await response.json()) as unknown;

//     if (
//       data &&
//       typeof data === "object" &&
//       "detail" in data &&
//       typeof (data as { detail?: unknown }).detail === "string"
//     ) {
//       return (data as { detail: string }).detail;
//     }

//     return `درخواست ناموفق بود. کد خطا: ${response.status}`;
//   } catch {
//     return `درخواست ناموفق بود. کد خطا: ${response.status}`;
//   }
// }

// export default function CartPage() {
//   const router = useRouter();
//   const { user, accessToken, isAuthReady } = useAuth();
//   const {
//     items,
//     totalItems,
//     totalPrice,
//     setQuantity,
//     removeItem,
//     clearCart,
//     isCartLoading,
//     cartError,
//   } = useCart();

//   const [isCheckingOut, setIsCheckingOut] = useState(false);
//   const [checkoutError, setCheckoutError] = useState<string | null>(null);

//   useEffect(() => {
//     if (isAuthReady && !user) {
//       router.replace("/login?next=%2Fcart");
//     }
//   }, [isAuthReady, router, user]);

//   const disabledReasons = useMemo(() => {
//     const reasons: string[] = [];

//     if (!isAuthReady) reasons.push("احراز هویت هنوز آماده نیست");
//     if (!user) reasons.push("کاربر وارد حساب نشده است");
//     if (!accessToken) reasons.push("توکن دسترسی موجود نیست");
//     if (isCheckingOut) reasons.push("فرآیند checkout در حال اجرا است");
//     if (isCartLoading) reasons.push("سبد خرید هنوز در حال بارگذاری است");
//     if (items.length === 0) reasons.push("سبد خرید خالی است");

//     return reasons;
//   }, [isAuthReady, user, accessToken, isCheckingOut, isCartLoading, items.length]);

//   const isCheckoutDisabled = disabledReasons.length > 0;

//   useEffect(() => {
//     console.log("CART DEBUG", {
//       isAuthReady,
//       hasUser: Boolean(user),
//       accessTokenExists: Boolean(accessToken),
//       itemsLength: items.length,
//       isCartLoading,
//       isCheckingOut,
//       isCheckoutDisabled,
//       disabledReasons,
//     });
//   }, [
//     isAuthReady,
//     user,
//     accessToken,
//     items.length,
//     isCartLoading,
//     isCheckingOut,
//     isCheckoutDisabled,
//     disabledReasons,
//   ]);

//   async function handleCheckout() {
//     if (isCheckoutDisabled) return;

//     setIsCheckingOut(true);
//     setCheckoutError(null);

//     try {
//       const checkoutResponse = await fetch(`${API_URL}/api/orders/checkout/`, {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           "Content-Type": "application/json",
//         },
//         cache: "no-store",
//       });

//       if (checkoutResponse.status === 401) {
//         router.push("/login?next=%2Fcart");
//         return;
//       }

//       if (!checkoutResponse.ok) {
//         throw new Error(await getApiError(checkoutResponse));
//       }

//       const checkoutData = (await checkoutResponse.json()) as {
//         id?: number | string;
//         order_id?: number | string;
//       };

//       const orderId = checkoutData.order_id ?? checkoutData.id;

//       if (!orderId) {
//         throw new Error("شناسه سفارش از سرور دریافت نشد.");
//       }

//       const paymentResponse = await fetch(`${API_URL}/api/payments/create/`, {
//         method: "POST",
//         headers: {
//           Authorization: `Bearer ${accessToken}`,
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           order_id: orderId,
//         }),
//         cache: "no-store",
//       });

//       if (!paymentResponse.ok) {
//         throw new Error(await getApiError(paymentResponse));
//       }

//       const paymentData = (await paymentResponse.json()) as {
//         payment_url?: string;
//       };

//       if (!paymentData.payment_url) {
//         throw new Error("آدرس پرداخت از سرور دریافت نشد.");
//       }

//       window.location.assign(paymentData.payment_url);
//     } catch (error) {
//       const message =
//         error instanceof Error ? error.message : "خطای نامشخص در checkout";
//       setCheckoutError(message);
//     } finally {
//       setIsCheckingOut(false);
//     }
//   }

//   return (
//     <main className="mx-auto max-w-6xl px-4 py-8">
//       <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
//         <pre className="whitespace-pre-wrap break-words">
//           {JSON.stringify(
//             {
//               isAuthReady,
//               hasUser: Boolean(user),
//               accessTokenExists: Boolean(accessToken),
//               itemsLength: items.length,
//               isCartLoading,
//               isCheckingOut,
//               isCheckoutDisabled,
//               disabledReasons,
//             },
//             null,
//             2
//           )}
//         </pre>
//       </div>

//       {!isAuthReady || !user ? (
//         <p className="text-sm text-gray-600">در حال بررسی حساب کاربری...</p>
//       ) : (
//         <>
//           <div className="mb-8">
//             <h1 className="text-2xl font-bold text-gray-900">سبد خرید</h1>
//             <p className="mt-1 text-sm text-gray-600">
//               مجموع آیتم‌ها: {totalItems}
//             </p>
//           </div>

//           {cartError ? (
//             <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
//               {cartError}
//             </div>
//           ) : null}

//           {checkoutError ? (
//             <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
//               {checkoutError}
//             </div>
//           ) : null}

//           <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
//             <section className="space-y-4">
//               {items.length === 0 ? (
//                 <div className="rounded-lg border bg-white p-6 text-sm text-gray-600">
//                   سبد خرید شما خالی است.
//                 </div>
//               ) : (
//                 items.map((item) => (
//                   <div
//                     key={item.bookId}
//                     className="flex gap-4 rounded-lg border bg-white p-4"
//                   >
//                     <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded bg-gray-100">
//                       {item.image ? (
//                         <Image
//                           src={item.image}
//                           alt={item.title}
//                           fill
//                           className="object-cover"
//                         />
//                       ) : null}
//                     </div>

//                     <div className="min-w-0 flex-1">
//                       <div className="flex items-start justify-between gap-4">
//                         <div className="min-w-0">
//                           <h2 className="truncate text-sm font-medium text-gray-900">
//                             {item.title}
//                           </h2>
//                           <p className="mt-1 text-sm text-gray-600">
//                             {formatPrice(item.price)} تومان
//                           </p>
//                           <p className="mt-1 text-xs text-gray-500">
//                             نویسنده: {item.author}
//                           </p>
//                         </div>

//                         <button
//                           type="button"
//                           onClick={() => removeItem(item.bookId)}
//                           className="text-sm text-red-600 hover:text-red-700"
//                         >
//                           حذف
//                         </button>
//                       </div>

//                       <div className="mt-4 flex items-center gap-3">
//                         <button
//                           type="button"
//                           onClick={() => setQuantity(item.bookId, item.quantity - 1)}
//                           className="h-8 w-8 rounded border text-lg leading-8 text-gray-700 hover:bg-gray-50"
//                         >
//                           −
//                         </button>

//                         <span className="min-w-8 text-center text-sm">
//                           {item.quantity}
//                         </span>

//                         <button
//                           type="button"
//                           onClick={() => setQuantity(item.bookId, item.quantity + 1)}
//                           className="h-8 w-8 rounded border text-lg leading-8 text-gray-700 hover:bg-gray-50"
//                         >
//                           +
//                         </button>
//                       </div>
//                     </div>
//                   </div>
//                 ))
//               )}
//             </section>

//             <aside className="h-fit rounded-lg border bg-white p-4">
//               <h2 className="text-lg font-semibold text-gray-900">خلاصه سفارش</h2>

//               <div className="mt-4 space-y-2 text-sm text-gray-700">
//                 <div className="flex items-center justify-between">
//                   <span>تعداد آیتم‌ها</span>
//                   <span>{totalItems}</span>
//                 </div>
//                 <div className="flex items-center justify-between">
//                   <span>مبلغ کل</span>
//                   <span>{formatPrice(totalPrice)} تومان</span>
//                 </div>
//               </div>

//               {isCheckoutDisabled ? (
//                 <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
//                   {disabledReasons.map((reason) => (
//                     <div key={reason}>{reason}</div>
//                   ))}
//                 </div>
//               ) : null}

//               <button
//                 type="button"
//                 onClick={() => void handleCheckout()}
//                 disabled={isCheckoutDisabled}
//                 className="mt-4 w-full rounded bg-black px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
//               >
//                 {isCheckingOut ? "در حال انتقال به پرداخت..." : "ادامه و پرداخت"}
//               </button>

//               <button
//                 type="button"
//                 onClick={() => clearCart()}
//                 className="mt-3 w-full rounded border px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"
//               >
//                 پاک کردن سبد
//               </button>

//               <Link
//                 href="/shop"
//                 className="mt-3 block text-center text-sm text-blue-600 hover:text-blue-700"
//               >
//                 ادامه خرید
//               </Link>
//             </aside>
//           </div>
//         </>
//       )}
//     </main>
//   );
// }


<div>sghjjjjjjjjjjjjjjjj</div>