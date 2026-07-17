PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
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
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_number INTEGER NOT NULL UNIQUE,
  seller_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price >= 0),
  discount INTEGER NOT NULL DEFAULT 0 CHECK (discount >= 0 AND discount <= 100),
  condition_text TEXT NOT NULL,
  photo_note TEXT NOT NULL,
  meeting_place TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '未交易' CHECK (status IN ('未交易', '交易中', '交易完成')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS purchase_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  buyer_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT '待賣方回覆' CHECK (status IN ('待賣方回覆', '賣方已核准', '已取消', '交易完成')),
  meeting_time TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  book_id INTEGER,
  purchase_request_id INTEGER,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL,
  FOREIGN KEY (purchase_request_id) REFERENCES purchase_requests(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_books_search ON books(title, category, condition_text);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_book ON purchase_requests(book_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at);
