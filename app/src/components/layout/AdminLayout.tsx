import { Box } from '@chakra-ui/react';
import { AdminSidebar } from "../elements/AdminSidebar";
import {Outlet} from "react-router-dom";


export const AdminLayout = () => { // childrenプロップスは不要になります
    return (
        <Box minH="100vh" display="flex" flexDirection="row">
            <AdminSidebar />
            <Box flex="1" p={8} overflowY="auto">
                <Outlet /> {/* ここに子ルートが表示される */}
            </Box>
        </Box>
    );
};