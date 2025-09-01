import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../services/firebase"; // Adjust path if needed

export function LoginForm() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            navigate("/enforcement");
        } catch (error) {
            alert("Invalid credentials");
        }
    };

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: "0px",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0
        }}>
            <h2 style={{ marginBottom: "24px" }}>Log In</h2>
            <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                style={{ marginBottom: "8px" }}
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ marginBottom: "16px" }}
            />
            <button onClick={handleLogin}>Login</button>
        </div>
    );
}
