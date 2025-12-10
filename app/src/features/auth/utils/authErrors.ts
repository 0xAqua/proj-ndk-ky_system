export const getAuthErrorMessage = (error: any): string => {
    // AWS SDKやAmplifyのエラーは code または name プロパティにエラーコードが入ります
    const code = error.code || error.name;

    switch (code) {
        case 'NotAuthorizedException':
            return 'メールアドレスまたはパスワードが正しくありません。';

        case 'UserNotFoundException':
            // 通常は発生しませんが、念のため NotAuthorizedException と同じ扱いにして隠蔽します
            return 'メールアドレスまたはパスワードが正しくありません。';

        case 'PasswordResetRequiredException':
            return 'パスワードの再設定が必要です。';

        case 'UserNotConfirmedException':
            return 'アカウントが確認されていません。メールをご確認ください。';

        case 'LimitExceededException':
        case 'TooManyRequestsException': // WAFやCognitoのレートリミットで返る場合があります
            return '試行回数が上限を超えました。しばらく時間をおいて再試行してください。';

        case 'CodeMismatchException':
            return '認証コードが正しくありません。';

        case 'ExpiredCodeException':
            return '認証コードの有効期限が切れています。再度コードをリクエストしてください。';

        default:
            console.error('Unknown Auth Error:', error); // 開発用ログ
            return 'システムエラーが発生しました。しばらく時間をおいて再試行してください。';
    }
};