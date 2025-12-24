import { Box, Container } from '@chakra-ui/react';
import { Header } from '../elements/Header.tsx';
import {Outlet} from "react-router-dom";

export const MainLayout = () => {
    return (
        <Box minH="100vh" display="flex" flexDirection="column" p={4}>
            <Header />
            <Box flex="1" py={8} as="main">
                <Container maxW="480px" p={0}>
                    <Outlet /> {/* ここに表示 */}
                </Container>
            </Box>
        </Box>
    );
};