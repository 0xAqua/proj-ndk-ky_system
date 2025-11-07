# 6. API仕様

本章では、各 DynamoDB テーブル（`TenantUserMaster`、`ConstructionMaster`、`ComponentLabelMaster`）に対して提供される。 APIエンドポイントの仕様を定義します。
 APIはすべて **AWS Lambda + API Gateway** を介して提供され、認証には **Amazon Cognito** を利用します。

## 6-1. 共通仕様

| 項目               | 内容                                                         |
| ------------------ | ------------------------------------------------------------ |
| **ベースURL**      | `https://api.<domain>.com/v1/`                               |
| **認証方式**       | Cognito                                                      |
| **リクエスト形式** | JSON（`application/json`）                                   |
| **レスポンス形式** | JSON（`application/json`）                                   |
| **HTTPステータス** | 200: 正常、400: 不正リクエスト、401: 認証エラー、404: 未検出、500: サーバーエラー |
| **タイムアウト**   | 30秒（Lambda設定値に依存）                                   |
| **権限制御**       | テナントごとに Cognito グループ（Admin / User）で制御        |

## 6-2. `TenantUserMaster` 関連 API

※12月の段階で作成予定はない

| No.    | API名            | HTTPメソッド | エンドポイント                                 | 説明                                        |
| ------ | ---------------- | ------------ | ---------------------------------------------- | ------------------------------------------- |
| TU-001 | テナント情報取得 | GET          | `/tenant/{tenant_id}`                          | 指定テナントの基本情報を取得                |
| TU-002 | ユーザー一覧取得 | GET          | `/tenant/{tenant_id}/users`                    | テナント配下の全ユーザーを取得              |
| TU-003 | ユーザー情報取得 | GET          | `/tenant/{tenant_id}/users/{user_id}`          | 指定ユーザーの詳細情報を取得                |
| TU-004 | ユーザー登録     | POST         | `/tenant/{tenant_id}/users`                    | 新規ユーザーを登録                          |
| TU-005 | ユーザー更新     | PUT          | `/tenant/{tenant_id}/users/{user_id}`          | ユーザー情報を更新                          |
| TU-006 | ユーザー削除     | DELETE       | `/tenant/{tenant_id}/users/{user_id}`          | ユーザーを論理削除                          |
| TU-007 | ログインID検索   | GET          | `/tenant/{tenant_id}/users?loginId={login_id}` | ログインIDからユーザー情報を検索（GSI利用） |

## 6-3. `TenantConstructionMaster` 関連 API

| No.    | API名              | HTTPメソッド | エンドポイント                                               | 説明                                 |
| ------ | ------------------ | ------------ | ------------------------------------------------------------ | ------------------------------------ |
| CM-001 | 部門一覧取得       | GET          | `/tenant/{tenant_id}/construction/departments`               | すべての部門を取得                   |
| CM-002 | 工事種別取得       | GET          | `/tenant/{tenant_id}/construction/{dept_id}/types`           | 指定部門配下の工事種別を取得         |
| CM-003 | 工程一覧取得       | GET          | `/tenant/{tenant_id}/construction/{type_id}/projects`        | 指定工事種別配下の工程を取得         |
| CM-004 | 作業一覧取得       | GET          | `/tenant/{tenant_id}/construction/{project_id}/tasks`        | 指定工程配下の作業一覧を取得         |
| CM-005 | 機材一覧取得       | GET          | `/tenant/{tenant_id}/construction/{task_id}/equipments`      | 指定作業配下の機材一覧を取得         |
| CM-006 | 現場条件一覧取得   | GET          | `/tenant/{tenant_id}/construction/site-conditions`           | すべての現場条件を取得               |
| CM-007 | 現場条件詳細取得   | GET          | `/tenant/{tenant_id}/construction/site-conditions/{site_id}/details` | 指定現場条件の詳細を取得             |
| CM-008 | その他設備一覧取得 | GET          | `/tenant/{tenant_id}/construction/other-equipments`          | その他設備の一覧を取得               |
| CM-009 | その他設備詳細取得 | GET          | `/tenant/{tenant_id}/construction/other-equipments/{equip_id}/details` | 指定その他設備の詳細を取得           |
| CM-010 | マスタ登録／更新   | POST／PUT    | `/tenant/{tenant_id}/construction`                           | マスタデータ（任意階層）を登録・更新 |
| CM-011 | マスタ削除         | DELETE       | `/tenant/{tenant_id}/construction/{nodePath}`                | マスタデータを論理削除               |

## 6-4. `ComponentLabelMaster` 関連 API

| No.    | API名                  | HTTPメソッド | エンドポイント                                           | 説明                                                        |
| ------ | ---------------------- | ------------ | -------------------------------------------------------- | ----------------------------------------------------------- |
| CL-001 | 全UI設定取得           | GET          | `/tenant/{tenant_id}/components`                         | テナントに登録された全UI設定を取得                          |
| CL-002 | コンポーネント取得     | GET          | `/tenant/{tenant_id}/components/{component_key}`         | 指定コンポーネントの設定を取得                              |
| CL-003 | ラベル文言更新         | PUT          | `/tenant/{tenant_id}/components/{component_key}/label`   | ラベル名を更新                                              |
| CL-004 | コンポーネント種別更新 | PUT          | `/tenant/{tenant_id}/components/{component_key}/type`    | コンポーネントタイプ（CheckBox／ComboBox／TextBox等）を更新 |
| CL-005 | 表示制御更新           | PUT          | `/tenant/{tenant_id}/components/{component_key}/visible` | 表示／非表示設定を更新                                      |
| CL-006 | 上限値設定             | PUT          | `/tenant/{tenant_id}/components/{component_key}/max`     | TextBox等の上限数（最大10）を設定                           |
|        |                        |              |                                                          |                                                             |

## 6-5. 共通エラーレスポンス例

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The field 'label_value' is required.",
    "timestamp": "2025-11-04T10:15:00Z"
  }
}

```

## 6-6. 今後の拡張方針

- **認可制御:**
   `ComponentLabelMaster` の更新系APIは管理者ロールのみに制限。
- **メニュー:**
  ユーザー登録などの処理を追加
