import { useEffect } from 'react';
import { Box, Heading, Text, VStack, Code, Spinner, Button } from '@chakra-ui/react';
import { useUserStore } from '../stores/useUserStore';
import { api } from '../lib/api';
import { signOut } from 'aws-amplify/auth';
import { useNavigate } from 'react-router-dom';

const EntryPage = () => {
// Storeから状態とアクションを取り出す
    const { tenantId, tenantUser, setUserData, isLoading, setLoading } = useUserStore();
    const navigate = useNavigate();

    useEffect(() => {
        // 画面が開かれたらデータを取りに行く
        const fetchData = async () => {
            // すでにデータがあるなら再取得しない（無駄な通信削減）
            if (tenantId) return;

            setLoading(true);
            try {
                // s1 API を叩く (ヘッダーは lib/api.ts が勝手につけてくれる！)
                const response = await api.get('/me');

                console.log("API Response:", response.data);

                // Storeに保存
                setUserData(response.data);
            } catch (error) {
                console.error("Failed to fetch user data:", error);
                alert("データ取得に失敗しました");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [tenantId, setUserData, setLoading]);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" h="100vh">
                <Spinner size="xl" />
            </Box>
        );
    }

    return (
        <Box p={8}>
            <VStack gap={6} align="start">
                <Heading>ようこそ、{tenantUser?.tenant_name || "ゲスト"} さん</Heading>

                <Box p={4} borderWidth={1} borderRadius="md" w="full" bg="gray.50">
                    <Text fontWeight="bold" mb={2}>Storeの中身確認:</Text>
                    <Text>テナントID: <Code>{tenantId}</Code></Text>
                    <Text>ユーザーID: <Code>{useUserStore.getState().userId}</Code></Text>

                    <Text mt={4} fontWeight="bold">取得した全データ (DynamoDB):</Text>
                    {/* JSONを整形して表示 */}
                    <Code display="block" whiteSpace="pre" p={2} mt={2}>
                        {JSON.stringify(tenantUser, null, 2)}
                    </Code>
                </Box>

                <Button colorPalette="red" onClick={handleLogout}>
                    ログアウト
                </Button>
            </VStack>
        </Box>
    );
};

export default EntryPage;