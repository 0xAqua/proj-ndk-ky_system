// src/features/result/components/elements/IncidentCardHeader.tsx
import { Center, Flex, Icon, Stack, Text } from "@chakra-ui/react";
import { HiSparkles } from "react-icons/hi";
import { MdChevronRight, MdExpandMore, MdWarning } from "react-icons/md";
import type { IncidentData } from "@/features/result/types";

type Props = {
    incident: IncidentData;
    isOpen: boolean;
    onToggle: () => void;
};

export const IncidentCardHeader = ({ incident, isOpen, onToggle }: Props) => {
    // インシデントタイプごとの配色とアイコン定義
    const isPast = incident.badgeType === "past";
    const themeColor = isPast ? "orange" : "pink"; // または purple
    const StatusIcon = isPast ? MdWarning : HiSparkles;

    return (
        <Flex
            py={5} // 高さを出すために上下のパディングを大きく(4->5)
            px={4}
            align="center"
            justify="space-between"
            cursor="pointer"
            onClick={onToggle}
            _hover={{ bg: "gray.50" }}
            gap={4} // アイコンとテキストの間の余白
        >
            <Flex flex={1} gap={4} align="center">
                <Center
                    boxSize="48px" // 48x48pxの大きめの箱
                    bg={`${themeColor}.100`} // 薄い背景色
                    color={`${themeColor}.600`} // アイコンの色
                    borderRadius="lg" // 少し丸く
                    flexShrink={0} // 幅が縮まないように固定
                >
                    <Icon as={StatusIcon} boxSize={6} />
                </Center>

                {/* 中央：テキスト情報 */}
                <Stack gap={1.5} flex={1}>

                    <Text fontSize="sm" fontWeight="bold" lineHeight="short" color="gray.900">
                        {incident.title}
                    </Text>

                </Stack>
            </Flex>

            {/* 右端：開閉アイコン */}
            <Icon
                as={isOpen ? MdExpandMore : MdChevronRight}
                boxSize={6}
                color="gray.400"
                ml={2}
            />
        </Flex>
    );
};