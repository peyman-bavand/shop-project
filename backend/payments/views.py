import logging
from urllib.parse import urlencode

from django.conf import settings
from django.db import transaction
from django.shortcuts import redirect
from django.urls import reverse
from django.utils import timezone

from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from cart.models import Cart, CartItem
from orders.models import Order

from .gateways import get_payment_gateway
from .models import Payment
from .serializers import (
    CreatePaymentResponseSerializer,
    CreatePaymentSerializer,
    PaymentSerializer,
)

logger = logging.getLogger(__name__)


def build_frontend_payment_result_url(**params):
    frontend_base_url = getattr(
        settings,
        "FRONTEND_BASE_URL",
        "http://localhost:3000",
    ).rstrip("/")

    query_string = urlencode(
        {
            key: value
            for key, value in params.items()
            if value is not None
        }
    )

    return f"{frontend_base_url}/payment/result?{query_string}"


class PaymentCallbackView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        authority = request.query_params.get("authority", "").strip()
        gateway_status = request.query_params.get("status", "").strip().upper()

        if not authority:
            redirect_url = build_frontend_payment_result_url(
                status="failed",
                reason="missing_authority",
                message="Payment authority is required.",
            )
            return redirect(redirect_url)

        with transaction.atomic():
            payment = (
                Payment.objects.select_for_update()
                .select_related("order")
                .filter(authority=authority)
                .first()
            )

            if payment is None:
                redirect_url = build_frontend_payment_result_url(
                    status="failed",
                    reason="payment_not_found",
                    authority=authority,
                    message="Payment not found.",
                )
                return redirect(redirect_url)

            if payment.status == Payment.Status.SUCCESSFUL:
                redirect_url = build_frontend_payment_result_url(
                    status="success",
                    reason="already_verified",
                    payment_id=payment.id,
                    order_id=payment.order_id,
                    reference_id=payment.reference_id,
                    authority=payment.authority,
                    message="Payment has already been verified.",
                )
                return redirect(redirect_url)

            if payment.status != Payment.Status.PENDING:
                redirect_url = build_frontend_payment_result_url(
                    status="failed",
                    reason="payment_not_pending",
                    payment_id=payment.id,
                    order_id=payment.order_id,
                    authority=payment.authority,
                    message="Payment is not pending.",
                )
                return redirect(redirect_url)

            if gateway_status != "OK":
                payment.status = Payment.Status.CANCELED
                payment.error_message = "Payment was canceled by the user."
                payment.gateway_response = {
                    **(payment.gateway_response or {}),
                    "callback": {
                        "authority": authority,
                        "status": gateway_status,
                    },
                }
                payment.save(
                    update_fields=[
                        "status",
                        "error_message",
                        "gateway_response",
                        "updated_at",
                    ]
                )

                redirect_url = build_frontend_payment_result_url(
                    status="canceled",
                    reason="user_canceled",
                    payment_id=payment.id,
                    order_id=payment.order_id,
                    authority=payment.authority,
                    message="Payment was canceled.",
                )
                return redirect(redirect_url)

            gateway = get_payment_gateway()

            if payment.gateway != gateway.name:
                redirect_url = build_frontend_payment_result_url(
                    status="failed",
                    reason="gateway_mismatch",
                    payment_id=payment.id,
                    order_id=payment.order_id,
                    authority=payment.authority,
                    message="Payment gateway mismatch.",
                )
                return redirect(redirect_url)

            verification_result = gateway.verify_payment(
                amount=int(payment.amount),
                authority=payment.authority,
            )

            payment.gateway_response = {
                **(payment.gateway_response or {}),
                "verification": verification_result.raw_response,
            }

            if not verification_result.success:
                payment.status = Payment.Status.FAILED
                payment.error_message = verification_result.error_message
                payment.save(
                    update_fields=[
                        "status",
                        "error_message",
                        "gateway_response",
                        "updated_at",
                    ]
                )

                redirect_url = build_frontend_payment_result_url(
                    status="failed",
                    reason="verification_failed",
                    payment_id=payment.id,
                    order_id=payment.order_id,
                    authority=payment.authority,
                    message=verification_result.error_message,
                )
                return redirect(redirect_url)

            payment.status = Payment.Status.SUCCESSFUL
            payment.reference_id = verification_result.reference_id
            payment.error_message = ""
            payment.paid_at = timezone.now()
            payment.save(
                update_fields=[
                    "status",
                    "reference_id",
                    "error_message",
                    "gateway_response",
                    "paid_at",
                    "updated_at",
                ]
            )

            order = payment.order
            order.status = Order.Status.PAID
            order.paid_at = payment.paid_at
            order.save(
                update_fields=[
                    "status",
                    "paid_at",
                    "updated_at",
                ]
            )

            # خالی کردن سبد خرید بعد از پرداخت موفق
            cart = Cart.objects.filter(user=order.user).first()
            if cart:
                CartItem.objects.filter(cart=cart).delete()

            redirect_url = build_frontend_payment_result_url(
                status="success",
                reason="verified",
                payment_id=payment.id,
                order_id=order.id,
                reference_id=payment.reference_id,
                authority=payment.authority,
                message="Payment verified successfully.",
            )
            return redirect(redirect_url)


class CreatePaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreatePaymentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        order_id = serializer.validated_data["order_id"]

        with transaction.atomic():
            order = (
                Order.objects.select_for_update()
                .filter(pk=order_id, user=request.user)
                .first()
            )

            if order is None:
                return Response(
                    {"detail": "Order not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )

            if order.status != "pending_payment":
                return Response(
                    {"detail": "Order is not ready for payment."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            existing_payment = order.payments.filter(
                status__in=[Payment.Status.PENDING, Payment.Status.SUCCESSFUL]
            ).first()

            if existing_payment is not None:
                return Response(
                    {
                        "detail": "A payment already exists for this order.",
                        "payment": PaymentSerializer(existing_payment).data,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            gateway = get_payment_gateway()
            callback_url = request.build_absolute_uri(
                reverse("payments:callback")
            )

            payment = Payment.objects.create(
                order=order,
                amount=order.total_amount,
                gateway=gateway.name,
                status=Payment.Status.PENDING,
            )

            request_result = gateway.request_payment(
                amount=int(payment.amount),
                callback_url=callback_url,
                description=f"Payment for order #{order.id}",
            )

            if not request_result.success:
                payment.status = Payment.Status.FAILED
                payment.error_message = request_result.error_message
                payment.gateway_response = request_result.raw_response
                payment.save(
                    update_fields=[
                        "status",
                        "error_message",
                        "gateway_response",
                        "updated_at",
                    ]
                )

                return Response(
                    {
                        "detail": request_result.error_message,
                        "payment": PaymentSerializer(payment).data,
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            payment.authority = request_result.authority
            payment.gateway_response = request_result.raw_response
            payment.save(
                update_fields=[
                    "authority",
                    "gateway_response",
                    "updated_at",
                ]
            )

            response_data = {
                "payment": payment,
                "payment_url": request_result.payment_url,
            }
            response_serializer = CreatePaymentResponseSerializer(response_data)

            return Response(
                response_serializer.data,
                status=status.HTTP_201_CREATED,
            )
