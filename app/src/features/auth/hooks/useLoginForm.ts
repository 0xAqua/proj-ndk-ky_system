import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signIn } from "aws-amplify/auth";

export const useLoginForm = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    // ★重要: 引数を FormEvent に変更
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault(); // ★これがないと画面がリロードされてしまいます！

        if (!username || !password) {
            setError("IDとパスワードを入力してください。");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { isSignedIn } = await signIn({ username, password });
            if (isSignedIn) {
                console.log("Login success");
                navigate("/entry");
            } else {
                setError("ログインできませんでした。");
            }
        } catch (err: any) {
            console.error("Login failed:", err);
            // エラーメッセージの出し分け例
            if (err.name === "NotAuthorizedException") {
                setError("IDまたはパスワードが間違っています。");
            } else if (err.name === "UserNotFoundException") {
                setError("ユーザーが見つかりません。");
            } else {
                setError("ログインエラーが発生しました。");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return {
        username,
        setUsername,
        password,
        setPassword,
        isLoading,
        error,
        handleLogin, // これを form の onSubmit に渡す
    };
};