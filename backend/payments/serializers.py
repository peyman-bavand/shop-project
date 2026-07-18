from rest_framework import serializers

from .models import Payment


class CreatePaymentSerializer(serializers.Serializer):
    order_id = serializers.IntegerField(
        min_value=1,
        help_text="ID of the order to be paid.",
    )


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = (
            "id",
            "order",
            "amount",
            "status",
            "gateway",
            "authority",
            "reference_id",
            "error_message",
            "created_at",
            "updated_at",
            "paid_at",
        )
        read_only_fields = fields


class CreatePaymentResponseSerializer(serializers.Serializer):
    payment = PaymentSerializer(read_only=True)
    payment_url = serializers.URLField(read_only=True)
