/**
 * リストを要約して1件目と残りの件数を返す
 */
export const summarizeList = (items: string[] | undefined, maxVisible = 1) => {
    const list = (items ?? []).filter(Boolean);
    if (list.length === 0) return { primary: "—", restCount: 0 };

    const visible = list.slice(0, maxVisible);
    const restCount = Math.max(list.length - visible.length, 0);

    return {
        primary: visible.join(" / "),
        restCount,
    };
};