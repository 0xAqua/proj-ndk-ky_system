import { useState } from "react";
import { useNavigate } from "react-router-dom";

export const useLoginForm = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = () => {
        // ここに将来Cognitoの処理が入る
        navigate("/entry");
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            handleLogin();
        }
    };

    return {
        username,
        setUsername,
        password,
        setPassword,
        handleLogin,
        handleKeyPress,
    };
};