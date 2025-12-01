import {useEffect, useState} from "react";
import { useNavigate } from "react-router-dom";
import { signIn, getCurrentUser } from "aws-amplify/auth";

export const useLoginForm = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isCheckingSession, setIsCheckingSession] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const checkAuth = async () => {
            try {
                // 現在のユーザーを取得してみる
                await getCurrentUser();

                // エラーにならなければログイン済み -> 入力画面へGO
                console.log("Already logged in");
                navigate("/entry", { replace: true }); // replace: true で「戻る」ボタンでログイン画面に戻れないようにする
            } catch (err) {
                // ログインしていなかったら何もしない（ログイン画面を表示）
                console.log("Not logged in");
            } finally {
                setIsCheckingSession(false);
            }
        };

        void checkAuth();
    }, [navigate]);

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
        isCheckingSession
    };
};