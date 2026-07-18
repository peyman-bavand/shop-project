from decimal import Decimal

from drf_spectacular.utils import extend_schema_field
from rest_framework import serializers

from books.models import Book

from .models import Cart, CartItem


class CartItemSerializer(serializers.ModelSerializer):
    book_title = serializers.CharField(
        source="book.title",
        read_only=True,
    )
    book_price = serializers.DecimalField(
        source="book.price",
        max_digits=10,
        decimal_places=2,
        read_only=True,
    )
    book_slug = serializers.CharField(
        source="book.slug",
        read_only=True,
    )
    book_author = serializers.CharField(
        source="book.author",
        read_only=True,
    )
    book_image = serializers.ImageField(
        source="book.image",
        read_only=True,
        allow_null=True,
    )
    book_stock = serializers.IntegerField(
        source="book.stock",
        read_only=True,
    )
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = (
            "id",
            "book",
            "book_title",
            "book_price",
            "book_slug",
            "book_author",
            "book_image",
            "book_stock",
            "quantity",
            "subtotal",
        )
        read_only_fields = fields

    @extend_schema_field(
        serializers.DecimalField(
            max_digits=12,
            decimal_places=2,
            read_only=True,
        )
    )
    def get_subtotal(self, obj: CartItem) -> Decimal:
        return obj.book.price * obj.quantity


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(
        many=True,
        read_only=True,
    )
    total_items = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = (
            "id",
            "items",
            "total_items",
            "total_price",
        )
        read_only_fields = fields

    @extend_schema_field(
        serializers.IntegerField(
            min_value=0,
            read_only=True,
        )
    )
    def get_total_items(self, obj: Cart) -> int:
        return sum(
            item.quantity
            for item in obj.items.all()
        )

    @extend_schema_field(
        serializers.DecimalField(
            max_digits=12,
            decimal_places=2,
            read_only=True,
        )
    )
    def get_total_price(self, obj: Cart) -> Decimal:
        return sum(
            (
                item.book.price * item.quantity
                for item in obj.items.all()
            ),
            start=Decimal("0"),
        )


class AddCartItemSerializer(serializers.Serializer):
    book = serializers.PrimaryKeyRelatedField(
        queryset=Book.objects.filter(is_active=True),
        help_text="شناسه کتابی که باید به سبد خرید اضافه شود.",
    )
    quantity = serializers.IntegerField(
        min_value=1,
        help_text="تعداد کتابی که باید به سبد خرید اضافه شود.",
    )

    def validate(self, attrs):
        book = attrs["book"]
        quantity = attrs["quantity"]
        request = self.context["request"]

        cart = getattr(request.user, "cart", None)
        existing_quantity = 0

        if cart is not None:
            existing_item = (
                cart.items
                .filter(book=book)
                .only("quantity")
                .first()
            )

            if existing_item is not None:
                existing_quantity = existing_item.quantity

        requested_total = existing_quantity + quantity

        if requested_total > book.stock:
            raise serializers.ValidationError(
                {
                    "quantity": (
                        "Requested quantity exceeds available stock."
                    )
                }
            )

        return attrs


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(
        min_value=1,
        help_text="تعداد نهایی این کتاب در سبد خرید.",
    )

    def validate_quantity(self, value):
        cart_item = self.instance

        if cart_item is not None and value > cart_item.book.stock:
            raise serializers.ValidationError(
                "Requested quantity exceeds available stock."
            )

        return value


class CartErrorSerializer(serializers.Serializer):
    detail = serializers.CharField(
        help_text="توضیح خطای رخ‌داده.",
    )


class CartValidationErrorSerializer(serializers.Serializer):
    detail = serializers.CharField(
        required=False,
        help_text="توضیح کلی خطای اعتبارسنجی.",
    )
    book = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="خطاهای مربوط به شناسه کتاب.",
    )
    quantity = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="خطاهای مربوط به تعداد کتاب.",
    )
    non_field_errors = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        help_text="خطاهای عمومی اعتبارسنجی.",
    )
