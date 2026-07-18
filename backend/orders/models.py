from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models

from books.models import Book


class Order(models.Model):
    class Status(models.TextChoices):
        PENDING_PAYMENT = "pending_payment", "در انتظار پرداخت"
        PAID = "paid", "پرداخت‌شده"
        PROCESSING = "processing", "در حال پردازش"
        SHIPPED = "shipped", "ارسال‌شده"
        DELIVERED = "delivered", "تحویل‌شده"
        CANCELED = "canceled", "لغوشده"
        EXPIRED = "expired", "منقضی‌شده"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="orders",
        verbose_name="کاربر",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING_PAYMENT,
        db_index=True,
        verbose_name="وضعیت سفارش",
    )
    subtotal = models.DecimalField(
        max_digits=14,
        decimal_places=0,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="جمع اقلام (تومان)",
    )
    discount_amount = models.DecimalField(
        max_digits=14,
        decimal_places=0,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="مبلغ تخفیف (تومان)",
    )
    shipping_amount = models.DecimalField(
        max_digits=14,
        decimal_places=0,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="هزینه ارسال (تومان)",
    )
    total_amount = models.DecimalField(
        max_digits=14,
        decimal_places=0,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="مبلغ نهایی (تومان)",
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="تاریخ ثبت",
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="تاریخ بروزرسانی",
    )
    paid_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="تاریخ پرداخت",
    )

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "سفارش"
        verbose_name_plural = "سفارش‌ها"

    def __str__(self):
        return f"Order #{self.pk} - {self.user_id} - {self.status}"


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="سفارش",
    )
    book = models.ForeignKey(
        Book,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_items",
        verbose_name="کتاب",
    )
    product_title = models.CharField(
        max_length=255,
        verbose_name="عنوان کتاب هنگام سفارش",
    )
    unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=0,
        validators=[MinValueValidator(0)],
        verbose_name="قیمت واحد هنگام سفارش (تومان)",
    )
    quantity = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        verbose_name="تعداد",
    )
    line_total = models.DecimalField(
        max_digits=14,
        decimal_places=0,
        validators=[MinValueValidator(0)],
        verbose_name="جمع ردیف (تومان)",
    )

    class Meta:
        ordering = ["id"]
        verbose_name = "قلم سفارش"
        verbose_name_plural = "اقلام سفارش"
        constraints = [
            models.UniqueConstraint(
                fields=["order", "book"],
                name="unique_order_book",
            ),
        ]

    def __str__(self):
        return (
            f"Order #{self.order_id} - "
            f"{self.product_title} x {self.quantity}"
        )
