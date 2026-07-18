from decimal import Decimal

from django.db import transaction
from drf_spectacular.utils import (
    OpenApiExample,
    OpenApiResponse,
    extend_schema,
)
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from books.models import Book
from cart.models import Cart, CartItem

from .models import Order, OrderItem
from .serializers import (
    CheckoutErrorSerializer,
    ErrorSerializer,
    OrderSerializer,
)


class CheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="orders_checkout",
        tags=["Orders"],
        summary="تبدیل سبد خرید به سفارش",
        description=(
            "سبد خرید کاربر احراز هویت‌شده را اعتبارسنجی می‌کند و "
            "یک سفارش جدید با وضعیت `pending_payment` می‌سازد.\n\n"
            "قیمت، موجودی و مبلغ نهایی سفارش فقط در بک‌اند بررسی و "
            "محاسبه می‌شوند. این endpoint بدنه درخواست ندارد و سبد "
            "خرید نیز پس از ایجاد سفارش پاک نمی‌شود."
        ),
        request=None,
        responses={
            201: OpenApiResponse(
                response=OrderSerializer,
                description="سفارش با موفقیت ایجاد شد.",
                examples=[
                    OpenApiExample(
                        name="سفارش ایجادشده",
                        value={
                            "id": 15,
                            "user": 3,
                            "status": "pending_payment",
                            "subtotal": "300000",
                            "discount_amount": "0",
                            "shipping_amount": "0",
                            "total_amount": "300000",
                            "created_at": "2026-07-18T10:30:00Z",
                            "updated_at": "2026-07-18T10:30:00Z",
                            "paid_at": None,
                            "items": [
                                {
                                    "id": 25,
                                    "book": 7,
                                    "product_title": "نام کتاب",
                                    "unit_price": "150000",
                                    "quantity": 2,
                                    "line_total": "300000",
                                }
                            ],
                        },
                        response_only=True,
                    )
                ],
            ),
            400: OpenApiResponse(
                response=CheckoutErrorSerializer,
                description=(
                    "سبد خرید وجود ندارد، خالی است یا دارای اقلام "
                    "غیرقابل سفارش است."
                ),
                examples=[
                    OpenApiExample(
                        name="سبد خرید وجود ندارد",
                        value={
                            "detail": (
                                "سبد خریدی برای این کاربر وجود ندارد."
                            )
                        },
                        response_only=True,
                    ),
                    OpenApiExample(
                        name="سبد خرید خالی",
                        value={
                            "detail": "سبد خرید خالی است.",
                        },
                        response_only=True,
                    ),
                    OpenApiExample(
                        name="موجودی ناکافی",
                        value={
                            "detail": (
                                "برخی اقلام سبد خرید قابل سفارش نیستند."
                            ),
                            "items": [
                                {
                                    "book_id": 7,
                                    "title": "نام کتاب",
                                    "requested_quantity": 3,
                                    "available_stock": 1,
                                    "detail": "موجودی کتاب کافی نیست.",
                                }
                            ],
                        },
                        response_only=True,
                    ),
                    OpenApiExample(
                        name="کتاب غیرفعال",
                        value={
                            "detail": (
                                "برخی اقلام سبد خرید قابل سفارش نیستند."
                            ),
                            "items": [
                                {
                                    "book_id": 7,
                                    "title": "نام کتاب",
                                    "detail": (
                                        "این کتاب در حال حاضر "
                                        "قابل خرید نیست."
                                    ),
                                }
                            ],
                        },
                        response_only=True,
                    ),
                    OpenApiExample(
                        name="کتاب پیدا نشد",
                        value={
                            "detail": (
                                "برخی اقلام سبد خرید قابل سفارش نیستند."
                            ),
                            "items": [
                                {
                                    "book_id": 7,
                                    "detail": "کتاب موردنظر پیدا نشد.",
                                }
                            ],
                        },
                        response_only=True,
                    ),
                    OpenApiExample(
                        name="تعداد نامعتبر",
                        value={
                            "detail": (
                                "برخی اقلام سبد خرید قابل سفارش نیستند."
                            ),
                            "items": [
                                {
                                    "book_id": 7,
                                    "title": "نام کتاب",
                                    "requested_quantity": 0,
                                    "detail": (
                                        "تعداد کتاب باید حداقل یک باشد."
                                    ),
                                }
                            ],
                        },
                        response_only=True,
                    ),
                ],
            ),
            401: OpenApiResponse(
                response=ErrorSerializer,
                description=(
                    "اطلاعات احراز هویت ارسال نشده یا نامعتبر است."
                ),
                examples=[
                    OpenApiExample(
                        name="احراز هویت انجام نشده",
                        value={
                            "detail": (
                                "اطلاعات برای اعتبارسنجی هویت ارائه نشد."
                            )
                        },
                        response_only=True,
                    )
                ],
            ),
            403: OpenApiResponse(
                response=ErrorSerializer,
                description=(
                    "کاربر اجازه دسترسی به این endpoint را ندارد."
                ),
                examples=[
                    OpenApiExample(
                        name="دسترسی غیرمجاز",
                        value={
                            "detail": (
                                "شما اجازه انجام این عملیات را ندارید."
                            )
                        },
                        response_only=True,
                    )
                ],
            ),
        },
    )
    @transaction.atomic
    def post(self, request):
        try:
            cart = (
                Cart.objects.select_for_update()
                .get(user=request.user)
            )
        except Cart.DoesNotExist:
            raise ValidationError(
                {
                    "detail": (
                        "سبد خریدی برای این کاربر وجود ندارد."
                    )
                }
            )

        cart_items = list(
            CartItem.objects.select_for_update()
            .filter(cart=cart)
            .values("book_id", "quantity")
        )

        if not cart_items:
            raise ValidationError(
                {"detail": "سبد خرید خالی است."}
            )

        book_ids = [
            cart_item["book_id"]
            for cart_item in cart_items
        ]

        books = {
            book.id: book
            for book in (
                Book.objects.select_for_update()
                .filter(id__in=book_ids)
            )
        }

        order_items_data = []
        errors = []
        subtotal = Decimal("0")

        for cart_item in cart_items:
            book_id = cart_item["book_id"]
            quantity = cart_item["quantity"]
            book = books.get(book_id)

            if book is None:
                errors.append(
                    {
                        "book_id": book_id,
                        "detail": "کتاب موردنظر پیدا نشد.",
                    }
                )
                continue

            if not book.is_active:
                errors.append(
                    {
                        "book_id": book.id,
                        "title": book.title,
                        "detail": (
                            "این کتاب در حال حاضر قابل خرید نیست."
                        ),
                    }
                )
                continue

            if quantity < 1:
                errors.append(
                    {
                        "book_id": book.id,
                        "title": book.title,
                        "requested_quantity": quantity,
                        "detail": (
                            "تعداد کتاب باید حداقل یک باشد."
                        ),
                    }
                )
                continue

            if book.stock < quantity:
                errors.append(
                    {
                        "book_id": book.id,
                        "title": book.title,
                        "requested_quantity": quantity,
                        "available_stock": book.stock,
                        "detail": "موجودی کتاب کافی نیست.",
                    }
                )
                continue

            line_total = book.price * quantity
            subtotal += line_total

            order_items_data.append(
                {
                    "book": book,
                    "product_title": book.title,
                    "unit_price": book.price,
                    "quantity": quantity,
                    "line_total": line_total,
                }
            )

        if errors:
            raise ValidationError(
                {
                    "detail": (
                        "برخی اقلام سبد خرید قابل سفارش نیستند."
                    ),
                    "items": errors,
                }
            )

        discount_amount = Decimal("0")
        shipping_amount = Decimal("0")
        total_amount = (
            subtotal
            - discount_amount
            + shipping_amount
        )

        order = Order.objects.create(
            user=request.user,
            status=Order.Status.PENDING_PAYMENT,
            subtotal=subtotal,
            discount_amount=discount_amount,
            shipping_amount=shipping_amount,
            total_amount=total_amount,
        )

        OrderItem.objects.bulk_create(
            [
                OrderItem(
                    order=order,
                    book=item["book"],
                    product_title=item["product_title"],
                    unit_price=item["unit_price"],
                    quantity=item["quantity"],
                    line_total=item["line_total"],
                )
                for item in order_items_data
            ]
        )

        order = (
            Order.objects.select_related("user")
            .prefetch_related("items")
            .get(pk=order.pk)
        )

        serializer = OrderSerializer(
            order,
            context={"request": request},
        )

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )
