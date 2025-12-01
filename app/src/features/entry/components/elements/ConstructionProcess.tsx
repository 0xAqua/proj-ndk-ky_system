import { Box, Spinner, Text, Code } from "@chakra-ui/react"; // 最小限のUI
import { useConstructionMaster } from "@/features/entry/hooks/useConstructionMaster";

// 親から渡されるProps（選択状態管理用）
type Props = {
    value: string[];
    onChange: (value: string[]) => void;
};

export const ConstructionProcess = ({ value, onChange }: Props) => {
    // カスタムフックを使ってデータを取得
    const { types, isLoading, error } = useConstructionMaster();

    if (isLoading) {
        return (
            <Box p={4} bg="gray.100">
                <Spinner size="sm" mr={2} /> データを取得中...
            </Box>
        );
    }

    if (error) {
        return <Text color="red.500">{error}</Text>;
    }

    if (types.length === 0) {
        return <Text>表示可能な工事種別がありません。</Text>;
    }

    return (
        <div style={{ border: "2px solid blue", padding: "10px", margin: "10px 0" }}>
            <h3>🚧 取得できた工事種別一覧 (ConstructionType)</h3>
            <p style={{ fontSize: "12px", color: "#666" }}>
                Storeの部署情報に基づいてフィルタリング済み
            </p>

            <ul>
                {types.map((type) => (
                    <li key={type.id} style={{ margin: "5px 0", borderBottom: "1px solid #eee" }}>
                        {/* 動作確認用: クリックで選択状態を切り替える簡易ロジック */}
                        <label style={{ display: "flex", alignItems: "center", cursor: "pointer" }}>
                            <input
                                type="checkbox"
                                checked={value.includes(type.id)}
                                onChange={() => {
                                    const next = value.includes(type.id)
                                        ? value.filter(v => v !== type.id)
                                        : [...value, type.id];
                                    onChange(next);
                                }}
                                style={{ marginRight: "10px" }}
                            />
                            <span>
                                <strong>{type.name}</strong>
                                <span style={{ fontSize: "10px", color: "gray", marginLeft: "8px" }}>
                                    (所属: {type.deptName})
                                </span>
                            </span>
                        </label>
                    </li>
                ))}
            </ul>

            {/* デバッグ用: 生データ表示 */}
            <details style={{ marginTop: "10px" }}>
                <summary>Raw JSON Data</summary>
                <Code display="block" whiteSpace="pre" p={2} fontSize="xs">
                    {JSON.stringify(types, null, 2)}
                </Code>
            </details>
        </div>
    );
};