"""Lectures. Seul point d'entrée en lecture pour les autres features."""

from django.db.models import Count, QuerySet

from core.stats import count_per_day

from .models import PollVote, Post, PostLike

# Tri du fil → champ d'ordre (curseur) : Populaires, Nouveaux, Top.
SORTS = {"hot": "-hot", "new": "-created_at", "top": "-top"}


def list_feed(*, kind: str | None = None, author_id=None, tag: str | None = None) -> QuerySet[Post]:
    """Sans ordre : la pagination applique celui du tri (SORTS)."""
    posts = Post.objects.alive()
    if kind:
        posts = posts.filter(kind=kind)
    if author_id:
        posts = posts.filter(author_id=author_id)
    if tag:
        # Recherche sur le texte JSON : portable PostgreSQL / SQLite (tests).
        posts = posts.filter(tags__icontains=f'"{tag.lower()}"')
    return posts


def get_post(*, post_id, include_hidden: bool = False) -> Post | None:
    """include_hidden : aussi un post masqué par la modération (aperçu du back-office)."""
    posts = Post.objects.all() if include_hidden else Post.objects.alive()
    return posts.filter(id=post_id).first()


def get_post_author_id(*, post_id):
    """Pour discussions et notifications, sans exposer le modèle."""
    return Post.objects.alive().filter(id=post_id).values_list("author_id", flat=True).first()


def poll_results(*, post_ids) -> dict:
    """{post_id: [votes du choix 0, du choix 1, …]}"""
    results: dict = {}
    rows = (
        PollVote.objects.filter(post_id__in=post_ids)
        .values("post_id", "option")
        .annotate(total=Count("id"))
    )
    for row in rows:
        results.setdefault(row["post_id"], {})[row["option"]] = row["total"]
    return results


def viewer_state(*, post_ids, user) -> dict:
    """{post_id: {"post_vote": -1|0|1, "liked": bool, "vote": int | None}}.

    vote = choix du sondage ; post_vote = vote ↑/↓ sur le post.
    """
    if not user or not user.is_authenticated:
        return {}
    post_votes = dict(
        PostLike.objects.filter(post_id__in=post_ids, user=user).values_list("post_id", "value")
    )
    votes = dict(
        PollVote.objects.filter(post_id__in=post_ids, voter=user).values_list("post_id", "option")
    )
    return {
        pid: {
            "post_vote": post_votes.get(pid, 0),
            "liked": post_votes.get(pid) == 1,
            "vote": votes.get(pid),
        }
        for pid in post_ids
    }


def post_stats(*, since) -> dict:
    posts = Post.objects.alive()
    return {
        "total": posts.count(),
        "new": posts.filter(created_at__gte=since).count(),
        "by_kind": dict(posts.values_list("kind").annotate(n=Count("id")).order_by()),
    }


def posts_per_day(*, since) -> dict[str, int]:
    return count_per_day(Post.objects.alive(), since=since)


def tag_counts(*, since) -> dict[str, int]:
    """{tag: nombre de posts} publiés depuis `since` (communautés actives)."""
    counts: dict[str, int] = {}
    for tags in Post.objects.alive().filter(created_at__gte=since).values_list("tags", flat=True):
        for tag in tags or []:
            counts[tag] = counts.get(tag, 0) + 1
    return counts


def communities(*, since, limit: int = 12) -> list[dict]:
    """Communautés = tags les plus actifs (posts + questions), du plus au moins actif."""
    from features.qa import selectors as qa_selectors

    posts = tag_counts(since=since)
    questions = qa_selectors.tag_counts(since=since)
    rows = [
        {"tag": tag, "posts": posts.get(tag, 0), "questions": questions.get(tag, 0)}
        for tag in set(posts) | set(questions)
    ]
    rows.sort(key=lambda row: (-(row["posts"] + row["questions"]), row["tag"]))
    return rows[:limit]
