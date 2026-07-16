import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { BookDetail } from '@/types';
import CommentSection from './CommentSection';

const INTERNAL_API_URL = "http://backend:8000";
const PUBLIC_BACKEND_URL = "http://localhost:8000";

async function getBookDetail(slug: string): Promise<BookDetail | null> {
  try {
    const res = await fetch(`${INTERNAL_API_URL}/api/books/${slug}/`, {
      cache: 'no-store',
    });

    if (res.status === 404) {
      console.log(`[GET_BOOK_DETAIL] Book not found (404) for slug: ${slug}`);
      return null;
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`[GET_BOOK_DETAIL] API error: ${res.status} - ${errorText}`);
      throw new Error('خطا در دریافت اطلاعات کتاب');
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
  const numericPrice = typeof price === 'number' ? price : Number(price);
  if (isNaN(numericPrice)) return String(price);
  return numericPrice.toLocaleString('fa-IR');
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

  let book: BookDetail | null = null;
  try {
    book = await getBookDetail(slug);
  } catch (e) {
    console.error("[BOOK_DETAIL_PAGE] Error fetching book data, routing to notFound", e);
    notFound();
  }

  if (!book) {
    notFound();
  }

  const rawMainImage = book.images?.find(img => img.is_main)?.image || book.images?.[0]?.image;
  const mainImage = getPublicImageUrl(rawMainImage);

  return (
    <main className="container mx-auto px-4 py-8" dir="rtl">
      <Link href="/" className="text-indigo-600 hover:text-indigo-800 text-sm mb-6 inline-block font-semibold">
        ← بازگشت به لیست کتاب‌ها
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 bg-white p-6 rounded-xl border shadow-sm">
        {/* تصویر جلد */}
        <div className="md:col-span-4 flex flex-col gap-4">
          <div className="flex aspect-[2/3] w-full items-center justify-center bg-gray-50 border rounded-lg overflow-hidden p-4">
            {mainImage ? (
              <img
                src={mainImage}
                alt={book.title}
                className="h-full w-full object-contain"
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
                  <div key={img.id} className="flex aspect-[2/3] border rounded overflow-hidden bg-gray-50 p-1 items-center justify-center">
                    <img
                      src={thumbUrl}
                      alt="تصویر جانبی کتاب"
                      className="h-full w-full object-contain"
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
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{book.title}</h1>
            
            <div className="space-y-2 mb-6">
              <p className="text-lg text-gray-700">نویسنده: <span className="font-semibold text-gray-950">{book.author}</span></p>
              {book.translator && (
                <p className="text-md text-gray-600">مترجم: <span className="font-semibold text-gray-950">{book.translator}</span></p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 my-6 p-4 bg-gray-50 rounded-lg text-sm text-gray-600">
              <div>شابک: <span className="font-semibold text-gray-900">{book.isbn || 'ثبت نشده'}</span></div>
              <div>تعداد صفحات: <span className="font-semibold text-gray-900">{book.number_of_pages || 'ثبت نشده'}</span></div>
              <div>سال انتشار: <span className="font-semibold text-gray-900">{book.publish_year || 'ثبت نشده'}</span></div>
              <div>نوع جلد: <span className="font-semibold text-gray-900">{
                book.cover_type === 'hardback' ? 'گالینگور' : 
                book.cover_type === 'pocket' ? 'جیبی' : 'شومیز'
              }</span></div>
              <div>وضعیت انبار: <span className={`font-semibold ${book.stock > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {book.stock > 0 ? `موجود (${book.stock} عدد)` : 'ناموجود'}
              </span></div>
            </div>

            <div className="prose max-w-none text-gray-700 leading-relaxed mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2 border-b pb-2">درباره کتاب:</h3>
              <p className="whitespace-pre-line">{book.description || 'توضیحاتی برای این کتاب ثبت نشده است.'}</p>
            </div>
          </div>

          <div className="border-t pt-6 flex items-center justify-between">
            <div>
              <span className="text-xs text-gray-500 block mb-1">قیمت نهایی</span>
              <span className="text-2xl font-bold text-emerald-600">
                {formatPrice(book.price)} تومان
              </span>
            </div>

            <button 
              disabled={book.stock === 0}
              className={`px-8 py-3 rounded-lg font-bold text-white transition-colors ${
                book.stock > 0 
                  ? 'bg-indigo-600 hover:bg-indigo-700 shadow-sm' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {book.stock > 0 ? 'افزودن به سبد خرید' : 'ناموجود'}
            </button>
          </div>
        </div>
      </div>

      <CommentSection slug={book.slug} initialComments={book.comments || []} />
    </main>
  );
}
