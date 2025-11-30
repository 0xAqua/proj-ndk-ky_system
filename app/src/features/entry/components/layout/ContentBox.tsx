import React from 'react';
import { Box } from "@chakra-ui/react"

type ContentBoxProps = {
    children: React.ReactNode;
}

//**
// maxW="xs" - 320px（小さいスマホ）
// maxW="sm" - 384px（標準的なスマホ）
// maxW="md" - 448px（大きめのスマホ）
// maxW="container.sm" - 640px（タブレット寄り）
// */
export const ContentBox = ({ children }: ContentBoxProps) => {
    return (
        <Box
            px={{ base: 4 }}
            py={{ base: 6 }}
            maxW="sm"
            ml="0">
            {children}
        </Box>
    );
}