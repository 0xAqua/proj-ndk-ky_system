import { Flex, Box, Image, IconButton, Text, Center, Separator, Spinner, Portal } from "@chakra-ui/react";
import { MenuRoot, MenuTrigger, MenuContent, MenuPositioner, MenuItem } from "@chakra-ui/react";
import { LuLogOut, LuChevronDown } from "react-icons/lu";
import { PiSidebarSimple, PiList } from "react-icons/pi";
import { Avatar } from "@/components/ui/avatar.tsx";
import logo from "@/assets/logo.jpg";

// ヘッダー部分
export const SidebarHeader = ({ isExpanded, onToggle }: { isExpanded: boolean; onToggle: () => void }) => (
    <Flex align="center" h="64px" px={2} mb={4} justifyContent={isExpanded ? "space-between" : "center"} mt={4}>
        {isExpanded && (
            <Flex align="center" gap={2} ml={2}>
                <Image src={logo} alt="Logo" h="62px" objectFit="contain" />
            </Flex>
        )}
        <IconButton aria-label="Toggle Menu" onClick={onToggle} variant="ghost" size="md" _hover={{ bg: "#ebe5db" }}>
            {isExpanded ? <PiSidebarSimple size={24} style={{ transform: "rotate(180deg)" }} /> : <PiList size={24} />}
        </IconButton>
    </Flex>
);

// ユーザーメニュー部分
export const UserMenu = ({ isExpanded, userInfo, isLoggingOut, onLogout }: any) => (
    <Box w="full" px={2} mt={2}>
        <MenuRoot>
            <MenuTrigger asChild>
                <Flex as="button" w="full" align="center" h="40px" borderRadius="lg" _hover={{ bg: "#ebe5db" }} cursor="pointer">
                    <Center w="48px" h="40px"><Avatar name={userInfo.name} size="xs" /></Center>
                    {isExpanded && (
                        <>
                            <Box flex={1} textAlign="left" ml={1} overflow="hidden">
                                <Text fontSize="xs" color="gray.500" truncate>{userInfo.email}</Text>
                            </Box>
                            <Box color="gray.400" mr={2}><LuChevronDown size={14} /></Box>
                        </>
                    )}
                </Flex>
            </MenuTrigger>
            <Portal>
                <MenuPositioner>
                    <MenuContent minW="220px" bg="#fffffe" zIndex={1000}>
                        <Box px={3} py={2}><Text fontSize="sm" color="gray.500">{userInfo.email}</Text></Box>
                        <Separator />
                        <MenuItem value="logout" color="red.600" onClick={onLogout} disabled={isLoggingOut} cursor="pointer">
                            {isLoggingOut ? <Spinner size="xs" /> : <LuLogOut />}
                            <Text fontWeight="bold">{isLoggingOut ? "ログアウト中..." : "ログアウト"}</Text>
                        </MenuItem>
                    </MenuContent>
                </MenuPositioner>
            </Portal>
        </MenuRoot>
    </Box>
);