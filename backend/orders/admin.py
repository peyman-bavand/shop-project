from django.contrib import admin

from .models import Order, OrderItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ("product_title", "unit_price", "quantity", "line_total")
    can_delete = False


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "user",
        "status",
        "total_amount",
        "created_at",
        "paid_at",
    )
    list_filter = ("status", "created_at", "paid_at")
    search_fields = ("id", "user__username", "user__email")
    readonly_fields = (
        "subtotal",
        "discount_amount",
        "shipping_amount",
        "total_amount",
        "created_at",
        "updated_at",
        "paid_at",
    )
    inlines = [OrderItemInline]


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "order",
        "product_title",
        "quantity",
        "unit_price",
        "line_total",
    )
    list_filter = ("order__status",)
    search_fields = ("product_title", "order__id")
    readonly_fields = ("line_total",)
