"""Vues minces : valident l'entrée, puis appellent services / selectors."""

from django.conf import settings
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.throttling import OTPThrottle

from .. import services
from .serializers import (
    AuthResponseSerializer,
    LoginInputSerializer,
    OAuthInputSerializer,
    OTPRequestInputSerializer,
    OTPRequestOutputSerializer,
    OTPVerifyInputSerializer,
    RegisterInputSerializer,
    UserSerializer,
)


def _auth_response(user, *, created: bool, status_code=status.HTTP_200_OK) -> Response:
    payload = {
        "user": UserSerializer(user).data,
        "tokens": services.issue_tokens(user),
        "created": created,
    }
    return Response(payload, status=status_code)


class RegisterView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=RegisterInputSerializer, responses={201: AuthResponseSerializer})
    def post(self, request):
        data = RegisterInputSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        user = services.register_user(**data.validated_data)
        return _auth_response(user, created=True, status_code=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=LoginInputSerializer, responses=AuthResponseSerializer)
    def post(self, request):
        data = LoginInputSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        user = services.authenticate_user(**data.validated_data)
        return _auth_response(user, created=False)


class OTPRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [OTPThrottle]

    @extend_schema(request=OTPRequestInputSerializer, responses={202: OTPRequestOutputSerializer})
    def post(self, request):
        data = OTPRequestInputSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        phone = services.request_phone_otp(**data.validated_data)
        return Response(
            {"phone_number": phone, "expires_in": settings.OTP_TTL_SECONDS},
            status=status.HTTP_202_ACCEPTED,
        )


class OTPVerifyView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [OTPThrottle]

    @extend_schema(request=OTPVerifyInputSerializer, responses=AuthResponseSerializer)
    def post(self, request):
        data = OTPVerifyInputSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        user, created = services.login_with_phone(**data.validated_data)
        return _auth_response(user, created=created)


class OAuthLoginView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=OAuthInputSerializer, responses=AuthResponseSerializer)
    def post(self, request, provider):
        data = OAuthInputSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        user, created = services.login_with_oauth(provider=provider, **data.validated_data)
        return _auth_response(user, created=created)


class MeView(APIView):
    @extend_schema(responses=UserSerializer)
    def get(self, request):
        return Response(UserSerializer(request.user).data)
