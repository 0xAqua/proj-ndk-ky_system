import type {ReactNode} from 'react';
import { Box, Container } from '@chakra-ui/react';
import { Header } from './Header';

type MainLayoutProps = {
    children: ReactNode;
};

export const MainLayout = ({ children }: MainLayoutProps) => {
    return (
        <Box minH="100vh" display="flex" flexDirection="column" p={4}>

            <Header />

            <Box flex="1" py={8} as="main">

                <Container
                    maxW="480px"
                    p={0}
                >
                    {children}
                </Container>
            </Box>

        </Box>
    );
};