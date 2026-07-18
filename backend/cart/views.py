from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import (
    OpenApiExample,
    OpenApiParameter,
    OpenApiResponse,
    extend_schema,
)
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Cart, CartItem
from .serializers import (
    AddCartItemSerializer,
    CartErrorSerializer,
    CartSerializer,
    CartValidationErrorSerializer,
    UpdateCartItemSerializer,
)


def get_or_create_cart(user):
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


def serialize_cart(cart, request):
    cart = (
        Cart.objects
        .prefetch_related("items__book")
        .get(pk=cart.pk)
    )

    return CartSerializer(
        cart,
        context={"request": request},
    ).data


class CartDetailView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="cart_retrieve",
        tags=["Cart"],
        summary="دریافت سبد خرید",
        description=(
            "سبد خرید کاربر احراز هویت‌شده را همراه با اقلام، "
            "تعداد کل و مبلغ کل برمی‌گرداند. اگر کاربر هنوز سبد "
            "خرید نداشته باشد، یک سبد خالی برای او ایجاد می‌شود."
        ),
        request=None,
        responses={
            200: OpenApiResponse(
                response=CartSerializer,
                description="سبد خرید با موفقیت دریافت شد.",
            ),
            401: OpenApiResponse(
                response=CartErrorSerializer,
                description="اطلاعات احراز هویت ارسال نشده یا نامعتبر است.",
            ),
        },
    )
    def get(self, request):
        cart = get_or_create_cart(request.user)

        return Response(
            serialize_cart(cart, request),
            status=status.HTTP_200_OK,
        )


class CartItemAddView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="cart_item_add",
        tags=["Cart"],
        summary="افزودن کتاب به سبد خرید",
        description=(
            "کتاب موردنظر را به سبد خرید اضافه می‌کند. اگر کتاب از قبل "
            "در سبد وجود داشته باشد، تعداد جدید به تعداد فعلی افزوده "
            "می‌شود. مجموع تعداد نمی‌تواند بیشتر از موجودی کتاب باشد."
        ),
        request=AddCartItemSerializer,
        responses={
            200: OpenApiResponse(
                response=CartSerializer,
                description="کتاب با موفقیت به سبد خرید اضافه شد.",
            ),
            400: OpenApiResponse(
                response=CartValidationErrorSerializer,
                description="داده‌های ورودی نامعتبر یا موجودی ناکافی است.",
                examples=[
                    OpenApiExample(
                        name="موجودی ناکافی",
                        value={
                            "quantity": [
                                (
                                    "Requested quantity exceeds "
                                    "available stock."
                                )
                            ]
                        },
                        response_only=True,
                    ),
                    OpenApiExample(
                        name="تعداد نامعتبر",
                        value={
                            "quantity": [
                                (
                                    "Ensure this value is greater "
                                    "than or equal to 1."
                                )
                            ]
                        },
                        response_only=True,
                    ),
                ],
            ),
            401: OpenApiResponse(
                response=CartErrorSerializer,
                description="اطلاعات احراز هویت ارسال نشده یا نامعتبر است.",
            ),
        },
    )
    def post(self, request):
        serializer = AddCartItemSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)

        cart = get_or_create_cart(request.user)
        book = serializer.validated_data["book"]
        quantity = serializer.validated_data["quantity"]

        item, created = CartItem.objects.get_or_create(
            cart=cart,
            book=book,
            defaults={"quantity": quantity},
        )

        if not created:
            new_quantity = item.quantity + quantity

            if new_quantity > book.stock:
                raise ValidationError(
                    {
                        "quantity": (
                            "Requested quantity exceeds "
                            "available stock."
                        )
                    }
                )

            item.quantity = new_quantity
            item.save(update_fields=["quantity"])

        return Response(
            serialize_cart(cart, request),
            status=status.HTTP_200_OK,
        )


class CartItemUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="cart_item_update",
        tags=["Cart"],
        summary="تغییر تعداد یک آیتم سبد خرید",
        description=(
            "تعداد نهایی یک آیتم موجود در سبد خرید را تغییر می‌دهد. "
            "تعداد جدید باید حداقل یک و حداکثر برابر موجودی کتاب باشد."
        ),
        parameters=[
            OpenApiParameter(
                name="item_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
                description="شناسه آیتم موجود در سبد خرید.",
            )
        ],
        request=UpdateCartItemSerializer,
        responses={
            200: OpenApiResponse(
                response=CartSerializer,
                description="تعداد آیتم با موفقیت تغییر کرد.",
            ),
            400: OpenApiResponse(
                response=CartValidationErrorSerializer,
                description="تعداد واردشده نامعتبر یا بیشتر از موجودی است.",
            ),
            401: OpenApiResponse(
                response=CartErrorSerializer,
                description="اطلاعات احراز هویت ارسال نشده یا نامعتبر است.",
            ),
            404: OpenApiResponse(
                response=CartErrorSerializer,
                description="آیتم موردنظر در سبد خرید پیدا نشد.",
                examples=[
                    OpenApiExample(
                        name="آیتم پیدا نشد",
                        value={"detail": "Item not found."},
                        response_only=True,
                    )
                ],
            ),
        },
    )
    def patch(self, request, item_id):
        cart = get_or_create_cart(request.user)

        item = (
            cart.items
            .select_related("book")
            .filter(id=item_id)
            .first()
        )

        if item is None:
            return Response(
                {"detail": "Item not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = UpdateCartItemSerializer(
            instance=item,
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)

        item.quantity = serializer.validated_data["quantity"]
        item.save(update_fields=["quantity"])

        return Response(
            serialize_cart(cart, request),
            status=status.HTTP_200_OK,
        )


class CartItemDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="cart_item_delete",
        tags=["Cart"],
        summary="حذف یک آیتم از سبد خرید",
        description=(
            "آیتم مشخص‌شده را از سبد خرید کاربر حذف می‌کند و "
            "نسخه به‌روزشده سبد خرید را برمی‌گرداند."
        ),
        parameters=[
            OpenApiParameter(
                name="item_id",
                type=OpenApiTypes.INT,
                location=OpenApiParameter.PATH,
                required=True,
                description="شناسه آیتم موجود در سبد خرید.",
            )
        ],
        request=None,
        responses={
            200: OpenApiResponse(
                response=CartSerializer,
                description=(
                    "آیتم حذف شد و سبد خرید به‌روزشده برگشت داده شد."
                ),
            ),
            401: OpenApiResponse(
                response=CartErrorSerializer,
                description="اطلاعات احراز هویت ارسال نشده یا نامعتبر است.",
            ),
            404: OpenApiResponse(
                response=CartErrorSerializer,
                description="آیتم موردنظر در سبد خرید پیدا نشد.",
                examples=[
                    OpenApiExample(
                        name="آیتم پیدا نشد",
                        value={"detail": "Item not found."},
                        response_only=True,
                    )
                ],
            ),
        },
    )
    def delete(self, request, item_id):
        cart = get_or_create_cart(request.user)
        item = cart.items.filter(id=item_id).first()

        if item is None:
            return Response(
                {"detail": "Item not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        item.delete()

        return Response(
            serialize_cart(cart, request),
            status=status.HTTP_200_OK,
        )


class CartClearView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        operation_id="cart_clear",
        tags=["Cart"],
        summary="پاک‌کردن تمام اقلام سبد خرید",
        description=(
            "تمام اقلام سبد خرید کاربر را حذف می‌کند و "
            "سبد خرید خالی را برمی‌گرداند."
        ),
        request=None,
        responses={
            200: OpenApiResponse(
                response=CartSerializer,
                description="سبد خرید با موفقیت پاک شد.",
            ),
            401: OpenApiResponse(
                response=CartErrorSerializer,
                description="اطلاعات احراز هویت ارسال نشده یا نامعتبر است.",
            ),
        },
    )
    def post(self, request):
        cart = get_or_create_cart(request.user)
        cart.items.all().delete()

        return Response(
            serialize_cart(cart, request),
            status=status.HTTP_200_OK,
        )
