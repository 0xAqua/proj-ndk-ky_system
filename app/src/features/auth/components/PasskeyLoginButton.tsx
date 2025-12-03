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
            onClick={onClick}
            disabled={isLoading}
        >
            <MdFingerprint size={20} />
            パスキーでログイン
        </Button>
    );
};
