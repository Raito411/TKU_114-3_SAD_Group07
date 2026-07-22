# 正式資料庫版本

此資料夾是正式資料庫實作，不取代原本的靜態前端切片。

## 技術選擇

- Python 標準函式庫
- SQLite 永久資料庫檔：`secondhand_books.sqlite3`
- REST API：`server.py`
- Schema：`schema.sql`

## 資料表

| 資料表 | 用途 |
| --- | --- |
| `users` | 學生、系統管理員帳號、信任度、信任度重設月份與停權狀態；學生帳號可同時買或賣二手書 |
| `sessions` | 登入後的 session token |
| `books` | 賣方刊登書籍資料、折扣、面交地點與交易狀態 |
| `purchase_requests` | 買方購買需求、賣方核准、取消與交易完成狀態 |
| `notifications` | 每位使用者信箱中的通知；買方送出購買需求會寫入賣方信箱，賣方核准或更新面交資訊後會寫入買方信箱 |

## 啟動

```bash
cd /Users/artis/Documents/GitHub/TKU_114-3_SAD_Group07/0720_Use_Case_Process_Modeling_Implementation/formal_database_backend
python3 server.py
```

初始化資料庫但不啟動伺服器：

```bash
python3 server.py --init-only
```

## 主要 API

| 方法 | 路徑 | 用途 |
| --- | --- | --- |
| `GET` | `/login.html` | 開啟正式註冊/登入操作頁 |
| `POST` | `/api/register` | 建立學生或管理員帳號，預設為學生帳號 |
| `POST` | `/api/login` | 登入並取得 token |
| `GET` | `/api/me` | 依 token 取得目前登入使用者 |
| `GET` | `/api/books?q=關鍵字` | 搜尋書籍 |
| `POST` | `/api/books` | 登入學生刊登書籍 |
| `POST` | `/api/purchase-requests` | 登入學生送出購買需求，並通知該書賣方 |
| `GET` | `/api/purchase-requests` | 查詢自己送出與收到的購買需求，賣方可看到有效要求人的姓名與發送要求時間 |
| `POST` | `/api/purchase-requests/{id}/cancel` | 買方取消尚未核准的購買需求，不通知賣方，並從賣方查看要求清單移除 |
| `POST` | `/api/purchase-requests/{id}/accept` | 賣方核准指定買方的購買需求，通知被核准買方，並通知未被選到買方書籍已被其他人購買 |
| `POST` | `/api/purchase-requests/{id}/fail` | 賣方標記交易失敗，通知買方、取消需求、書籍恢復未交易並扣買方信任度 |
| `POST` | `/api/books/{id}/meeting` | 賣方更新面交時間、地點與交易狀態 |
| `GET` | `/api/mailbox` | 登入使用者查看自己的信箱 |
| `GET` | `/api/notifications?user_id={id}` | 舊版通知查詢 API，保留相容性 |

## 範圍說明

此版本已具備正式資料庫、自建註冊/登入頁、登入 session、學生刊登書籍、學生送出購買需求並通知賣方、買方取消需求不通知賣方且同步移除賣方查看要求紀錄、賣方核准需求、賣方標記交易失敗、使用者信任度、信任度 0 停權與每位使用者自己的信箱。系統不串接學校正式單一登入、正式學校帳號或真實身分驗證。
