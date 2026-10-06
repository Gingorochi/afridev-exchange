"""Vues minces : valident l'entrée, puis appellent services / selectors."""

from django.http import HttpResponse
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from core.throttling import AIQuotaThrottle

from .. import selectors, services
from ..qr import profile_qr_svg
from .serializers import MyProfileSerializer, ProfileUpdateSerializer, PublicProfileSerializer


def _my_profile(request):
    profile = selectors.get_profile_for_user(user_id=request.user.id)
    if profile is None:
        raise NotFound("Profil introuvable.")
    return profile


def _public_profile(username):
    profile = selectors.get_profile_by_username(username=username)
    if profile is None:
        raise NotFound("Profil introuvable.")
    return profile


class MyProfileView(APIView):
    @extend_schema(responses=MyProfileSerializer)
    def get(self, request):
        return Response(MyProfileSerializer(_my_profile(request)).data)

    @extend_schema(request=ProfileUpdateSerializer, responses=MyProfileSerializer)
    def patch(self, request):
        data = ProfileUpdateSerializer(data=request.data, partial=True)
        data.is_valid(raise_exception=True)
        profile = services.update_profile(profile=_my_profile(request), **data.validated_data)
        return Response(MyProfileSerializer(profile).data)


class AIBioView(APIView):
    throttle_classes = [AIQuotaThrottle]

    @extend_schema(request=None, responses={202: MyProfileSerializer})
    def post(self, request):
        profile = services.request_ai_bio(profile=_my_profile(request))
        return Response(MyProfileSerializer(profile).data, status=status.HTTP_202_ACCEPTED)


class PublicProfileView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses=PublicProfileSerializer)
    def get(self, request, username):
        return Response(PublicProfileSerializer(_public_profile(username)).data)


class ProfileQRCodeView(APIView):
    permission_classes = [AllowAny]

    @extend_schema(responses={(200, "image/svg+xml"): OpenApiTypes.BINARY})
    def get(self, request, username):
        profile = _public_profile(username)
        response = HttpResponse(profile_qr_svg(profile.username), content_type="image/svg+xml")
        response["Cache-Control"] = "public, max-age=86400"
        return response
