from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from .models import OTPCode, User
from .serializers import RequestOTPSerializer, VerifyOTPSerializer
from .services import send_sms
from .utils import generate_otp


class RequestOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RequestOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone_number = serializer.validated_data["phone_number"]

        code = generate_otp()
        expires_at = timezone.now() + timedelta(minutes=2)

        OTPCode.objects.create(
            phone_number=phone_number,
            code=code,
            expires_at=expires_at,
        )

        send_sms(phone_number, f"Your verification code is: {code}")

        return Response(
            {"detail": "OTP sent successfully."},
            status=status.HTTP_200_OK,
        )


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        phone_number = serializer.validated_data["phone_number"]
        code = serializer.validated_data["code"]

        otp = (
            OTPCode.objects.filter(
                phone_number=phone_number,
                code=code,
                is_used=False,
            )
            .order_by("-created_at")
            .first()
        )

        if otp is None:
            return Response(
                {"detail": "Invalid OTP code."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if timezone.now() > otp.expires_at:
            return Response(
                {"detail": "OTP code has expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        otp.is_used = True
        otp.save(update_fields=["is_used"])

        user, created = User.objects.get_or_create(
            phone_number=phone_number,
            defaults={
                "is_phone_verified": True,
            },
        )

        if not created and not user.is_phone_verified:
            user.is_phone_verified = True
            user.save(update_fields=["is_phone_verified"])

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "refresh": str(refresh),
                "access": str(refresh.access_token),
                "user": {
                    "id": user.id,
                    "phone_number": user.phone_number,
                    "is_phone_verified": user.is_phone_verified,
                },
            },
            status=status.HTTP_200_OK,
        )
