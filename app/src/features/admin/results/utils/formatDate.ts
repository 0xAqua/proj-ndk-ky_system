/**
 * UNIXタイムスタンプを日本語フォーマットの日時文字列に変換
 * @param timestamp UNIXタイムスタンプ（秒）
 * @returns フォーマット済み日時文字列（例: 2024/12/18 12:34:56）
 */
export const formatDate = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
};

/**
 * UNIXタイムスタンプを相対時間表示に変換
 * @param timestamp UNIXタイムスタンプ（秒）
 * @returns 相対時間（例: 3分前、2時間前、1日前）
 */
export const formatRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp * 1000;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}日前`;
    if (hours > 0) return `${hours}時間前`;
    if (minutes > 0) return `${minutes}分前`;
    return `${seconds}秒前`;
};