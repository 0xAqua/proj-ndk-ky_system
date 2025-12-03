import { AuthLayout } from "@/components/layout/AuthLayout";
import { LoginForm } from "@/features/auth/LoginForm.tsx";

export const LoginPage = () => {
    return (
        <AuthLayout>
            <LoginForm />
        </AuthLayout>
    );
};
