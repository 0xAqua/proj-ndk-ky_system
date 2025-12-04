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
            // 1. Box自体を中央に配置する
            maxW="md"
            mx="auto" // margin-left: auto; margin-right: auto; の略。Boxを画面中央に配置します

            // 2. Box内の要素を中央揃えにする
            display="flex"
            flexDirection="column"
            alignItems="center" // 中の要素(children)を水平方向の中央に寄せます

            // 3. 既存のスタイル
            px={{ base: 2 }}
            py={{ base: 4 }}
        >
            {children}
        </Box>
    );
}