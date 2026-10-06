from django.urls import path

from .views import DeviceView, MarkAllReadView, MarkReadView, NotificationListView, UnreadCountView

app_name = "notifications"

urlpatterns = [
    path("", NotificationListView.as_view(), name="list"),
    path("unread-count/", UnreadCountView.as_view(), name="unread-count"),
    path("read-all/", MarkAllReadView.as_view(), name="read-all"),
    path("devices/", DeviceView.as_view(), name="devices"),
    path("<uuid:notification_id>/read/", MarkReadView.as_view(), name="read"),
]
