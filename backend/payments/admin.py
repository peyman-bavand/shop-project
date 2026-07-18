from django.contrib import admin

from .models import Payment


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "order",
        "amount",
        "gateway",
        "status",
        "authority",
        "reference_id",
        "created_at",
        "paid_at",
    )
    list_filter = (
        "status",
        "gateway",
        "created_at",
        "paid_at",
    )
    search_fields = (
        "id",
        "order__id",
        "order__user__phone_number",
        "authority",
        "reference_id",
    )
    readonly_fields = (
        "created_at",
        "updated_at",
        "paid_at",
        "gateway_response",
    )
    ordering = ("-created_at",)
    list_select_related = ("order",)
