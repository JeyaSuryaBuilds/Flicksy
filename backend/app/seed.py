"""
Populate the database with realistic demo data so the app is usable
immediately after a clean install.

Run with:  python -m app.seed
"""
from datetime import datetime, timedelta

from app.database.session import Base, engine, SessionLocal
from app.models.models import (
    User, Post, PostMedia, Like, Comment, Follow, Story,
    Conversation, ConversationMember, Message, Notification, NotificationType,
    Sound,
)
from app.auth.security import hash_password
from app.utils.serializers import user_initials

Base.metadata.create_all(bind=engine)

DEMO_USERS = [
    dict(email="arjun@flicksy.dev", username="arjun_v", display_name="Arjun Vasan",
         bio="Chasing golden hour across Tamil Nadu 🌅", is_verified=True),
    dict(email="meera@flicksy.dev", username="meera.k", display_name="Meera Krishnan",
         bio="Filter coffee > everything else ☕"),
    dict(email="dev@flicksy.dev", username="dev.codes", display_name="Dev Shankar",
         bio="Building things at 2am 💻"),
    dict(email="kavya@flicksy.dev", username="kavya.r", display_name="Kavya Raman",
         bio="Dancer. Dreamer. Chennai-based."),
    dict(email="priya@flicksy.dev", username="priya_s", display_name="Priya Suresh",
         bio="Street food explorer 🍛"),
    dict(email="demo@flicksy.dev", username="you", display_name="Demo User",
         bio="Just here to explore Flicksy."),
    dict(email="admin@flicksy.dev", username="flicksy_admin", display_name="Flicksy Admin",
         bio="Keeping the Stream healthy.", is_admin=True),
]

POSTS = [
    dict(user="arjun_v", caption="Golden hour hits different on the Pondicherry promenade 🌅",
         location="Pondicherry, India", media_type="video", media_tag="0:24"),
    dict(user="meera.k", caption="Sunday filter coffee + dosa, non-negotiable ☕",
         location="Chennai, India", media_type="image", media_tag=""),
    dict(user="dev.codes", caption="Shipped a side project at 2am, worth it 💻",
         location="Coimbatore, India", media_type="video", media_tag="1:02"),
    dict(user="kavya.r", caption="Bharatanatyam practice before the big show 💃",
         location="Chennai, India", media_type="image", media_tag=""),
    dict(user="priya_s", caption="Best kothu parotta in Madurai, no contest 🍛",
         location="Madurai, India", media_type="image", media_tag=""),
]


def run():
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            print("Database already has data — skipping seed. Delete flicksy.db to reseed.")
            return

        users_by_username = {}
        for u in DEMO_USERS:
            user = User(
                email=u["email"],
                username=u["username"],
                display_name=u["display_name"],
                bio=u["bio"],
                hashed_password=hash_password("password123"),
                avatar_initials=user_initials(u["display_name"]),
                is_verified=u.get("is_verified", False),
                is_admin=u.get("is_admin", False),
                is_email_verified=True,  # demo accounts skip the verification flow
            )
            db.add(user)
            users_by_username[u["username"]] = user
        db.flush()

        # Everyone follows the demo user's followees to make the feed feel alive
        demo = users_by_username["you"]
        for username, user in users_by_username.items():
            if username == "you":
                continue
            db.add(Follow(follower_id=demo.id, followee_id=user.id))
            db.add(Follow(follower_id=user.id, followee_id=demo.id))

        created_posts = []
        for i, p in enumerate(POSTS):
            author = users_by_username[p["user"]]
            post = Post(
                author_id=author.id,
                caption=p["caption"],
                location=p["location"],
                media_type=p["media_type"],
                media_tag=p["media_tag"],
                created_at=datetime.utcnow() - timedelta(hours=i * 3 + 1),
            )
            db.add(post)
            db.flush()
            db.add(PostMedia(post_id=post.id, url="", order_index=0))
            created_posts.append(post)

        # A few likes and comments so counts aren't zero
        for post in created_posts:
            for username, user in list(users_by_username.items())[:3]:
                db.add(Like(post_id=post.id, user_id=user.id))
            db.add(Comment(post_id=post.id, author_id=demo.id, body="This is amazing! 🔥"))

        # Stories for everyone except demo
        for username, user in users_by_username.items():
            if username == "you":
                continue
            db.add(Story(author_id=user.id, media_url="", expires_at=datetime.utcnow() + timedelta(hours=24)))

        # A conversation + messages between demo and arjun_v
        arjun = users_by_username["arjun_v"]
        conversation = Conversation()
        db.add(conversation)
        db.flush()
        db.add(ConversationMember(conversation_id=conversation.id, user_id=demo.id))
        db.add(ConversationMember(conversation_id=conversation.id, user_id=arjun.id))
        db.add(Message(conversation_id=conversation.id, sender_id=arjun.id, body="Hey! Loved your last post 👀"))
        db.add(Message(conversation_id=conversation.id, sender_id=demo.id, body="Thank you! Means a lot 🙏"))

        # A notification
        db.add(Notification(recipient_id=demo.id, actor_id=arjun.id, type=NotificationType.follow))
        if created_posts:
            db.add(Notification(
                recipient_id=demo.id, actor_id=arjun.id,
                type=NotificationType.like, post_id=created_posts[0].id,
            ))

        # A Rush (short-video) sample so /rush/feed isn't empty
        rush_author = users_by_username["dev.codes"]
        db.add(Post(
            author_id=rush_author.id,
            caption="60 seconds of shipping Flicksy features ⚡",
            media_type="video",
            media_tag="0:58",
            is_rush=True,
            created_at=datetime.utcnow() - timedelta(hours=2),
        ))

        # SoundBox sample catalog entries
        db.add_all([
            Sound(title="Late Night Drive", artist="Flicksy Sounds", duration_seconds=32, source="catalog"),
            Sound(title="Golden Hour", artist="Flicksy Sounds", duration_seconds=28, source="catalog"),
            Sound(title="Chennai Nights (Lo-fi)", artist="Flicksy Sounds", duration_seconds=45, source="catalog"),
        ])

        db.commit()
        print("Seed complete.")
        print("Demo login -> email: demo@flicksy.dev | password: password123")
        print("Admin login -> email: admin@flicksy.dev | password: password123")
    finally:
        db.close()


if __name__ == "__main__":
    run()
