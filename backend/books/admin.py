from django.contrib import admin
from .models import Book, BookComment, BookImage

class BookImageInline(admin.TabularInline):
    model = BookImage
    extra = 1  # تعداد فرم‌های خالی پیش‌فرض برای آپلود تصویر جدید


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    # فیلدهایی که در لیست اصلی ادمین نشان داده می‌شوند
    list_display = ('title', 'author', 'price', 'stock', 'cover_type', 'is_active', 'created_at')
    
    # فیلدهایی که با کلیک روی آن‌ها می‌توان وضعیت را تغییر داد
    list_editable = ('price', 'stock', 'is_active')
    
    # فیلترهای سایدبار سمت راست
    list_filter = ('is_active', 'cover_type', 'created_at')
    
    # فیلدهای قابل جستجو
    search_fields = ('title', 'author', 'translator', 'isbn')
    
    # پر شدن خودکار اسلاگ بر اساس عنوان کتاب (فقط برای فیلدهای انگلیسی خوب کار می‌کند، برای فارسی دستی وارد شود بهتر است یا با Slugify فارسی)
    prepopulated_fields = {'slug': ('title',)}
    
    # اضافه کردن بخش تصاویر به صفحه ویرایش کتاب
    inlines = [BookImageInline]


@admin.register(BookComment)
class BookCommentAdmin(admin.ModelAdmin):
    list_display = ("book", "user", "created_at")
    list_filter = ("created_at",)
    search_fields = ("book__title", "user__phone_number", "text")
    readonly_fields = ("book", "user", "text", "created_at")
