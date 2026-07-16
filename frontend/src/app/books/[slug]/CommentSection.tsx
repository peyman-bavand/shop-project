"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { BookComment } from "@/types";

const API_URL = "http://localhost:8000";
const ACCESS_TOKEN_KEY = "shop_access_token";
const REFRESH_TOKEN_KEY = "shop_refresh_token";

interface CommentSectionProps {
  slug: string;
  initialComments: BookComment[];
}

type LoginStep = "phone" | "code";

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("fa-IR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

function getErrorMessage(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null) {
    const detail = (data as { detail?: unknown }).detail;
    if (typeof detail === "string") return detail;

    const text = (data as { text?: unknown }).text;
    if (Array.isArray(text) && typeof text[0] === "string") return text[0];
  }

  return fallback;
}

export default function CommentSection({
  slug,
  initialComments,
}: CommentSectionProps) {
  const [comments, setComments] = useState(initialComments);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loginStep, setLoginStep] = useState<LoginStep>("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [commentText, setCommentText] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setAccessToken(localStorage.getItem(ACCESS_TOKEN_KEY));
  }, []);

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

      setLoginStep("code");
      setMessage("کد ورود برای شما ارسال شد.");
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
      const data = await response.json();

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "کد ورود معتبر نیست."));
      }

      localStorage.setItem(ACCESS_TOKEN_KEY, data.access);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh);
      setAccessToken(data.access);
      setCode("");
      setMessage("با موفقیت وارد شدید.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "کد ورود معتبر نیست.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken) return;

    setIsSubmitting(true);
    setMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/books/${encodeURIComponent(slug)}/comments/`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: commentText }),
        },
      );
      const data = await response.json();

      if (response.status === 401) {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        setAccessToken(null);
        throw new Error("نشست شما منقضی شده است؛ دوباره وارد شوید.");
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(data, "ثبت دیدگاه ناموفق بود."));
      }

      setComments((currentComments) => [data, ...currentComments]);
      setCommentText("");
      setMessage("دیدگاه شما ثبت شد.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "ثبت دیدگاه ناموفق بود.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function logOut() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setAccessToken(null);
    setLoginStep("phone");
    setMessage("از حساب کاربری خارج شدید.");
  }

  return (
    <section className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">دیدگاه کاربران</h2>
          <p className="mt-1 text-sm text-gray-500">
            {comments.length.toLocaleString("fa-IR")} دیدگاه برای این کتاب
          </p>
        </div>

        {accessToken && (
          <button
            type="button"
            onClick={logOut}
            className="text-sm font-semibold text-gray-500 hover:text-rose-600"
          >
            خروج از حساب
          </button>
        )}
      </div>

      {accessToken ? (
        <form onSubmit={submitComment} className="mb-8 rounded-lg bg-gray-50 p-4">
          <label
            htmlFor="comment"
            className="mb-2 block font-semibold text-gray-800"
          >
            دیدگاه شما
          </label>
          <textarea
            id="comment"
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            maxLength={1000}
            required
            rows={4}
            placeholder="نظر خود را درباره این کتاب بنویسید..."
            className="w-full resize-y rounded-lg border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          />
          <div className="mt-3 flex items-center justify-between gap-4">
            <span className="text-xs text-gray-500">
              {commentText.length.toLocaleString("fa-IR")} از ۱٬۰۰۰ نویسه
            </span>
            <button
              type="submit"
              disabled={isSubmitting || !commentText.trim()}
              className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {isSubmitting ? "در حال ثبت..." : "ثبت دیدگاه"}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-8 rounded-lg border border-indigo-100 bg-indigo-50 p-4">
          <h3 className="font-bold text-gray-900">
            برای ثبت دیدگاه وارد شوید
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            ورود با شماره موبایل و کد یک‌بارمصرف انجام می‌شود.
          </p>

          {loginStep === "phone" ? (
            <form onSubmit={requestOtp} className="mt-4 flex flex-wrap gap-3">
              <input
                type="tel"
                inputMode="numeric"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                required
                pattern="09[0-9]{9}"
                placeholder="۰۹۱۲۱۲۳۴۵۶۷"
                aria-label="شماره موبایل"
                className="min-w-56 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-gray-900 outline-none focus:border-indigo-500"
                dir="ltr"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {isSubmitting ? "در حال ارسال..." : "دریافت کد ورود"}
              </button>
            </form>
          ) : (
            <form onSubmit={verifyOtp} className="mt-4 flex flex-wrap gap-3">
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="کد ۶ رقمی"
                aria-label="کد ورود"
                className="min-w-44 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-left text-gray-900 outline-none focus:border-indigo-500"
                dir="ltr"
              />
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700 disabled:bg-gray-400"
              >
                {isSubmitting ? "در حال بررسی..." : "ورود"}
              </button>
              <button
                type="button"
                onClick={() => setLoginStep("phone")}
                className="px-2 text-sm font-semibold text-indigo-700"
              >
                تغییر شماره
              </button>
            </form>
          )}
        </div>
      )}

      {message && (
        <p className="mb-5 rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-700">
          {message}
        </p>
      )}

      {comments.length === 0 ? (
        <p className="py-8 text-center text-gray-500">
          هنوز دیدگاهی ثبت نشده است؛ اولین نفر باشید.
        </p>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <article key={comment.id} className="rounded-lg border p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-gray-900">
                  کاربر {comment.author}
                </span>
                <time
                  dateTime={comment.created_at}
                  className="text-xs text-gray-500"
                >
                  {formatDate(comment.created_at)}
                </time>
              </div>
              <p className="whitespace-pre-line leading-7 text-gray-700">
                {comment.text}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
