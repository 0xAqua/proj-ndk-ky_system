import { Box, VStack, Text, Badge, Icon } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { MdSensors } from "react-icons/md";
import React from "react";

const MotionBox = motion(Box);
const MotionIcon = motion(Icon);

export const SafetyScanView = () => {
    return (
        <Box
            maxW="400px" // 少し幅を狭めて凝縮感を出す
            w="100%"
            bg="white"
            borderRadius="2xl"
            overflow="hidden"
            boxShadow="0 20px 50px rgba(15, 23, 42, 0.12)"
        >
            {/* メインビジュアル（波紋・レーダー） */}
            <RadarVisuals />

            {/* テキスト部分：シンプルに */}
            <VStack py={8} px={6} gap={3}>
                <Badge
                    variant="subtle"
                    colorScheme="teal"
                    borderRadius="full"
                    px={4}
                    py={1.5}
                    display="flex"
                    alignItems="center"
                    gap={2}
                    fontSize="sm"
                >
                    <MotionBox
                        w="8px"
                        h="8px"
                        borderRadius="full"
                        bg="teal.500"
                        animate={{ opacity: [1, 0.2, 1], scale: [1, 0.9, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    />
                    分析中
                </Badge>

                <VStack gap={1}>
                    <Text fontSize="lg" fontWeight="bold" color="gray.700">
                        現場データを解析中
                    </Text>

                    {/* 呼吸するようなアニメーションで「待機」を表現 */}
                    <MotionBox
                        animate={{ opacity: [0.5, 1, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <Text fontSize="sm" color="gray.400">
                            しばらくお待ちください...
                        </Text>
                    </MotionBox>
                </VStack>
            </VStack>

            {/* 下部の装飾ライン（進捗バーではなく、動いていることを示すアクティビティバーとして） */}
            <Box w="100%" h="3px" bg="gray.100">
                <MotionBox
                    h="100%"
                    bgGradient="linear(to-r, transparent, teal.400, transparent)"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                />
            </Box>
        </Box>
    );
};

// ==============================================
//  Visuals Component (変更なし)
// ==============================================

const RadarVisuals = React.memo(() => {
    return (
        <Box
            position="relative"
            h="200px" // リストを消した分、少し高さを出してリッチに
            bgGradient="linear(to-b, gray.800, gray.900)"
            overflow="hidden"
            transform="translateZ(0)"
            display="flex"
            alignItems="center"
            justifyContent="center"
        >
            <ScanningGrid top="20%" delay={0} duration={2.5} width="100%" opacity={0.1} />
            <ScanningGrid top="40%" delay={0.5} duration={2.5} width="90%" opacity={0.2} />
            <ScanningGrid top="60%" delay={1.0} duration={2.5} width="80%" opacity={0.3} />

            <DataStream left="20%" delay={0} duration={1.5} />
            <DataStream left="80%" delay={0.8} duration={2.0} />

            <Box position="absolute" zIndex={1}>
                <RippleCircle delay={0} />
                <RippleCircle delay={1.2} />
            </Box>

            <Box position="absolute" zIndex={2}>
                <MotionIcon
                    as={MdSensors}
                    boxSize="56px"
                    color="teal.200"
                    animate={{ y: [-4, 4, -4] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    filter="drop-shadow(0px 0px 12px rgba(94, 234, 212, 0.6))"
                />
            </Box>

            <MotionBox
                position="absolute"
                w="100%"
                h="2px"
                bg="teal.400"
                boxShadow="0 0 15px #4FD1C5"
                top="0"
                zIndex={3}
                animate={{ top: ["10%", "90%", "10%"], opacity: [0, 1, 0] }}
                transition={{ duration: 3.0, repeat: Infinity, ease: "linear" }}
            />
        </Box>
    );
});

const RippleCircle = ({ delay }: { delay: number }) => (
    <MotionBox
        position="absolute"
        top="50%" left="50%"
        style={{ transform: "translate(-50%, -50%)" }}
        w="120px" h="120px"
        borderRadius="full"
        border="1px solid"
        borderColor="teal.400"
        initial={{ opacity: 0, scale: 0.5, x: "-50%", y: "-50%" }}
        animate={{
            opacity: [0, 0.6, 0],
            scale: [0.5, 1.8], // 拡散範囲を少し広げました
            x: "-50%",
            y: "-50%"
        }}
        transition={{
            duration: 2.5,
            delay: delay,
            repeat: Infinity,
            ease: "easeOut"
        }}
    />
);

const ScanningGrid = ({ top, delay, duration, width, opacity }: any) => (
    <MotionBox
        position="absolute"
        top={top}
        left="0"
        right="0"
        mx="auto"
        h="1px"
        w={width}
        bg="teal.200"
        opacity={opacity}
        animate={{ y: [0, 30], opacity: [opacity, 0] }}
        transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
    />
);

const DataStream = ({ left, delay, duration }: any) => (
    <MotionBox
        position="absolute"
        top="-20%"
        left={left}
        w="1px"
        h="60px"
        bgGradient="linear(to-b, transparent, teal.200, transparent)"
        opacity={0.4}
        animate={{ top: ["-20%", "120%"] }}
        transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
    />
);