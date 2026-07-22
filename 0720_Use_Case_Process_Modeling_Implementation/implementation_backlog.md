# 0720 模型導向實作待辦

| 編號 | 待辦事項 | 來源模型/需求 | 範圍 | 狀態 | 備註 |
|---|---|---|---|---|---|
| IMP-0720-01 | 建立使用案例圖來源檔與 PNG | actor_goal_matrix、use_case_inventory | 文件/模型 | 已完成 | 已建立 `use_case_diagram_source/use_case_diagram.mmd`、`use_case_diagram_source/use_case_diagram.dot` 與 `use_case_diagram.png` |
| IMP-0720-02 | 建立 As-Is 與 To-Be 流程圖來源檔與 PNG | as_is_process、to_be_process | 文件/模型 | 已完成 | 已建立 `process_model_sources/as_is_process.mmd`、`process_model_sources/to_be_process.mmd`、`as_is_process.png` 與 `to_be_process.png` |
| IMP-0720-03 | 依 UC-03 檢查購買需求送出、取消與自有刊登不可購買 | UC-03、FR-03、BR-08、BR-10 | 程式驗收 | 已完成 | 已修正 0720 切片：送出需求通知賣方，取消需求不通知賣方，且賣方查看要求同步移除已取消需求 |
| IMP-0720-04 | 依 UC-04 檢查賣方刊登、折扣、面交地點與編輯 | UC-04、FR-04、FR-08、FR-09 | 程式驗收 | 已有 0714 基準 | 需在 0720 圖與測試中再次對齊 |
| IMP-0720-05 | 依 UC-05 檢查賣方查看要求、選擇買方、輸入面交時間與信箱通知 | UC-05、FR-05、FR-13 | 程式驗收 | 已有 0714 基準 | 需確認與 To-Be T-07 一致 |
| IMP-0720-06 | 依 UC-08 檢查交易失敗、信任度扣分與停權處理 | UC-08、FR-07、FR-14 | 程式驗收 | 已有 0714 基準 | 需確認與 To-Be T-09、T-10 一致 |
| IMP-0720-07 | 確認 traceability 中 US-15 編號不一致的處理方式 | model_consistency_matrix MC-03 | 文件 | 已完成 | 0720 不新增 US-15，已於一致性矩陣註明改以 US-07、US-14 與 FR-14 追蹤停權與通知 |
| IMP-0720-08 | 補上 0720 手動驗收證據 | manual_acceptance_test | 驗收 | 已完成 | 已同步 0714 已完成證據，並補上 0720 當日通知與查看要求截圖 |

## 本次不新增的項目

- 不新增金流、物流、跨校交易、手機原生 App、校方 SSO、真實身分驗證。
- 不把課程名稱搜尋或刊登必填列為已確認功能。
- 不新增 Project Charter v2 未列出的主要角色。
