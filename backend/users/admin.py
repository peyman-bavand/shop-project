from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import OTPCode, User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    ordering = ("id",)
    list_display = ("id", "phone_number", "is_staff", "is_active", "is_phone_verified")
    search_fields = ("phone_number",)
    readonly_fields = ("date_joined", "last_login")

    fieldsets = (
        (None, {"fields": ("phone_number", "password")}),
        ("Status", {"fields": ("is_active", "is_staff", "is_superuser", "is_phone_verified")}),
        ("Permissions", {"fields": ("groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined")}),
    )

    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("phone_number", "password1", "password2", "is_staff", "is_active"),
        }),
    )

    filter_horizontal = ("groups", "user_permissions")


@admin.register(OTPCode)
class OTPCodeAdmin(admin.ModelAdmin):
    list_display = ("id", "phone_number", "code", "created_at", "expires_at", "is_used", "attempts")
    search_fields = ("phone_number",)
