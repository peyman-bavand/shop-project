"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AuthUser } from "@/types";
import { useAuth } from "@/components/ShopProvider";

const API_URL = "http://localhost:8000";

type LoginStep = "phone" | "code";

interface VerifyResponse {
  access: string;
  refresh: string;
  user: AuthUser;
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (typeof data !== "object" || data === null) return fallback;

  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === "string") return detail;

  for (const value of Object.values(data)) {
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }

  return fallback;
}

function getSafeNextPath(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthReady, logIn } = useAuth();
  const [step, setStep] = useState<LoginStep>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nextPath = getSafeNextPath(searchParams.get("next"));

  useEffect(() => {
    if (isAuthReady && user) router.replace(nextPath);
  }, [isAuthReady, nextPath, router, user]);

  async function requestOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/auth/request-otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneNumber }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "ارسال کد ورود ناموفق بود."));
      }

      setStep("code");
      setMessage("کد شش‌رقمی ورود برای شما ارسال شد.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "ارسال کد ورود ناموفق بود.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function verifyOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/auth/verify-otp/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_number: phoneNumber, code }),
      });
      const data = (await response.json()) as VerifyResponse;

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "کد ورود معتبر نیست."));
      }

      logIn(data.access, data.refresh, data.user);
      router.replace(nextPath);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "کد ورود معتبر نیست.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-12"
      dir="rtl"
    >
      <section className="w-full rounded-2xl border bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-7">
          <p className="text-sm font-semibold text-indigo-600">حساب کاربری</p>
          <h1 className="mt-2 text-3xl font-black text-gray-900">
            ورود با شماره موبایل
          </h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            برای ثبت دیدگاه و استفاده از سبد خرید وارد حساب خود شوید.
          </p>
        </div>

        {step === "phone" ? (
          <form onSubmit={requestOtp} className="space-y-5">
            <div>
              <label
                htmlFor="phone-number"
                className="mb-2 block text-sm font-bold text-gray-800"
              >
                شماره موبایل
              </label>
              <input
                id="phone-number"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                required
                pattern="09[0-9]{9}"
                maxLength={11}
                placeholder="09121234567"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-left text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                dir="ltr"
              />
              <p className="mt-2 text-xs text-gray-500">
                شماره باید با ۰۹ شروع شود و ۱۱ رقم باشد.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isSubmitting ? "در حال ارسال..." : "دریافت کد ورود"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyOtp} className="space-y-5">
            <div>
              <label
                htmlFor="otp-code"
                className="mb-2 block text-sm font-bold text-gray-800"
              >
                کد یک‌بارمصرف
              </label>
              <input
                id="otp-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="123456"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-center text-2xl tracking-[0.4em] text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                dir="ltr"
              />
              <p className="mt-2 text-sm text-gray-500">
                کد ارسال‌شده به{" "}
                <span className="font-semibold" dir="ltr">
                  {phoneNumber}
                </span>{" "}
                را وارد کنید.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isSubmitting ? "در حال بررسی..." : "ورود به حساب"}
            </button>
            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setCode("");
                setMessage("");
              }}
              className="w-full text-sm font-semibold text-indigo-700"
            >
              تغییر شماره موبایل
            </button>
          </form>
        )}

        {message && (
          <p className="mt-5 rounded-xl bg-gray-100 px-4 py-3 text-sm text-gray-700">
            {message}
          </p>
        )}

        <Link
          href="/"
          className="mt-6 block text-center text-sm font-semibold text-gray-500 hover:text-indigo-700"
        >
          بازگشت به فروشگاه
        </Link>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-12">
          <p className="w-full text-center text-gray-500">
            در حال آماده‌سازی صفحه ورود...
          </p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
