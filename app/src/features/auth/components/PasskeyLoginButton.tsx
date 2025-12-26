import { Button } from "@chakra-ui/react";
import { MdFingerprint } from "react-icons/md";

type Props = {
    isLoading: boolean;
    onClick: () => void;
};

export const PasskeyLoginButton = ({ isLoading, onClick }: Props) => {
    return (
        <Button
            variant="outline"
            w="full"
            rounded="full"
            h="12"
            onClick={onClick}
            disabled={isLoading}
            boxShadow="subtle"
            _hover={{ boxShadow: "md", transform: "translateY(-1px)" }}
        >
            <MdFingerprint size={20} color="var(--chakra-colors-green-500)" />
            パスキーでログイン
        </Button>
    );
};