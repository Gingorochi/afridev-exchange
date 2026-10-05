from rest_framework import serializers

from core.serializers import ReadOnlyModelSerializer

from ..models import Notification


class NotificationSerializer(ReadOnlyModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "kind", "title", "body", "data", "read_at", "created_at"]


class UnreadCountSerializer(serializers.Serializer):
    unread = serializers.IntegerField()


class DeviceInputSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=200)
    platform = serializers.ChoiceField(
        choices=["ios", "android", "web"], required=False, default=""
    )
