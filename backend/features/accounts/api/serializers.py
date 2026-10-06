from rest_framework import serializers

from core.serializers import ReadOnlyModelSerializer

from ..models import User


class UserSerializer(ReadOnlyModelSerializer):
    class Meta:
        model = User
        # is_staff / is_superuser : le web n'affiche l'accès au back-office qu'à l'équipe.
        fields = [
            "id",
            "username",
            "email",
            "phone_number",
            "date_joined",
            "is_staff",
            "is_superuser",
        ]


class TokensSerializer(serializers.Serializer):
    access = serializers.CharField()
    refresh = serializers.CharField()


class AuthResponseSerializer(serializers.Serializer):
    user = UserSerializer()
    tokens = TokensSerializer()
    created = serializers.BooleanField()


class RegisterInputSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=30)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    display_name = serializers.CharField(max_length=80, required=False, allow_blank=True)


class LoginInputSerializer(serializers.Serializer):
    identifier = serializers.CharField(help_text="Nom d'utilisateur ou e-mail.")
    password = serializers.CharField(write_only=True)


class OTPRequestInputSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)


class OTPRequestOutputSerializer(serializers.Serializer):
    phone_number = serializers.CharField()
    expires_in = serializers.IntegerField()


class OTPVerifyInputSerializer(serializers.Serializer):
    phone_number = serializers.CharField(max_length=20)
    code = serializers.RegexField(r"^\d{6}$")


class OAuthInputSerializer(serializers.Serializer):
    code = serializers.CharField()
    redirect_uri = serializers.URLField(required=False)
