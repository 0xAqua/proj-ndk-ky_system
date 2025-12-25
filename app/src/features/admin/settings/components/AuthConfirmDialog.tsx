import {
    DialogRoot,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogBody,
    DialogFooter,
    DialogCloseTrigger,
} from "@/components/ui/dialog";
import { Button, Text } from "@chakra-ui/react";

interface AuthConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    isSaving: boolean;
}

export const AuthConfirmDialog = ({
                                      open,
                                      onOpenChange,
                                      onConfirm,
                                      isSaving,
                                  }: AuthConfirmDialogProps) => {
    return (
        <DialogRoot open={open} onOpenChange={(e) => onOpenChange(e.open)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>認証設定の変更</DialogTitle>
                </DialogHeader>
                <DialogBody>
                    <Text>
                        認証設定を変更します。この変更は即座に反映され、ユーザーのログイン方法に影響します。
                    </Text>
                    <Text mt={2} fontSize="sm" color="orange.500">
                        ※ 設定変更後、ユーザーは次回ログイン時から新しい認証方法が適用されます
                    </Text>
                </DialogBody>
                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        キャンセル
                    </Button>
                    <Button
                        bg="orange.500"
                        color="white"
                        _hover={{ bg: "orange.600" }}
                        onClick={onConfirm}
                        loading={isSaving}
                    >
                        変更を保存
                    </Button>
                </DialogFooter>
                <DialogCloseTrigger />
            </DialogContent>
        </DialogRoot>
    );
};