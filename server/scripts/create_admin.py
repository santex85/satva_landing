"""
Create first admin user. Run from server dir:
  python scripts/create_admin.py admin@example.com yourpassword
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models import AdminUser


def main():
    if len(sys.argv) != 3:
        print("Usage: python scripts/create_admin.py <email> <password>")
        sys.exit(1)
    email = sys.argv[1]
    password = sys.argv[2]
    db = SessionLocal()
    try:
        if db.query(AdminUser).filter(AdminUser.email == email).first():
            print("User already exists")
            return
        user = AdminUser(
            email=email,
            password_hash=get_password_hash(password),
            role="owner",
        )
        db.add(user)
        db.commit()
        print("Admin user created:", email)
    finally:
        db.close()


if __name__ == "__main__":
    main()
