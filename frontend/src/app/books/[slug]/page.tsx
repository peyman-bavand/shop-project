import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { BookDetail } from "@/types";
import CommentSection from "./CommentSection";
import AddToCartButton from "@/components/AddToCartButton";

const INTERNAL_API_URL = "http://backend:8000";
const PUBLIC_BACKEND_URL = "http://localhost:8000";

async function getBookDetail(slug: string): Promise<BookDetail | null> {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/books/${slug}/`, {
      cache: "no-store",
    });

    if (res.status === 404) {
      console.log(`[GET_BOOK_DETAIL] Book not found (404) for slug: ${slug}`);
      return null;
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[GET_BOOK_DETAIL] API error: ${res.status} - ${errorText}`);
      throw new Error("خطا در دریافت اطلاعات کتاب");
    }

    return res.json();
  } catch (error) {
    console.error(`[GET_BOOK_DETAIL] Fetch failed for slug: ${slug}`, error);
    throw error;
  }
}

function getPublicImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith(INTERNAL_API_URL)) {
    return imageUrl.replace(INTERNAL_API_URL, PUBLIC_BACKEND_URL);
  }
  if (imageUrl.startsWith("/")) {
    return `${PUBLIC_BACKEND_URL}${imageUrl}`;
  }
  return imageUrl;
}

function formatPrice(price: number | string): string {
  const numericPrice = typeof price === "number" ? price : Number(price);
  if (isNaN(numericPrice)) return String(price);
  return numericPrice.toLocaleString("fa-IR");
}

interface Props {
  params: any; // برای پیشگیری از تداخل تایپ‌اسکریپت بین نسخه‌های مختلف Next.js
}

export default async function BookDetailPage({ params }: Props) {
  // حل مشکل احتمالی ناهمگام بودن params در نسخه‌های مختلف Next.js
  const resolvedParams = params instanceof Promise ? await params : params;
  const { slug } = resolvedParams || {};

  console.log(`[BOOK_DETAIL_PAGE] Rendering page for slug: ${slug}`);

  if (!slug) {
    console.warn("[BOOK_DETAIL_PAGE] No slug provided in params");
    notFound();
  }

  const book = await getBookDetail(slug);

  if (!book) {
    notFound();
  }

  const rawMainImage =
    book.images?.find((img) => img.is_main)?.image || book.images?.[0]?.image;
  const mainImage = getPublicImageUrl(rawMainImage);
  console.log("[BOOK_DETAIL_PAGE] rawMainImage:", rawMainImage);
  console.log("[BOOK_DETAIL_PAGE] mainImage:", mainImage);
  

  return (
    <main className="container mx-auto px-4 py-8" dir="rtl">
      <Link
        href="/"
        className="mb-6 inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-800"
      >
        ← بازگشت به لیست کتاب‌ها
      </Link>

      <div className="grid grid-cols-1 gap-8 rounded-xl border bg-white p-6 shadow-sm md:grid-cols-12">
        {/* تصویر جلد */}
        <div className="flex flex-col gap-4 md:col-span-4">
          <div className="relative flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded-lg border bg-gray-50 p-4">
            {mainImage ? (
              <Image
                src={mainImage}
                alt={book.title}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-contain p-4"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-gray-400">
                بدون تصویر جلد
              </div>
            )}
          </div>

          {/* گالری تصاویر کوچک */}
          {book.images && book.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {book.images.map((img) => {
                const thumbUrl = getPublicImageUrl(img.image);
                if (!thumbUrl) return null;
                return (
                  <div
                    key={img.id}
                    className="relative flex aspect-[2/3] items-center justify-center overflow-hidden rounded border bg-gray-50 p-1"
                  >
                    <Image
                      src={thumbUrl}
                      alt="تصویر جانبی کتاب"
                      fill
                      sizes="25vw"
                      className="object-contain p-1"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* اطلاعات کتاب */}
        <div className="md:col-span-8 flex flex-col justify-between">
          <div>
            <h1 className="mb-4 text-3xl font-bold text-gray-900">
              {book.title}
            </h1>

            <div className="mb-6 space-y-2">
              <p className="text-lg text-gray-700">
                نویسنده: <span className="font-semibold text-gray-950">{book.author}</span>
              </p>
              {book.translator && (
                <p className="text-md text-gray-600">
                  مترجم:{" "}
                  <span className="font-semibold text-gray-950">
                    {book.translator}
                  </span>
                </p>
              )}
            </div>

            <div className="my-6 grid grid-cols-2 gap-4 rounded-lg bg-gray-50 p-4 text-sm text-gray-600 sm:grid-cols-3">
              <div>
                شابک:{" "}
                <span className="font-semibold text-gray-900">
                  {book.isbn || "ثبت نشده"}
                </span>
              </div>
              <div>
                تعداد صفحات:{" "}
                <span className="font-semibold text-gray-900">
                  {book.number_of_pages || "ثبت نشده"}
                </span>
              </div>
              <div>
                سال انتشار:{" "}
                <span className="font-semibold text-gray-900">
                  {book.publish_year || "ثبت نشده"}
                </span>
              </div>
              <div>
                نوع جلد:{" "}
                <span className="font-semibold text-gray-900">
                  {book.cover_type === "hardback"
                    ? "گالینگور"
                    : book.cover_type === "pocket"
                      ? "جیبی"
                      : "شومیز"}
                </span>
              </div>
              <div>
                وضعیت انبار:{" "}
                <span
                  className={`font-semibold ${book.stock > 0 ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {book.stock > 0 ? `موجود (${book.stock} عدد)` : "ناموجود"}
                </span>
              </div>
            </div>

            <div className="prose mb-6 max-w-none leading-relaxed text-gray-700">
              <h3 className="mb-2 border-b pb-2 text-lg font-bold text-gray-900">
                درباره کتاب:
              </h3>
              <p className="whitespace-pre-line">
                {book.description || "توضیحاتی برای این کتاب ثبت نشده است."}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between border-t pt-6">
            <div>
              <span className="mb-1 block text-xs text-gray-500">
                قیمت نهایی
              </span>
              <span className="text-2xl font-bold text-emerald-600">
                {formatPrice(book.price)} تومان
              </span>
            </div>

            <AddToCartButton
              product={{
                bookId: book.id,
                slug: book.slug,
                title: book.title,
                author: book.author,
                price: book.price,
                stock: book.stock,
                image: mainImage,
              }}
            />
          </div>
        </div>
      </div>

      <CommentSection slug={book.slug} initialComments={book.comments || []} />
    </main>
  );
}
