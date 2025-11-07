# DynamoDBテーブル定義書

本章では、本システムで利用する DynamoDB テーブル構成について定義します。
第3章で示した設計方針（方針①〜③）に基づき、マルチテナント構成下で利用される3つのテーブルのキー構成・属性・用途を明確化します。

## 5-1. `TenantUserMaster`

| 項目                         | 内容                                                         |
| ---------------------------- | ------------------------------------------------------------ |
| **テーブル名**               | `TenantUserMaster`                                           |
| **用途**                     | テナント情報およびユーザー情報を統合して管理。テナント設定、ユーザー認証、アクセス権限などを保持。 |
| **パーティションキー（PK）** | `tenant_id`：テナントを一意に識別。                          |
| **ソートキー（SK）**         | `record_id`：個別レコード識別子。形式例：`TENANT#0001`, `USER#A001` |
| **主な属性**                 |                                                              |
| ├ `type`                     | データ種別（`TENANT`／`USER`）                               |
| ├ `name`                     | テナント名またはユーザー名                                   |
| ├ `domain`                   | テナントドメイン情報（テナント情報の場合のみ）               |
| ├ `department_id`            | 所属部門ID（工事マスタと連携）                               |
| ├ `role`                     | 権限レベル（一般／管理者など）：今後                         |
| ├ `email`                    | メールアドレス                                               |
| ├ `status`                   | 状態（`active`／`inactive`）                                 |
| ├ `createdAt`                | 登録日時（ISO 8601 UTC）                                     |
| ├ `updatedAt`                | 更新日時（ISO 8601 UTC）                                     |
| **GSI**                      | `login_id-index`（ログインIDによるユーザー検索）             |
| **削除方針**                 | 論理削除（`status = inactive`）を基本とし、物理削除は定期バッチで実施。 |
| **備考**                     | テナント／ユーザーの双方を統合管理する Key-Value ストア。    |

## 5-2. `TenantConstructionMaster`

| **テーブル名**               | `TenantConstructionMaster`                                   |
| ---------------------------- | ------------------------------------------------------------ |
| **用途**                     | 入力画面で利用される階層型マスタ（部門、工種、工程、作業、機材、現場条件、その他設備）を管理。 |
| **パーティションキー（PK）** | `tenant_id`：テナントを一意に識別。                          |
| **ソートキー（SK）**         | `nodePath`：階層パス（例：`DEPT#1#TYPE#1#PROJ#1`）。         |
| **主な属性**                 |                                                              |
| ├ `type`                     | アイテム種別（`Department`／`ConstructionType`／`Task`／`Equipment`／`SiteCondition`／`OtherEquipment` など） |
| ├ `name`                     | 表示名                                                       |
| ├ `order`                    | 表示順                                                       |
| ├ `status`                   | 状態（`active`／`inactive`）                                 |
| ├ `createdAt`                | 登録日時（ISO 8601 UTC）                                     |
| ├ `updatedAt`                | 更新日時（ISO 8601 UTC）                                     |
| **アクセス方法**             | `Query`（`begins_with(nodePath, ...)`）により階層単位で取得。 |
| **削除方針**                 | 論理削除（`status = inactive`）。                            |
| **備考**                     | 隣接リストパターン（Adjacency List Pattern）を採用し、階層データを表現。 |

## 5-3. `ComponentLabelMaster`

| 項目                         | 内容                                                         |
| ---------------------------- | ------------------------------------------------------------ |
| **テーブル名**               | `ComponentLabelMaster`                                       |
| **用途**                     | テナント単位で UI コンポーネント（ラベル、入力形式、タイプ等）の構成を管理。 |
| **パーティションキー（PK）** | `tenant_id`：テナントを一意に識別。                          |
| **ソートキー（SK）**         | `component_key`：コンポーネント識別キー（例：`FORM#SAFETY#CHECK1`）。 |
| **主な属性**                 |                                                              |
| ├ `component_type`           | コンポーネント種別（`TEXTBOX`, `CHECKBOX`, `COMBOBOX` 等）   |
| ├ `label_value`              | 表示ラベル文言                                               |
| ├ `is_visible`               | 表示／非表示制御                                             |
| ├ `is_required`              | 入力必須フラグ                                               |
| ├ `max_count`                | 可変コンポーネント上限（最大10）                             |
| ├ `locale`                   | 言語コード（`ja-JP`, `en-US` など）                          |
| ├ `updatedBy`                | 最終更新者ID                                                 |
| ├ `updatedAt`                | 更新日時（ISO 8601 UTC）                                     |
| **アクセス方法**             | `GetItem`, `Query`, `UpdateItem` を使用。                    |
| **削除方針**                 | 論理削除（`is_visible = false`）。                           |
| **備考**                     | 候補値は保持せず、フロントエンド側で制御。UIの見た目や動作設定のみ管理。 |