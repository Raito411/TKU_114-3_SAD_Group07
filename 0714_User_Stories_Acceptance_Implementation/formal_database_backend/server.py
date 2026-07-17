from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from datetime import date
import hashlib
import hmac
import json
import mimetypes
import secrets
import sqlite3
import sys
from urllib.parse import parse_qs, urlparse

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "secondhand_books.sqlite3"
SCHEMA_PATH = BASE_DIR / "schema.sql"
STATIC_FILES = {
    "/": BASE_DIR / "login.html",
    "/login.html": BASE_DIR / "login.html",
    "/login.css": BASE_DIR / "login.css",
    "/login.js": BASE_DIR / "login.js",
}


def connect_db():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db():
    with connect_db() as connection:
        connection.executescript(SCHEMA_PATH.read_text(encoding="utf-8"))
        migrate_user_role_to_student(connection)
        migrate_user_trust_columns(connection)


def migrate_user_role_to_student(connection):
    user_table = connection.execute(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'"
    ).fetchone()
    if not user_table or "'student'" in user_table["sql"]:
        return

    connection.execute("PRAGMA foreign_keys = OFF")
    connection.execute(
        """
        CREATE TABLE users_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL UNIQUE,
          role TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'admin')),
          password_hash TEXT NOT NULL,
          password_salt TEXT NOT NULL,
          trust_score INTEGER NOT NULL DEFAULT 3 CHECK (trust_score >= 0 AND trust_score <= 3),
          trust_reset_month TEXT NOT NULL DEFAULT '',
          is_suspended INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        """
    )
    connection.execute(
        """
        INSERT INTO users_new
          (id, name, email, role, password_hash, password_salt, trust_score, trust_reset_month, is_suspended, created_at)
        SELECT
          id,
          name,
          email,
          CASE WHEN role = 'admin' THEN 'admin' ELSE 'student' END,
          password_hash,
          password_salt,
          3,
          '',
          is_suspended,
          created_at
        FROM users
        """
    )
    connection.execute("DROP TABLE users")
    connection.execute("ALTER TABLE users_new RENAME TO users")
    connection.execute("PRAGMA foreign_keys = ON")


def migrate_user_trust_columns(connection):
    columns = [row["name"] for row in connection.execute("PRAGMA table_info(users)").fetchall()]
    if "trust_score" not in columns:
        connection.execute("ALTER TABLE users ADD COLUMN trust_score INTEGER NOT NULL DEFAULT 3")
    if "trust_reset_month" not in columns:
        connection.execute("ALTER TABLE users ADD COLUMN trust_reset_month TEXT NOT NULL DEFAULT ''")


def current_trust_month():
    return date.today().strftime("%Y-%m")


def reset_user_trust_if_needed(connection, user_id):
    user = connection.execute(
        "SELECT id, trust_reset_month FROM users WHERE id = ?",
        (user_id,),
    ).fetchone()
    if not user:
        return
    month = current_trust_month()
    if user["trust_reset_month"] != month:
        connection.execute(
            "UPDATE users SET trust_score = 3, trust_reset_month = ? WHERE id = ?",
            (month, user_id),
        )


def hash_password(password, salt=None):
    password_salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(password_salt),
        120_000,
    )
    return digest.hex(), password_salt


def verify_password(password, password_hash, password_salt):
    candidate_hash, _ = hash_password(password, password_salt)
    return hmac.compare_digest(candidate_hash, password_hash)


def row_to_dict(row):
    return dict(row) if row else None


class ApiHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def _send_json(self, status, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path):
        if not path.exists():
            self._send_json(404, {"error": "找不到頁面"})
            return

        body = path.read_bytes()
        content_type = mimetypes.guess_type(path.name)[0] or "application/octet-stream"
        if path.suffix in (".html", ".css", ".js"):
            content_type += "; charset=utf-8"

        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self):
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        return json.loads(self.rfile.read(length).decode("utf-8"))

    def _require_fields(self, data, fields):
        missing = [field for field in fields if data.get(field) in (None, "")]
        if missing:
            self._send_json(400, {"error": f"缺少必要欄位：{', '.join(missing)}"})
            return False
        return True

    def _auth_user(self, connection):
        authorization = self.headers.get("Authorization", "")
        if not authorization.startswith("Bearer "):
            return None

        token = authorization.removeprefix("Bearer ").strip()
        user = connection.execute(
            """
            SELECT u.id, u.name, u.email, u.role, u.trust_score, u.trust_reset_month, u.is_suspended, u.created_at
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.token = ?
            """,
            (token,),
        ).fetchone()
        if user:
            reset_user_trust_if_needed(connection, user["id"])
            user = connection.execute(
                "SELECT id, name, email, role, trust_score, trust_reset_month, is_suspended, created_at FROM users WHERE id = ?",
                (user["id"],),
            ).fetchone()
        return user

    def _current_user_or_id(self, connection, data, id_field):
        user = self._auth_user(connection)
        if user:
            if user["is_suspended"]:
                self._send_json(403, {"error": "此使用者已被停權"})
                return None
            return user

        user_id = data.get(id_field)
        if not user_id:
            self._send_json(401, {"error": "請先登入"})
            return None
        reset_user_trust_if_needed(connection, user_id)
        user = connection.execute(
            "SELECT id, name, email, role, trust_score, trust_reset_month, is_suspended, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        if not user or user["is_suspended"]:
            self._send_json(403, {"error": "找不到使用者或使用者已停權"})
            return None
        return user

    def do_GET(self):
        parsed = urlparse(self.path)
        query = parse_qs(parsed.query)

        try:
            if parsed.path in STATIC_FILES:
                self._send_file(STATIC_FILES[parsed.path])
            elif parsed.path == "/api/me":
                self.get_current_user()
            elif parsed.path == "/api/books":
                self.list_books(query)
            elif parsed.path == "/api/purchase-requests":
                self.list_purchase_requests()
            elif parsed.path in ("/api/notifications", "/api/mailbox"):
                self.list_notifications(query)
            else:
                self._send_json(404, {"error": "找不到 API 路徑"})
        except sqlite3.Error as error:
            self._send_json(500, {"error": str(error)})

    def do_POST(self):
        parsed = urlparse(self.path)

        try:
            if parsed.path == "/api/register":
                self.register_user()
            elif parsed.path == "/api/login":
                self.login_user()
            elif parsed.path == "/api/books":
                self.create_book()
            elif parsed.path == "/api/purchase-requests":
                self.create_purchase_request()
            elif parsed.path.startswith("/api/purchase-requests/") and parsed.path.endswith("/accept"):
                request_id = int(parsed.path.split("/")[3])
                self.accept_purchase_request(request_id)
            elif parsed.path.startswith("/api/purchase-requests/") and parsed.path.endswith("/fail"):
                request_id = int(parsed.path.split("/")[3])
                self.fail_purchase_request(request_id)
            elif parsed.path.startswith("/api/books/") and parsed.path.endswith("/meeting"):
                book_id = int(parsed.path.split("/")[3])
                self.update_meeting(book_id)
            else:
                self._send_json(404, {"error": "找不到 API 路徑"})
        except ValueError:
            self._send_json(400, {"error": "路徑參數格式錯誤"})
        except sqlite3.IntegrityError as error:
            self._send_json(409, {"error": str(error)})
        except sqlite3.Error as error:
            self._send_json(500, {"error": str(error)})

    def register_user(self):
        data = self._read_json()
        if not self._require_fields(data, ["name", "email", "password"]):
            return

        role = data.get("role") or "student"
        if role not in ("student", "admin"):
            self._send_json(400, {"error": "角色只能是 student 或 admin"})
            return

        password_hash, password_salt = hash_password(data["password"])
        with connect_db() as connection:
            cursor = connection.execute(
                """
                INSERT INTO users (name, email, role, password_hash, password_salt)
                VALUES (?, ?, ?, ?, ?)
                """,
                (data["name"], data["email"], role, password_hash, password_salt),
            )
            user = connection.execute(
                "SELECT id, name, email, role, trust_score, trust_reset_month, is_suspended, created_at FROM users WHERE id = ?",
                (cursor.lastrowid,),
            ).fetchone()
        self._send_json(201, {"user": row_to_dict(user)})

    def get_current_user(self):
        with connect_db() as connection:
            user = self._auth_user(connection)
            if not user:
                self._send_json(401, {"error": "請先登入"})
                return
            if user["is_suspended"]:
                self._send_json(403, {"error": "此使用者已被停權"})
                return
        self._send_json(200, {"user": row_to_dict(user)})

    def login_user(self):
        data = self._read_json()
        if not self._require_fields(data, ["email", "password"]):
            return

        with connect_db() as connection:
            user = connection.execute("SELECT * FROM users WHERE email = ?", (data["email"],)).fetchone()
            if not user or not verify_password(data["password"], user["password_hash"], user["password_salt"]):
                self._send_json(401, {"error": "帳號或密碼錯誤"})
                return
            if user["is_suspended"]:
                self._send_json(403, {"error": "此使用者已被停權"})
                return

            reset_user_trust_if_needed(connection, user["id"])
            user = connection.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
            token = secrets.token_urlsafe(32)
            connection.execute("INSERT INTO sessions (token, user_id) VALUES (?, ?)", (token, user["id"]))

        self._send_json(
            200,
            {
                "token": token,
                "user": {
                    "id": user["id"],
                    "name": user["name"],
                    "email": user["email"],
                    "role": user["role"],
                    "trust_score": user["trust_score"],
                    "trust_reset_month": user["trust_reset_month"],
                },
            },
        )

    def list_books(self, query):
        keyword = query.get("q", [""])[0].strip()
        parameters = []
        where = ""
        if keyword:
            where = "WHERE b.title LIKE ? OR b.category LIKE ? OR b.condition_text LIKE ?"
            like = f"%{keyword}%"
            parameters = [like, like, like]

        with connect_db() as connection:
            rows = connection.execute(
                f"""
                SELECT b.*, u.name AS seller_name
                FROM books b
                JOIN users u ON u.id = b.seller_id
                {where}
                ORDER BY b.created_at DESC
                """,
                parameters,
            ).fetchall()
        self._send_json(200, {"books": [row_to_dict(row) for row in rows]})

    def create_book(self):
        data = self._read_json()
        required = ["title", "category", "price", "condition_text", "photo_note", "meeting_place"]
        if not self._require_fields(data, required):
            return

        discount = int(data.get("discount", 0))
        with connect_db() as connection:
            seller = self._current_user_or_id(connection, data, "seller_id")
            if not seller:
                return
            if seller["role"] not in ("student", "admin"):
                self._send_json(403, {"error": "只有學生使用者可以刊登書籍"})
                return

            next_number = connection.execute(
                "SELECT COALESCE(MAX(listing_number), 7000) + 1 AS next_number FROM books"
            ).fetchone()["next_number"]
            cursor = connection.execute(
                """
                INSERT INTO books
                  (listing_number, seller_id, title, category, price, discount, condition_text, photo_note, meeting_place)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    next_number,
                    seller["id"],
                    data["title"],
                    data["category"],
                    int(data["price"]),
                    discount,
                    data["condition_text"],
                    data["photo_note"],
                    data["meeting_place"],
                ),
            )
            book = connection.execute("SELECT * FROM books WHERE id = ?", (cursor.lastrowid,)).fetchone()
        self._send_json(201, {"book": row_to_dict(book)})

    def create_purchase_request(self):
        data = self._read_json()
        if not self._require_fields(data, ["book_id"]):
            return

        with connect_db() as connection:
            book = connection.execute("SELECT * FROM books WHERE id = ?", (data["book_id"],)).fetchone()
            buyer = self._current_user_or_id(connection, data, "buyer_id")
            if not book:
                self._send_json(404, {"error": "找不到書籍"})
                return
            if not buyer:
                return
            if buyer["role"] not in ("student", "admin"):
                self._send_json(403, {"error": "只有學生使用者可以送出購買需求"})
                return
            if book["seller_id"] == buyer["id"]:
                self._send_json(409, {"error": "不能購買自己刊登的書籍"})
                return
            if book["status"] != "未交易":
                self._send_json(409, {"error": "此書籍目前不是未交易狀態"})
                return

            cursor = connection.execute(
                "INSERT INTO purchase_requests (book_id, buyer_id) VALUES (?, ?)",
                (data["book_id"], buyer["id"]),
            )
        self._send_json(201, {"purchase_request_id": cursor.lastrowid, "status": "待賣方回覆"})

    def list_purchase_requests(self):
        with connect_db() as connection:
            user = self._auth_user(connection)
            if not user:
                self._send_json(401, {"error": "請先登入"})
                return
            if user["is_suspended"]:
                self._send_json(403, {"error": "此使用者已被停權"})
                return

            as_buyer = connection.execute(
                """
                SELECT
                  pr.id,
                  pr.book_id,
                  pr.status,
                  pr.meeting_time,
                  pr.created_at,
                  b.title AS book_title,
                  b.listing_number,
                  b.meeting_place,
                  u.name AS seller_name
                FROM purchase_requests pr
                JOIN books b ON b.id = pr.book_id
                JOIN users u ON u.id = b.seller_id
                WHERE pr.buyer_id = ?
                ORDER BY pr.created_at DESC
                """,
                (user["id"],),
            ).fetchall()
            as_seller = connection.execute(
                """
                SELECT
                  pr.id,
                  pr.book_id,
                  pr.status,
                  pr.meeting_time,
                  pr.created_at,
                  b.title AS book_title,
                  b.listing_number,
                  b.meeting_place,
                  u.name AS buyer_name,
                  u.trust_score AS buyer_trust_score
                FROM purchase_requests pr
                JOIN books b ON b.id = pr.book_id
                JOIN users u ON u.id = pr.buyer_id
                WHERE b.seller_id = ?
                ORDER BY pr.created_at DESC
                """,
                (user["id"],),
            ).fetchall()

        self._send_json(
            200,
            {
                "as_buyer": [row_to_dict(row) for row in as_buyer],
                "as_seller": [row_to_dict(row) for row in as_seller],
            },
        )

    def accept_purchase_request(self, request_id):
        data = self._read_json()
        meeting_time = data.get("meeting_time")
        if not meeting_time:
            self._send_json(400, {"error": "核准購買需求前必須選擇面交時間"})
            return
        with connect_db() as connection:
            seller = self._current_user_or_id(connection, data, "seller_id")
            if not seller:
                return
            request = connection.execute(
                """
                SELECT pr.*, b.seller_id, b.title, b.meeting_place, b.status AS book_status
                FROM purchase_requests pr
                JOIN books b ON b.id = pr.book_id
                WHERE pr.id = ?
                """,
                (request_id,),
            ).fetchone()
            if not request:
                self._send_json(404, {"error": "找不到購買需求"})
                return
            if request["seller_id"] != seller["id"]:
                self._send_json(403, {"error": "只有該書賣方可以核准購買需求"})
                return
            if request["status"] != "待賣方回覆" or request["book_status"] != "未交易":
                self._send_json(409, {"error": "只能核准待回覆且尚未交易的購買要求"})
                return

            unselected_requests = connection.execute(
                """
                SELECT id, buyer_id
                FROM purchase_requests
                WHERE book_id = ? AND id <> ? AND status = '待賣方回覆'
                """,
                (request["book_id"], request_id),
            ).fetchall()

            connection.execute("UPDATE books SET status = '交易中', updated_at = CURRENT_TIMESTAMP WHERE id = ?", (request["book_id"],))
            connection.execute(
                """
                UPDATE purchase_requests
                SET status = '賣方已核准', meeting_time = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (meeting_time, request_id),
            )
            connection.execute(
                """
                UPDATE purchase_requests
                SET status = '已取消', updated_at = CURRENT_TIMESTAMP
                WHERE book_id = ? AND id <> ? AND status = '待賣方回覆'
                """,
                (request["book_id"], request_id),
            )
            message = f"你的「{request['title']}」購買需求已被賣方核准。面交時間：{meeting_time or '尚未安排'}；面交地點：{request['meeting_place']}。"
            connection.execute(
                """
                INSERT INTO notifications (user_id, book_id, purchase_request_id, title, message)
                VALUES (?, ?, ?, ?, ?)
                """,
                (request["buyer_id"], request["book_id"], request_id, "購買需求已核准", message),
            )
            for unselected in unselected_requests:
                connection.execute(
                    """
                    INSERT INTO notifications (user_id, book_id, purchase_request_id, title, message)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (
                        unselected["buyer_id"],
                        request["book_id"],
                        unselected["id"],
                        "購買需求未被核准",
                        f"你對「{request['title']}」送出的購買需求未被核准，該書籍已被其他人購買。",
                    ),
                )

        self._send_json(200, {"status": "交易中", "message": "已核准購買需求並通知買方"})

    def fail_purchase_request(self, request_id):
        data = self._read_json()
        with connect_db() as connection:
            seller = self._current_user_or_id(connection, data, "seller_id")
            if not seller:
                return
            request = connection.execute(
                """
                SELECT pr.*, b.seller_id, b.title, b.meeting_place
                FROM purchase_requests pr
                JOIN books b ON b.id = pr.book_id
                WHERE pr.id = ?
                """,
                (request_id,),
            ).fetchone()
            if not request:
                self._send_json(404, {"error": "找不到購買需求"})
                return
            if request["seller_id"] != seller["id"]:
                self._send_json(403, {"error": "只有該書賣方可以標記交易失敗"})
                return
            if request["status"] not in ("賣方已核准", "交易完成"):
                self._send_json(409, {"error": "只有已核准或交易中的需求可以標記交易失敗"})
                return

            reset_user_trust_if_needed(connection, request["buyer_id"])
            buyer = connection.execute(
                "SELECT id, name, trust_score FROM users WHERE id = ?",
                (request["buyer_id"],),
            ).fetchone()
            next_trust = max(0, int(buyer["trust_score"]) - 1)

            connection.execute(
                "UPDATE books SET status = '未交易', updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (request["book_id"],),
            )
            connection.execute(
                """
                UPDATE purchase_requests
                SET status = '已取消', updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (request_id,),
            )
            connection.execute(
                """
                UPDATE users
                SET trust_score = ?, trust_reset_month = ?
                WHERE id = ?
                """,
                (next_trust, current_trust_month(), request["buyer_id"]),
            )

            suspended = next_trust == 0
            if suspended:
                connection.execute(
                    "UPDATE users SET is_suspended = 1 WHERE id = ?",
                    (request["buyer_id"],),
                )
                connection.execute(
                    "DELETE FROM sessions WHERE user_id = ?",
                    (request["buyer_id"],),
                )
                connection.execute(
                    """
                    UPDATE purchase_requests
                    SET status = '已取消', updated_at = CURRENT_TIMESTAMP
                    WHERE buyer_id = ? AND status IN ('待賣方回覆', '賣方已核准')
                    """,
                    (request["buyer_id"],),
                )
                connection.execute(
                    "DELETE FROM books WHERE seller_id = ?",
                    (request["buyer_id"],),
                )

            message = f"你的「{request['title']}」交易已由賣方標記為交易失敗，購買需求已取消。信任度剩餘：{next_trust}/3。"
            if suspended:
                message += " 因信任度已達 0，系統管理員已將帳號停權，並取消你的刊登書籍與購買需求。"
            connection.execute(
                """
                INSERT INTO notifications (user_id, book_id, purchase_request_id, title, message)
                VALUES (?, ?, ?, ?, ?)
                """,
                (request["buyer_id"], request["book_id"], request_id, "交易失敗通知", message),
            )

        self._send_json(
            200,
            {
                "status": "未交易",
                "buyer_trust_score": next_trust,
                "buyer_suspended": suspended,
                "message": "已標記交易失敗並通知買方",
            },
        )

    def update_meeting(self, book_id):
        data = self._read_json()
        if not self._require_fields(data, ["meeting_time", "meeting_place", "status"]):
            return

        with connect_db() as connection:
            seller = self._current_user_or_id(connection, data, "seller_id")
            if not seller:
                return
            book = connection.execute("SELECT * FROM books WHERE id = ?", (book_id,)).fetchone()
            if not book:
                self._send_json(404, {"error": "找不到書籍"})
                return
            if book["seller_id"] != seller["id"]:
                self._send_json(403, {"error": "只有該書賣方可以更新面交資訊"})
                return

            connection.execute(
                """
                UPDATE books
                SET meeting_place = ?, status = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
                """,
                (data["meeting_place"], data["status"], book_id),
            )
            approved = connection.execute(
                """
                SELECT * FROM purchase_requests
                WHERE book_id = ? AND status IN ('賣方已核准', '交易完成')
                ORDER BY updated_at DESC
                LIMIT 1
                """,
                (book_id,),
            ).fetchone()
            if approved:
                next_request_status = "交易完成" if data["status"] == "交易完成" else "賣方已核准"
                connection.execute(
                    """
                    UPDATE purchase_requests
                    SET status = ?, meeting_time = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                    """,
                    (next_request_status, data["meeting_time"], approved["id"]),
                )
                message = f"賣方已更新「{book['title']}」面交資訊。面交時間：{data['meeting_time']}；面交地點：{data['meeting_place']}。"
                connection.execute(
                    """
                    INSERT INTO notifications (user_id, book_id, purchase_request_id, title, message)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (approved["buyer_id"], book_id, approved["id"], "面交資訊已更新", message),
                )

        self._send_json(200, {"message": "面交資訊已更新"})

    def list_notifications(self, query):
        with connect_db() as connection:
            user = self._auth_user(connection)
            user_id = user["id"] if user else query.get("user_id", [None])[0]
            if not user_id:
                self._send_json(401, {"error": "請先登入"})
                return
            rows = connection.execute(
                """
                SELECT *
                FROM notifications
                WHERE user_id = ?
                ORDER BY created_at DESC
                """,
                (user_id,),
            ).fetchall()
        self._send_json(200, {"notifications": [row_to_dict(row) for row in rows]})


if __name__ == "__main__":
    init_db()
    if "--init-only" in sys.argv:
        print(f"Database initialized: {DB_PATH}")
        raise SystemExit(0)

    server = HTTPServer(("127.0.0.1", 8000), ApiHandler)
    print("API server running at http://127.0.0.1:8000")
    server.serve_forever()
