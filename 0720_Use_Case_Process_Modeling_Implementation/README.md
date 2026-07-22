# 0720 使用案例流程建模與程式碼代理實作

## A. 小組基本資料

```text
課程名稱：系統分析與設計
日期：115/07/20
小組名稱：Group07
專案名稱：校內二手書面交預約系統
組員與分工：孫梓翔
GitHub 儲存庫連結：https://github.com/Raito411/TKU_114-3_SAD_Group07
需求文件包版本：0714_User_Stories_Acceptance_Implementation
現有可操作切片版本：0714_User_Stories_Acceptance_Implementation/revised_or_second_working_slice
```

## 今日分析範圍

本次以 0708 Project Charter v2 與 0714 已整理的使用者故事、功能需求、驗收條件、商業規則、資料限制與第二個可操作切片為基準，建立 0720 使用案例與流程模型文件。

範圍包含：註冊登入、正式資料庫、賣方刊登與編輯書籍、折扣百分比、買方搜尋與查看詳細資料、購買需求送出與取消、賣方選擇買方與設定面交時間、信箱通知、交易狀態、交易失敗、信任度與停權處理。

## 主要參與者與使用案例

主要參與者為買方學生、賣方學生、學生使用者與系統管理員。使用案例已整理於 [actor_goal_matrix.md](actor_goal_matrix.md)、[use_case_inventory.md](use_case_inventory.md) 與 [use_case_descriptions.md](use_case_descriptions.md)。

## 現況問題與目標改善摘要

現況問題包含二手書資訊分散、交易狀態不明確、面交確認反覆溝通、非交易當事人可能看到面交資訊，以及缺乏集中資料處理交易失敗或停權。

目標流程透過集中書籍列表、搜尋與詳細資料、購買需求狀態、信箱通知、正式資料庫、角色可見性與信任度規則改善上述問題。

## 本次實作選擇與操作方式

目前以 0714 第二個可操作切片作為既有實作基準，0720 先完成模型化與一致性檢查。若後續需要第三個可操作切片，應從 [implementation_backlog.md](implementation_backlog.md) 中的模型缺口挑選，不新增前面文件未提及的功能。

## 已通過與未通過的驗收條件

0714 已有基準驗收項目，0720 已整理成 [manual_acceptance_test.md](manual_acceptance_test.md)。0720 當日若新增第三個切片或重新操作測試，仍需補上新的截圖證據。

## 已知限制與待確認問題

- 課程名稱是否納入搜尋或刊登必填欄位仍待確認。
- 買方送出購買需求時會通知賣方；取消需求時不通知賣方。
- 0714 traceability matrix 曾出現 US-15，但 user_stories.md 未列出 US-15，需修正追蹤編號。
- 使用案例圖、As-Is 流程圖與 To-Be 流程圖的圖檔已建立。
- 範圍外仍包含跨校交易、線上付款、第三方金流、手機原生 App、物流寄送、校方 SSO、真實身分驗證、自動估價、糾紛仲裁與付費服務。

## 成果連結

| 成果 | 檔案或資料夾 | 狀態 |
| --- | --- | --- |
| 0720 繳交總表 | [0720.md](0720.md) | 已整理 |
| 參與者目標矩陣 | [actor_goal_matrix.md](actor_goal_matrix.md) | 已整理 |
| 使用案例清單 | [use_case_inventory.md](use_case_inventory.md) | 已整理 |
| 使用案例圖 | `use_case_diagram.png` | 已建立 |
| 使用案例圖原始檔 | [use_case_diagram_source/](use_case_diagram_source/) | 已建立 Mermaid 與 DOT 來源檔 |
| 使用案例描述 | [use_case_descriptions.md](use_case_descriptions.md) | 已整理 |
| 現況流程模型 | `as_is_process.png` | 已建立 |
| 目標流程模型 | `to_be_process.png` | 已建立 |
| 流程模型原始檔 | [process_model_sources/](process_model_sources/) | 已建立 |
| 流程問題與改善對照 | [process_problem_improvement.md](process_problem_improvement.md) | 已整理 |
| 流程資料交換表 | [process_data_exchange.md](process_data_exchange.md) | 已整理 |
| 模型一致性矩陣 | [model_consistency_matrix.md](model_consistency_matrix.md) | 已整理 |
| 模型驅動實作待辦 | [implementation_backlog.md](implementation_backlog.md) | 已整理 |
| 更新後程式碼代理任務書 | [updated_code_agent_brief.md](updated_code_agent_brief.md) | 已整理 |
| 手動驗收測試 | [manual_acceptance_test.md](manual_acceptance_test.md) | 已整理 |
| 生成式 AI 使用紀錄 | [ai_code_agent_log.md](ai_code_agent_log.md) | 已整理 |
| 證據資料 | [evidence/](evidence/) | 已同步 0714 evidence，並補上 0720 賣方信箱收到新需求通知與賣方查看要求截圖 |
| 修正版或第三個可操作切片 | [revised_or_third_working_slice/](revised_or_third_working_slice/) | 已建立修正版既有切片 |

## 本次提交紀錄

| 類型 | 提交訊息 | Commit 識別碼 |
| --- | --- | --- |
| feat | feat: add 0720 use case process implementation | 45d040d0770cb3e75cd6f89b5be456470f03e4dd |
| test | JS 語法檢查與 Python 語法檢查 | 已納入 45d040d0770cb3e75cd6f89b5be456470f03e4dd |
| docs | docs: record 0720 commit metadata | c78ea95519faaec5e5345243934c32a0ebb7d66a |
