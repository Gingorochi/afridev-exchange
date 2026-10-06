"""Formes de réponse partagées (documentation OpenAPI)."""

from rest_framework import serializers


class AuthorSerializer(serializers.Serializer):
    id = serializers.UUIDField()
    username = serializers.CharField()
    display_name = serializers.CharField()
    avatar_url = serializers.CharField(allow_blank=True)


class AcceptedJobSerializer(serializers.Serializer):
    job_id = serializers.UUIDField()


class ReadOnlyModelSerializer(serializers.ModelSerializer):
    """Sérialiseur de sortie : tous les champs en lecture seule.

    L'OpenAPI les marque alors « requis », et les types générés pour le web et le mobile
    n'ont pas de champs faussement optionnels.
    """

    def get_fields(self):
        fields = super().get_fields()
        for field in fields.values():
            field.read_only = True
            field.required = False
        return fields


def string_list():
    """Liste de chaînes stockée en JSON (tags, stack, labels) : typée explicitement."""
    return serializers.ListField(child=serializers.CharField(), read_only=True)
