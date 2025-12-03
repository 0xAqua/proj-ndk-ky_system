import type {ReactNode} from "react";
import { Flex, Box } from "@chakra-ui/react";

type Props = {
    children: ReactNode;
};

export const AuthLayout = ({ children }: Props) => {
    return (
        <Flex
            minH="100vh"
            align="center"
            justify="center"
            px="4"
        >
            <Box
                bg="white"
                p={6}
                borderRadius="lg"
                w="full"
                maxW="400px"
                mx="auto"
                boxShadow="md"
            >
                {children}
            </Box>
        </Flex>
    );
};