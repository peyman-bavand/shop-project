from django.conf import settings
from django.db import models

class Book(models.Model):
    COVER_TYPES = [
        ('hardback', 'گالینگور (جلد سخت)'),
        ('paperback', 'شومیز (جلد نرم)'),
        ('pocket', 'جیبی'),
    ]

    title = models.CharField(max_length=255, verbose_name="عنوان کتاب")
    slug = models.SlugField(unique=True, allow_unicode=True, verbose_name="اسلاگ")
    
    # نویسنده و مترجم به عنوان فیلد متنی ساده
    author = models.CharField(max_length=255, verbose_name="نویسنده / پدیدآورنده")
    translator = models.CharField(max_length=255, blank=True, null=True, verbose_name="مترجم")
    
    # مشخصات کتاب‌شناختی
    isbn = models.CharField(max_length=13, unique=True, verbose_name="شابک (ISBN)")
    number_of_pages = models.PositiveIntegerField(verbose_name="تعداد صفحات")
    publish_year = models.PositiveIntegerField(verbose_name="سال انتشار (شمسی)")
    cover_type = models.CharField(max_length=20, choices=COVER_TYPES, default='paperback', verbose_name="نوع جلد")
    
    # اطلاعات فروشگاهی پایه
    description = models.TextField(blank=True, verbose_name="خلاصه/توضیحات کتاب")
    price = models.DecimalField(max_digits=12, decimal_places=0, verbose_name="قیمت (تومان)")
    stock = models.PositiveIntegerField(default=0, verbose_name="موجودی انبار")
    is_active = models.BooleanField(default=True, verbose_name="وضعیت انتشار در سایت")
    
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ثبت")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="تاریخ بروزرسانی")

    class Meta:
        verbose_name = "کتاب"
        verbose_name_plural = "کتاب‌ها"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.author}"


class BookImage(models.Model):
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="images", verbose_name="کتاب")
    image = models.ImageField(upload_to="books/", verbose_name="تصویر جلد")
    is_main = models.BooleanField(default=False, verbose_name="تصویر اصلی جلد")

    class Meta:
        verbose_name = "تصویر کتاب"
        verbose_name_plural = "تصاویر کتاب‌ها"


class BookComment(models.Model):
    book = models.ForeignKey(
        Book,
        on_delete=models.CASCADE,
        related_name="comments",
        verbose_name="کتاب",
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="book_comments",
        verbose_name="کاربر",
    )
    text = models.TextField(max_length=1000, verbose_name="متن دیدگاه")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="تاریخ ثبت")

    class Meta:
        verbose_name = "دیدگاه کتاب"
        verbose_name_plural = "دیدگاه‌های کتاب"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} - {self.book}"
