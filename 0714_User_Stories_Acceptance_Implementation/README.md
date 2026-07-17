# 0714 使用者故事、驗收條件、需求排序與實作修正

## A. 小組基本資料

```text
課程名稱：系統分析與設計
日期：115/07/14
小組名稱：Group07
專案名稱：校內二手書面交預約系統
組員與分工：孫梓翔
GitHub 儲存庫連結：https://github.com/Raito411/TKU_114-3_SAD_Group07
7/13 成果資料夾連結：https://github.com/Raito411/TKU_114-3_SAD_Group07/tree/main/0713_Requirements_Code_Agent
0714 成果資料夾連結：https://github.com/Raito411/TKU_114-3_SAD_Group07/tree/main/0714_User_Stories_Acceptance_Implementation
```

## 今日完成內容

| 項目                          | 檔案或資料夾                                                            | 狀態 |
| ----------------------------- | ----------------------------------------------------------------------- | ---- |
| 0714 繳交總表                 | [0714.md](0714.md)                                                       | 已整合現有內容 |
| 使用者故事清單                | [user_stories.md](user_stories.md)                                       | 已依 0708、0713 文件初填 |
| 功能性需求清單                | [functional_requirements.md](functional_requirements.md)                 | 已依 0713 候選需求初填 |
| 非功能性需求清單              | [non_functional_requirements.md](non_functional_requirements.md)         | 已依 0713 候選需求初填 |
| 業務規則、資料需求與限制      | [business_rules_data_constraints.md](business_rules_data_constraints.md) | 已依 Project Charter v2 與 0713 文件初填 |
| 驗收條件                      | [acceptance_criteria.md](acceptance_criteria.md)                         | 已填正常、例外與邊界可驗收項目 |
| 需求品質檢查                  | [requirements_quality_review.md](requirements_quality_review.md)         | 已填進入條件與待確認問題 |
| 需求優先順序                  | [requirements_priority.md](requirements_priority.md)                     | 已依第一個可操作切片與範圍控制初填 |
| 需求文件包初稿                | [requirements_package_draft.md](requirements_package_draft.md)           | 已整理可追溯摘要 |
| 需求追溯矩陣初稿              | [traceability_matrix_draft.md](traceability_matrix_draft.md)             | 已初填 |
| 實作待辦清單                  | [implementation_backlog.md](implementation_backlog.md)                   | 已依第一個切片與後續任務初填 |
| 更新後實作任務書              | [updated_code_agent_brief.md](updated_code_agent_brief.md)               | 已填目前可確認內容 |
| 需求與畫面對照表              | [requirements_to_screen.md](requirements_to_screen.md)                   | 已依第一個切片畫面初填 |
| 手動驗收測試                  | [manual_acceptance_test.md](manual_acceptance_test.md)                   | 已依 0713 README 驗收方式初填 |
| 生成式 AI／程式碼代理使用紀錄 | [ai_code_agent_log.md](ai_code_agent_log.md)                             | 已更新 |
| 證據資料                      | [evidence/](evidence/)                                                   | 待放入截圖或測試證據 |
| 修正版或第二個可操作切片      | [revised_or_second_working_slice/](revised_or_second_working_slice/)     | 已新增賣方折扣、面交安排與交易狀態更新功能 |
| 正式資料庫後端版本            | [formal_database_backend/](formal_database_backend/)                     | 已建立 SQLite 資料庫、登入 API、書籍 API、購買需求 API 與通知 API |

## 本次選擇

本次選擇修正第一個切片或建立第二個切片：修正第一個切片並完成第二個可操作切片，新增賣方設定二手書折扣、面交安排與交易狀態更新。

## 如何開啟與操作

```text
開啟方式：直接用瀏覽器開啟 `revised_or_second_working_slice/index.html`。
操作步驟：
1. 賣方新增二手書資料。
2. 買方搜尋書籍。
3. 買方查看書籍詳細資料。
4. 買方送出購買需求。
5. 買賣雙方確認面交時間與地點。
6. 系統更新並顯示交易狀態。
```

## 驗收條件狀態

| 驗收條件 | 狀態 | 備註 |
| -------- | ---- | ---- |
| 賣方可以輸入書名、類別、價格、書況、照片說明與賣方指定面交地點；交易狀態由系統預設為未交易 | 已由修正版切片支援 | 已補 evidence：MAT-01 |
| 新增後的書籍會出現在書籍列表中 | 已由 0713 第一個切片支援 | 已補 evidence：MAT-02 |
| 買方可以依書名、類別或關鍵字搜尋書籍 | 已由 0713 第一個切片支援 | 已補 evidence：MAT-03 |
| 買方可以查看書籍詳細資料 | 已由 0713 第一個切片支援 | 已補 evidence：MAT-04 |
| 買方可以針對指定書籍送出購買需求，系統顯示送出成功或待賣方回覆狀態 | 已由 0713 第一個切片支援 | 已補 evidence：MAT-05 |
| 買賣雙方可以確認面交時間與地點，並更新交易狀態 | 已由第二個可操作切片支援 | 已補 evidence：MAT-06、MAT-10 |
| 非交易當事人不能看到面交時間與地點 | 已由第二個可操作切片以登入者與交易關係自動判斷 | 已補 evidence：MAT-08 |

## 已知限制

```text
0714 靜態切片與正式資料庫登入版本分開保存；formal_database_backend/ 已納入本期資料庫與自建註冊/登入版本。
本期仍不包含線上付款、第三方金流、物流、跨校交易、手機原生 App、學校正式單一登入、正式學校帳號或真實身分驗證。
目前 0714 修正版第一個可操作切片已新增賣方折扣功能，第二個可操作切片已新增面交安排、交易狀態更新與面交資訊隱私呈現；面交確認與交易狀態、使用者信箱已整理為獨立分頁。
commit 識別碼尚未填入。
```

## 本次提交紀錄

| 類型 | 提交訊息                             | Commit 識別碼 |
| ---- | ------------------------------------ | ------------- |
| docs | docs: 完成使用者故事與需求文件包初稿 |               |
| feat | feat: 完成第二個可操作切片           |               |
| test | test: 補上手動驗收測試與修正紀錄     |               |

## 今日完成檢查

| 成果                     | 完成 | 檔案或連結 | 尚待處理 |
| ------------------------ | ---- | ---------- | -------- |
| 使用者故事清單           | 是 | [user_stories.md](user_stories.md) | 需小組確認來源強度與待確認問題 |
| 功能性需求清單           | 是 | [functional_requirements.md](functional_requirements.md) | FR-08 已依使用者新增需求補入 |
| 非功能性需求清單         | 是 | [non_functional_requirements.md](non_functional_requirements.md) | NFR-03 到 NFR-05 已依現有原型、FR-08 與範圍限制補入 |
| 業務規則、資料需求與限制 | 是 | [business_rules_data_constraints.md](business_rules_data_constraints.md) | BR-03 已以信任度 0 停權規則呈現 |
| 驗收條件                 | 是 | [acceptance_criteria.md](acceptance_criteria.md) | 已補正常、例外與邊界情境 |
| 需求品質檢查             | 是 | [requirements_quality_review.md](requirements_quality_review.md) | 需後續人工確認 |
| 需求優先順序             | 是 | [requirements_priority.md](requirements_priority.md) | 需小組做最後決定 |
| 需求文件包初稿           | 是 | [requirements_package_draft.md](requirements_package_draft.md) | 需補 commit 識別碼 |
| 實作待辦清單             | 是 | [implementation_backlog.md](implementation_backlog.md) | 已同步 MAT-01 至 MAT-13 驗收狀態 |
| 更新後實作任務書         | 是 | [updated_code_agent_brief.md](updated_code_agent_brief.md) | 已填入本次完成目標與驗收結果 |
| 修正版或第二個可操作切片 | 是 | [revised_or_second_working_slice/](revised_or_second_working_slice/) | 已新增折扣、面交安排、交易狀態更新、使用者信箱與四分頁整理，並已補 MAT-01 至 MAT-10 evidence |
| 需求與畫面對照表         | 是 | [requirements_to_screen.md](requirements_to_screen.md) | 已同步修正版切片、信箱、正式資料庫與停權規則 |
| 手動驗收測試             | 是 | [manual_acceptance_test.md](manual_acceptance_test.md) | MAT-01 至 MAT-13 已標注通過並補齊證據或 API 測試紀錄 |
| GitHub 更新              | 部分 | 本資料夾 | 尚未填 commit 識別碼 |
| 生成式 AI 使用紀錄       | 是 | [ai_code_agent_log.md](ai_code_agent_log.md) | 已更新 |
