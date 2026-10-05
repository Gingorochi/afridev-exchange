from django.urls import path

from .views import CommunitiesView, FeedView, PollVoteView, PostDetailView, PostLikeView

app_name = "feed"

urlpatterns = [
    path("", FeedView.as_view(), name="list-create"),
    path("communities/", CommunitiesView.as_view(), name="communities"),
    path("<uuid:post_id>/", PostDetailView.as_view(), name="detail"),
    path("<uuid:post_id>/vote/", PollVoteView.as_view(), name="vote"),
    path("<uuid:post_id>/like/", PostLikeView.as_view(), name="like"),
]
