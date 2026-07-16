from rest_framework import serializers


class RequestOTPSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)

    def validate_phone_number(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError("Phone number is required.")

        if not value.isdigit():
            raise serializers.ValidationError("Phone number must contain only digits.")

        if len(value) != 11:
            raise serializers.ValidationError("Phone number must be 11 digits.")

        if not value.startswith("09"):
            raise serializers.ValidationError("Phone number must start with 09.")

        return value


class VerifyOTPSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=15)
    code = serializers.CharField(max_length=6)

    def validate_phone_number(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError("Phone number is required.")

        if not value.isdigit():
            raise serializers.ValidationError("Phone number must contain only digits.")

        if len(value) != 11:
            raise serializers.ValidationError("Phone number must be 11 digits.")

        if not value.startswith("09"):
            raise serializers.ValidationError("Phone number must start with 09.")

        return value

    def validate_code(self, value):
        value = value.strip()

        if not value:
            raise serializers.ValidationError("OTP code is required.")

        if not value.isdigit():
            raise serializers.ValidationError("OTP code must contain only digits.")

        if len(value) != 6:
            raise serializers.ValidationError("OTP code must be 6 digits.")

        return value
