import type {ReactNode} from 'react';
import { Box } from '@chakra-ui/react';
import { AdminSidebar } from "../elements/AdminSidebar";

type AdminLayoutProps = {
    children: ReactNode;
};

export const AdminLayout = ({ children }: AdminLayoutProps) => {
    return (
        // 1. flexDirectionを "row"（横並び）に変更
        <Box minH="100vh" display="flex" flexDirection="row">

            {/* サイドバー（左側） */}
            <AdminSidebar />

            <Box flex="1" p={8} overflowY="auto">
                {children}
            </Box>

        </Box>
    );
};