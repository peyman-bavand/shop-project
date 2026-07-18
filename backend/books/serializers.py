from typing import Optional

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from .models import Book, BookComment, BookImage


class BookImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = BookImage
        fields = (
            "id",
            "image",
            "is_main",
        )
        read_only_fields = fields


class BookCommentSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

    class Meta:
        model = BookComment
        fields = (
            "id",
            "author",
            "text",
            "created_at",
        )
        read_only_fields = (
            "id",
            "author",
            "created_at",
        )

    @extend_schema_field(serializers.CharField(read_only=True))
    def get_author(self, obj: BookComment) -> str:
        phone_number = obj.user.phone_number

        return (
            f"{phone_number[:4]}"
            f"***"
            f"{phone_number[-4:]}"
        )

    def validate_text(self, value: str) -> str:
        value = value.strip()

        if not value:
            raise serializers.ValidationError(
                "متن دیدگاه نمی‌تواند خالی باشد."
            )

        return value


class BookListSerializer(serializers.ModelSerializer):
    """
    سریالایزر سبک برای نمایش کتاب‌ها در فهرست اصلی.
    """

    main_image = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = (
            "id",
            "title",
            "slug",
            "author",
            "translator",
            "price",
            "stock",
            "cover_type",
            "main_image",
        )

    @extend_schema_field(
        serializers.URLField(
            allow_null=True,
            read_only=True,
        )
    )
    def get_main_image(self, obj: Book) -> Optional[str]:
        main_image = (
            obj.images
            .filter(is_main=True)
            .first()
        )

        if main_image is None:
            main_image = obj.images.first()

        if main_image is None:
            return None

        image_url = main_image.image.url
        request = self.context.get("request")

        if request is not None:
            return request.build_absolute_uri(image_url)

        return image_url


class BookDetailSerializer(serializers.ModelSerializer):
    """
    سریالایزر کامل برای نمایش جزئیات یک کتاب.
    """

    images = BookImageSerializer(
        many=True,
        read_only=True,
    )
    comments = BookCommentSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Book
        fields = (
            "id",
            "title",
            "slug",
            "author",
            "translator",
            "isbn",
            "number_of_pages",
            "publish_year",
            "cover_type",
            "description",
            "price",
            "stock",
            "is_active",
            "images",
            "comments",
            "created_at",
        )
