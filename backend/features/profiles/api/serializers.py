from rest_framework import serializers

from core.serializers import ReadOnlyModelSerializer, string_list

from ..models import Profile


class PublicProfileSerializer(ReadOnlyModelSerializer):
    """Forme lue par la page publique /u/<username> (cible du QR code)."""

    stack = string_list()

    class Meta:
        model = Profile
        fields = [
            "id",
            "username",
            "display_name",
            "bio",
            "avatar_url",
            "stack",
            "github_username",
            "location",
            "website",
            "open_to_work",
            "created_at",
        ]


class MyProfileSerializer(ReadOnlyModelSerializer):
    stack = string_list()

    class Meta:
        model = Profile
        fields = PublicProfileSerializer.Meta.fields + [
            "ai_bio_suggestion",
            "ai_bio_status",
            "updated_at",
        ]


class ProfileUpdateSerializer(serializers.Serializer):
    display_name = serializers.CharField(max_length=80, required=False, allow_blank=True)
    bio = serializers.CharField(max_length=600, required=False, allow_blank=True)
    avatar_url = serializers.URLField(required=False, allow_blank=True)
    stack = serializers.ListField(
        child=serializers.CharField(max_length=30), required=False, max_length=20
    )
    github_username = serializers.RegexField(
        r"^[A-Za-z0-9-]{0,39}$", required=False, allow_blank=True
    )
    location = serializers.CharField(max_length=80, required=False, allow_blank=True)
    website = serializers.URLField(required=False, allow_blank=True)
    open_to_work = serializers.BooleanField(required=False)
