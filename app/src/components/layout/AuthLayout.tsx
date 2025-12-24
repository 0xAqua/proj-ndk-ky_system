import { Flex, Box } from "@chakra-ui/react";
import {Outlet} from "react-router-dom";

export const AuthLayout = () => {
    return (
        <Flex minH="100vh" align="center" justify="center" px="4">
            <Box bg="white" p={6} borderRadius="lg" w="full" maxW="400px" mx="auto" boxShadow="md">
                <Outlet /> {/* ここに表示 */}
            </Box>
        </Flex>
    );
};