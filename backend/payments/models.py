from django.db import models


class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        SUCCESSFUL = "successful", "Successful"
        FAILED = "failed", "Failed"
        CANCELED = "canceled", "Canceled"

    order = models.ForeignKey(
        "orders.Order",
        on_delete=models.PROTECT,
        related_name="payments",
    )
    amount = models.PositiveBigIntegerField()

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )

    gateway = models.CharField(
        max_length=50,
        db_index=True,
    )

    authority = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        unique=True,
    )

    reference_id = models.CharField(
        max_length=100,
        null=True,
        blank=True,
        unique=True,
    )

    gateway_response = models.JSONField(
        default=dict,
        blank=True,
    )

    error_message = models.TextField(
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at",)

    def __str__(self):
        return (
            f"Payment #{self.pk} | "
            f"order={self.order_id} | "
            f"status={self.status}"
        )
