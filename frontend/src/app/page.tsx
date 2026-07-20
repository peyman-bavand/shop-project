import Image from "next/image";
import Link from "next/link";
import { BookList } from "@/types";

const INTERNAL_API_URL = "http://backend:8000";
const PUBLIC_BACKEND_URL = "http://localhost:8000";

async function getBooks(): Promise<BookList[]> {
  const response = await fetch(`${INTERNAL_API_URL}/api/books/`, {
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();

    throw new Error(
      `خطا در دریافت لیست کتاب‌ها: ${response.status} ${body}`,
    );
  }

  return response.json();
}

/**
 * آدرس داخلی Docker را به آدرسی تبدیل می‌کند که مرورگر کاربر
 * بتواند از طریق localhost به آن دسترسی داشته باشد.
 */
function getPublicImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) {
    return null;
  }

  if (imageUrl.startsWith(INTERNAL_API_URL)) {
    return imageUrl.replace(INTERNAL_API_URL, PUBLIC_BACKEND_URL);
  }

  if (imageUrl.startsWith("/")) {
    return `${PUBLIC_BACKEND_URL}${imageUrl}`;
  }

  return imageUrl;
}

function formatPrice(price: number | string): string {
  const numericPrice =
    typeof price === "number" ? price : Number.parseFloat(price);

  if (Number.isNaN(numericPrice)) {
    return String(price);
  }

  return numericPrice.toLocaleString("fa-IR");
}

export default async function HomePage() {
  const books = await getBooks();

  return (
    <main className="container mx-auto px-4 py-8" dir="rtl">
      <header className="mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold text-gray-800">
          کتاب‌های انتشارات ما
        </h1>

        <p className="mt-2 text-gray-500">جدیدترین آثار منتشرشده</p>
      </header>

      {books.length === 0 ? (
        <p className="py-12 text-center text-gray-500">
          هنوز کتابی در فروشگاه ثبت نشده است.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {books.map((book) => {
            const imageUrl = getPublicImageUrl(book.main_image);

            return (
              <article
                key={book.id}
                className="flex h-full flex-col overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="relative flex aspect-[2/3] w-full items-center justify-center bg-gray-100 p-4">
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={`تصویر جلد ${book.title}`}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-contain p-4"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      بدون تصویر جلد
                    </div>
                  )}
                </div>

                <div className="flex flex-grow flex-col p-4">
                  <h2 className="mb-1 line-clamp-1 text-lg font-semibold text-gray-900">
                    {book.title}
                  </h2>

                  <p className="mb-2 text-sm text-gray-600">
                    اثر: {book.author}
                  </p>

                  {book.translator && (
                    <p className="mb-4 text-xs text-gray-500">
                      مترجم: {book.translator}
                    </p>
                  )}

                  <div className="mt-auto flex items-center justify-between gap-3 border-t pt-4">
                    <span className="font-bold text-emerald-600">
                      {formatPrice(book.price)} تومان
                    </span>

                    <Link
                      href={`/books/${book.slug}`}
                      className="shrink-0 rounded bg-indigo-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-indigo-700"
                    >
                     مشاهده کتاب
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
