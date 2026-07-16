from rest_framework import serializers
from .models import Book, BookComment, BookImage

class BookImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookImage
        fields = ['id', 'image', 'is_main']


class BookCommentSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

    class Meta:
        model = BookComment
        fields = ["id", "author", "text", "created_at"]
        read_only_fields = ["id", "author", "created_at"]

    def get_author(self, obj):
        phone_number = obj.user.phone_number
        return f"{phone_number[:4]}***{phone_number[-4:]}"

    def validate_text(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("متن دیدگاه نمی‌تواند خالی باشد.")
        return value


class BookListSerializer(serializers.ModelSerializer):
    """سریالایزر سبک برای نمایش کتاب‌ها در لیست اصلی (کاهش حجم داده انتقال یافته)"""
    main_image = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = [
            'id', 'title', 'slug', 'author', 'translator', 
            'price', 'stock', 'cover_type', 'main_image'
        ]

    def get_main_image(self, obj):
        # پیدا کردن تصویر اصلی، یا اولین تصویر موجود
        main_img = obj.images.filter(is_main=True).first()
        if not main_img:
            main_img = obj.images.first()
        if main_img:
            # بازگرداندن آدرس کامل تصویر
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(main_img.image.url)
            return main_img.image.url
        return None


class BookDetailSerializer(serializers.ModelSerializer):
    """سریالایزر کامل برای نمایش جزئیات یک کتاب تک"""
    images = BookImageSerializer(many=True, read_only=True)
    comments = BookCommentSerializer(many=True, read_only=True)

    class Meta:
        model = Book
        fields = [
            'id', 'title', 'slug', 'author', 'translator', 
            'isbn', 'number_of_pages', 'publish_year', 
            'cover_type', 'description', 'price', 'stock', 
            'is_active', 'images', 'comments', 'created_at'
        ]
