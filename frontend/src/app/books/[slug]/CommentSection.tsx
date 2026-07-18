"use client";

import Link from "next/link";
import { useState } from "react";
import type { FormEvent } from "react";
import type { BookComment } from "@/types";
import { useAuth } from "@/components/ShopProvider";

const API_URL = "http://localhost:8000";

interface CommentSectionProps {
  slug: string;
  initialComments: BookComment[];
}

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
  const { accessToken, user, isAuthReady, logOut } = useAuth();
  const [comments, setComments] = useState(initialComments);
  const [commentText, setCommentText] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
        logOut();
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

  return (
    <section className="mt-8 rounded-xl border bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">دیدگاه کاربران</h2>
          <p className="mt-1 text-sm text-gray-500">
            {comments.length.toLocaleString("fa-IR")} دیدگاه برای این کتاب
          </p>
        </div>

        {user && (
          <span className="text-sm text-gray-500" dir="ltr">
            {user.phone_number}
          </span>
        )}
      </div>

      {!isAuthReady ? (
        <div className="mb-8 rounded-lg bg-gray-50 p-4 text-sm text-gray-500">
          در حال بررسی حساب کاربری...
        </div>
      ) : accessToken ? (
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
          <Link
            href={`/login?next=${encodeURIComponent(`/books/${slug}`)}`}
            className="mt-4 inline-block rounded-lg bg-indigo-600 px-5 py-2 font-semibold text-white hover:bg-indigo-700"
          >
            ورود برای ثبت دیدگاه
          </Link>
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
