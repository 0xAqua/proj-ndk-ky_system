// PasswordResetForm.tsx
import { useResetPassword } from "@/features/auth/hooks/useResetPassword";
import { ForgotPasswordForm } from "@/features/auth/components/ForgotPasswordForm";
import { ResetPasswordForm } from "@/features/auth/components/ResetPasswordForm";

export const PasswordResetForm = () => {
    const resetPassword = useResetPassword();

    return (
        <>
            {resetPassword.phase === 'email' ? (
                <ForgotPasswordForm {...resetPassword} onSubmit={resetPassword.handleSendCode} />
            ) : (
                <ResetPasswordForm {...resetPassword} />
            )}
        </>
    );
};