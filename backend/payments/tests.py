from copy import deepcopy

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from orders.models import Order
from payments.models import Payment


User = get_user_model()


class PaymentTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            phone_number="09120000000",
        )
        self.client.force_authenticate(user=self.user)

        self.order = Order.objects.create(
            user=self.user,
            total_amount=150000,
            status="pending_payment",
        )

        self.create_url = reverse("payments:create")
        self.callback_url = reverse("payments:callback")

    def create_payment(self):
        """ایجاد پرداخت معتبر از طریق endpoint واقعی پرداخت."""
        response = self.client.post(
            self.create_url,
            {"order_id": self.order.id},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
            response.data,
        )

        return Payment.objects.get(order=self.order)

    def test_create_payment_success(self):
        """پرداخت برای سفارش آماده پرداخت با موفقیت ایجاد می‌شود."""
        response = self.client.post(
            self.create_url,
            {"order_id": self.order.id},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_201_CREATED,
            response.data,
        )
        self.assertIn("payment_url", response.data)
        self.assertEqual(Payment.objects.count(), 1)

        payment = Payment.objects.get(order=self.order)

        self.assertEqual(payment.status, "pending")
        self.assertEqual(payment.amount, self.order.total_amount)
        self.assertTrue(payment.authority)
        self.assertTrue(payment.authority.startswith("FAKE-"))

        self.assertIn("amount", payment.gateway_response)
        self.assertEqual(payment.gateway_response["amount"], 150000)
        self.assertIsInstance(payment.gateway_response["amount"], int)

    def test_payment_callback_success(self):
        """callback موفق، وضعیت پرداخت و سفارش را به‌روزرسانی می‌کند."""
        payment = self.create_payment()

        response = self.client.get(
            self.callback_url,
            {
                "authority": payment.authority,
                "status": "OK",
            },
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_200_OK,
            response.data,
        )

        payment.refresh_from_db()
        self.order.refresh_from_db()

        self.assertEqual(payment.status, "successful")
        self.assertTrue(payment.reference_id)
        self.assertIsNotNone(payment.paid_at)

        self.assertEqual(self.order.status, "paid")
        self.assertIsNotNone(self.order.paid_at)
        self.assertEqual(self.order.paid_at, payment.paid_at)

        self.assertIn("verification", payment.gateway_response)
        self.assertTrue(
            payment.gateway_response["verification"]["verified"],
        )

    def test_callback_idempotency(self):
        """callback تکراری نباید پرداخت را دوباره تأیید کند."""
        payment = self.create_payment()

        first_response = self.client.get(
            self.callback_url,
            {
                "authority": payment.authority,
                "status": "OK",
            },
        )

        self.assertEqual(
            first_response.status_code,
            status.HTTP_200_OK,
            first_response.data,
        )

        payment.refresh_from_db()
        self.order.refresh_from_db()

        original_reference_id = payment.reference_id
        original_payment_paid_at = payment.paid_at
        original_order_paid_at = self.order.paid_at
        original_gateway_response = deepcopy(payment.gateway_response)

        second_response = self.client.get(
            self.callback_url,
            {
                "authority": payment.authority,
                "status": "OK",
            },
        )

        self.assertEqual(
            second_response.status_code,
            status.HTTP_200_OK,
            second_response.data,
        )
        self.assertEqual(
            second_response.data["detail"],
            "Payment has already been verified.",
        )

        payment.refresh_from_db()
        self.order.refresh_from_db()

        self.assertEqual(payment.status, "successful")
        self.assertEqual(
            payment.reference_id,
            original_reference_id,
        )
        self.assertEqual(
            payment.paid_at,
            original_payment_paid_at,
        )
        self.assertEqual(
            payment.gateway_response,
            original_gateway_response,
        )

        self.assertEqual(self.order.status, "paid")
        self.assertEqual(
            self.order.paid_at,
            original_order_paid_at,
        )

        self.assertEqual(Payment.objects.count(), 1)

    def test_create_payment_fails_for_paid_order(self):
        """برای سفارش پرداخت‌شده نباید پرداخت جدیدی ایجاد شود."""
        self.order.status = "paid"
        self.order.save(update_fields=["status"])

        response = self.client.post(
            self.create_url,
            {"order_id": self.order.id},
            format="json",
        )

        self.assertEqual(
            response.status_code,
            status.HTTP_400_BAD_REQUEST,
            response.data,
        )
        self.assertEqual(
            response.data["detail"],
            "Order is not ready for payment.",
        )
        self.assertEqual(Payment.objects.count(), 0)
