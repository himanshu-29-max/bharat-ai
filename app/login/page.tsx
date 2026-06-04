"use client";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #0a0a0f 0%, #0d0a1a 50%, #0a0f0a 100%)",
      fontFamily: "'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Ambient orbs */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
        <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "600px", height: "600px", background: "radial-gradient(circle, rgba(255,153,51,0.08) 0%, transparent 70%)", borderRadius: "50%", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", bottom: "-20%", right: "-10%", width: "500px", height: "500px", background: "radial-gradient(circle, rgba(19,136,8,0.07) 0%, transparent 70%)", borderRadius: "50%", filter: "blur(40px)" }} />
      </div>

      <div style={{
        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "24px", padding: "48px 40px", textAlign: "center",
        backdropFilter: "blur(20px)", maxWidth: "380px", width: "90%",
        boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
        position: "relative",
      }}>
        {/* Flag */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}>
          <div style={{ display: "flex", flexDirection: "column", borderRadius: "6px", overflow: "hidden", width: "48px", height: "34px", boxShadow: "0 0 0 1px rgba(255,255,255,0.15)" }}>
            <div style={{ flex: 1, background: "#FF9933" }} />
            <div style={{ flex: 1, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "50%", border: "1.5px solid #000080" }} />
            </div>
            <div style={{ flex: 1, background: "#138808" }} />
          </div>
        </div>

        {/* Title */}
        <div style={{ fontSize: "32px", fontWeight: 800, letterSpacing: "-0.02em", background: "linear-gradient(90deg, #FF9933, #fff 45%, #138808)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "6px" }}>
          Bharat AI
        </div>
        <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "8px" }}>
          by Himanshu Ranjan
        </div>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "14px", marginBottom: "32px", lineHeight: "1.6" }}>
          India ka apna AI assistant — smart, fast aur honest
        </p>

        {/* Google login button */}
        <button
          onClick={() => signIn("google", { callbackUrl: "/" })}
          style={{
            width: "100%", padding: "14px 20px", borderRadius: "14px",
            background: "#fff", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "12px",
            fontSize: "15px", fontWeight: 600, color: "#1a1a1a",
            boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 8px 28px rgba(0,0,0,0.4)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.3)"; }}
        >
          {/* Google logo SVG */}
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google se Login karo
        </button>

        <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.15)", marginTop: "20px" }}>
          Login karke apna chat history save karo
        </p>
      </div>
    </div>
  );
}
