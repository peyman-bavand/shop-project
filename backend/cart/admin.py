from django.contrib import admin
from .models import Cart, CartItem

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "created_at", "updated_at")
    search_fields = ("user__id", "user__phone_number", "user__username")
    list_select_related = ("user",)

@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ("id", "cart", "book", "quantity", "updated_at")
    search_fields = ("book__title", "cart__user__id")
    list_select_related = ("cart", "book")
    list_filter = ("updated_at",)
