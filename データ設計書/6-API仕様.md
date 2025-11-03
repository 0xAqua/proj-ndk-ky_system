# 6. API仕様

## 6-1. 共有仕様

>本節は **Cognito でログインして JWT を取得済み** のクライアントが呼び出す **認可済み API** の共通ルールを定義する。
> 認証フロー（Hosted UI / Auth Code + PKCE 等）は別節で扱う。

### エンドポイント

- 形式：`https://api.<tenant-domain>/v1/*`（Route 53 / CloudFront / API Gateway 経由）
- バージョニング：`/v1` をパスに付与

