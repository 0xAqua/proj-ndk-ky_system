import { Box, Flex, VStack } from "@chakra-ui/react";
import { useAdminSidebar } from "@/hooks/useAdminSidebar";
import { SidebarHeader, UserMenu } from "@/components/elements/SidebarComponents";
import { NavItem } from "@/components/elements/NavItem";
import { PiSquaresFour, PiUsers, PiListChecks, PiDatabase, PiSparkle, PiFileText, PiPencilSimple, PiGear } from "react-icons/pi";

export const AdminSidebar = () => {
    const { authState, userInfo, isExpanded, isLoggingOut, toggleExpanded, handleLogout } = useAdminSidebar();

    if (authState === "unauthenticated") return null;

    return (
        <Box
            as="aside"
            w={isExpanded ? "240px" : "64px"}
            h="100vh"
            borderRightWidth="1px"
            position="sticky"
            top={0}
            transition="width 0.3s cubic-bezier(0.2, 0, 0, 1)"
            zIndex={20}
        >
            <Flex direction="column" h="full">
                <SidebarHeader isExpanded={isExpanded} onToggle={toggleExpanded} />

                <VStack gap={0} flex={1} w="full" align="flex-start" overflowX="hidden" mt={4}>
                    <NavItem to="/admin/sample" icon={PiSquaresFour} label="ダッシュボード" isExpanded={isExpanded} />
                    <NavItem to="/admin/users" icon={PiUsers} label="ユーザー管理" isExpanded={isExpanded} />
                    <NavItem to="/admin/results" icon={PiListChecks} label="結果一覧" isExpanded={isExpanded} />
                    <NavItem to="/admin/master" icon={PiDatabase} label="工事マスタ管理" isExpanded={isExpanded} />
                    <NavItem to="/admin/advanced-settings" icon={PiSparkle} label="高度な設定" isExpanded={isExpanded} />
                    <NavItem to="/admin/logs" icon={PiFileText} label="ログ管理" isExpanded={isExpanded} />
                </VStack>

                <VStack gap={0} mb={4} w="full" align="flex-start" overflowX="hidden">
                    <Box w="full" px={2}><Box w="full" h="1px" bg="gray.200" my={2} /></Box>
                    <NavItem to="/entry" icon={PiPencilSimple} label="新規登録" isExpanded={isExpanded} isExternal iconColor="white" iconBg="orange.500" />
                    <NavItem to="/settings" icon={PiGear} label="システム設定" isExpanded={isExpanded} />
                    <UserMenu isExpanded={isExpanded} userInfo={userInfo} isLoggingOut={isLoggingOut} onLogout={handleLogout} />
                </VStack>
            </Flex>
        </Box>
    );
};