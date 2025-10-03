import { useState } from "react";
import { supabase } from "./supabaseClient";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
    } else {
      onLogin(data.user);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "'Bangers', 'Comic Sans MS', cursive, sans-serif",
        background: "linear-gradient(135deg, #ff4d4d, #ffd633, #33ccff)",
        backgroundSize: "400% 400%",
        animation: "gradientShift 12s ease infinite",
        padding: "20px",
        boxSizing: "border-box",
      }}
    >
      <form
        onSubmit={handleLogin}
        style={{
          width: "100%",
          maxWidth: "420px", // scales on tablets
          minWidth: "260px", // ensures readability on tiny phones
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          background: "#fffbe6",
          border: "4px solid black",
          borderRadius: "20px",
          padding: "32px 24px",
          boxShadow: "8px 8px 0px #000",
        }}
      >
        <h1
          style={{
            fontSize: "clamp(28px, 6vw, 40px)", // responsive font size
            marginBottom: "24px",
            color: "#000",
            textShadow: "2px 2px #ff0000",
            textAlign: "center",
          }}
        >
          Welcome
        </h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "14px",
            marginBottom: "16px",
            borderRadius: "12px",
            border: "2px solid black",
            background: "#ffffff",
            fontSize: "16px",
            textAlign: "center",
            boxShadow: "3px 3px 0px #000",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "14px",
            marginBottom: "20px",
            borderRadius: "12px",
            border: "2px solid black",
            background: "#ffffff",
            fontSize: "16px",
            textAlign: "center",
            boxShadow: "3px 3px 0px #000",
          }}
        />

        <button
          type="submit"
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: "12px",
            border: "3px solid black",
            backgroundColor: "#ffcc00",
            color: "#000",
            fontSize: "clamp(16px, 4vw, 20px)", // responsive font size
            fontWeight: "bold",
            cursor: "pointer",
            boxShadow: "4px 4px 0px #000",
            transition: "transform 0.1s ease, box-shadow 0.1s ease",
          }}
          onMouseDown={(e) => {
            e.target.style.transform = "translate(3px,3px)";
            e.target.style.boxShadow = "1px 1px 0px #000";
          }}
          onMouseUp={(e) => {
            e.target.style.transform = "translate(0px,0px)";
            e.target.style.boxShadow = "4px 4px 0px #000";
          }}
        >
          Login
        </button>

        {error && (
          <p
            style={{
              color: "red",
              marginTop: "16px",
              fontWeight: "bold",
              textAlign: "center",
            }}
          >
            {error}
          </p>
        )}
      </form>

      {/* CSS animation for gradient */}
      <style>{`
        @keyframes gradientShift {
          0% {background-position: 0% 50%;}
          50% {background-position: 100% 50%;}
          100% {background-position: 0% 50%;}
        }
      `}</style>
    </div>
  );
}
