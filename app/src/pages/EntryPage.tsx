import { MainLayout } from "@/components/layout/MainLayout.tsx";
import { Text } from "@chakra-ui/react"; // 例としてTextをインポート

const EntryPage = () => {
    return (
        <MainLayout>
            <Text>Hello World</Text>
        </MainLayout>

    );
};

export default EntryPage;