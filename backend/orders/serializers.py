from rest_framework import serializers

from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = (
            "id",
            "book",
            "product_title",
            "unit_price",
            "quantity",
            "line_total",
        )
        read_only_fields = fields


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(
        many=True,
        read_only=True,
    )

    class Meta:
        model = Order
        fields = (
            "id",
            "user",
            "status",
            "subtotal",
            "discount_amount",
            "shipping_amount",
            "total_amount",
            "created_at",
            "updated_at",
            "paid_at",
            "items",
        )
        read_only_fields = fields


class CheckoutItemErrorSerializer(serializers.Serializer):
    book_id = serializers.IntegerField(
        min_value=1,
        help_text="شناسه کتابی که در فرایند ثبت سفارش خطا ایجاد کرده است.",
    )
    title = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="عنوان کتاب.",
    )
    requested_quantity = serializers.IntegerField(
        required=False,
        min_value=1,
        help_text="تعداد درخواستی کتاب.",
    )
    available_stock = serializers.IntegerField(
        required=False,
        min_value=0,
        help_text="موجودی فعلی کتاب.",
    )
    detail = serializers.CharField(
        help_text="توضیح خطای مربوط به این آیتم.",
    )


class CheckoutErrorSerializer(serializers.Serializer):
    detail = serializers.CharField(
        help_text="توضیح کلی خطای ثبت سفارش.",
    )
    items = CheckoutItemErrorSerializer(
        many=True,
        required=False,
        help_text="فهرست آیتم‌هایی که مانع ثبت سفارش شده‌اند.",
    )


class ErrorSerializer(serializers.Serializer):
    detail = serializers.CharField(
        help_text="توضیح خطای رخ‌داده.",
    )
