// views/auth/VerifyResetOTP.js
import React, { useState, useEffect } from "react";
import { Link, useHistory } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function VerifyResetOTP() {
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [email, setEmail] = useState("");
  const history = useHistory();

  const baseUrl = process.env.REACT_APP_API_BASE_URL || "http://127.0.0.1:8088/EV";

  useEffect(() => {
    const resetEmail = sessionStorage.getItem("resetEmail");
    if (!resetEmail) {
      toast.error("Session expired. Please request password reset again.", {
        position: "top-right",
        autoClose: 3000,
      });
      history.push("/auth/forgot");
    } else {
      setEmail(resetEmail);
    }
  }, [history]);

  const handleVerifyOTP = async (e) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit verification code", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    if (!/^\d+$/.test(otp)) {
      toast.error("Verification code must contain only numbers", {
        position: "top-right",
        autoClose: 3000,
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${baseUrl}/api/auth/verify-reset-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp }),
      });

      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
        throw new Error("Unexpected response format");
      }

      if (response.ok) {
        // Store reset token for password reset
        sessionStorage.setItem("resetToken", data.resetToken);
        
        toast.success("OTP verified successfully!", {
          position: "top-right",
          autoClose: 2000,
        });

        // Redirect to reset password page
        setTimeout(() => {
          history.push("/auth/reset-password");
        }, 1500);
      } else {
        toast.error(data.message || "Invalid verification code", {
          position: "top-right",
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error("OTP verification error:", error);
      toast.error("Error verifying OTP. Please try again.", {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;

    setIsLoading(true);

    try {
      const response = await fetch(`${baseUrl}/api/auth/reset-resend-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const contentType = response.headers.get("content-type");
      let data;
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
        throw new Error("Unexpected response format");
      }

      if (response.ok) {
        setResendCooldown(60);
        const timer = setInterval(() => {
          setResendCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        toast.success("New verification code sent to your email!", {
          position: "top-right",
          autoClose: 2000,
        });
      } else {
        toast.error(data.message || "Failed to resend code", {
          position: "top-right",
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error("Resend error:", error);
      toast.error("Network error. Please try again.", {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen w-full flex items-center justify-center px-4" style={{ background: "#f5f5f5" }}>
        <div className="w-full relative" style={{ maxWidth: "420px", zIndex: 1, background: "rgba(255,255,255,0.97)", borderRadius: "20px", boxShadow: "0 25px 60px rgba(0,0,0,0.5)", overflow: "hidden" }}>
          <div style={{ height: "6px", background: "linear-gradient(90deg, #7c0000, #c0392b, #7c0000)" }} />
          
          <div style={{ padding: "40px 40px 36px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "32px" }}>
              <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "linear-gradient(135deg, #7c0000, #c0392b)", boxShadow: "0 8px 24px rgba(124,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              </div>
              <h1 style={{ fontSize: "22px", fontWeight: "700", color: "#1a0000", marginBottom: "8px" }}>Verify Reset Code</h1>
              <p style={{ fontSize: "13px", color: "#888", textAlign: "center" }}>
                Enter the 6-digit code sent to <strong>{email}</strong>
              </p>
            </div>

            <div style={{ background: "#fff8f8", border: "1.5px solid #fecaca", borderRadius: "10px", padding: "12px 14px", marginBottom: "24px" }}>
              <span style={{ fontSize: "12px", color: "#7c0000", fontWeight: "500" }}>
                ⏰ Code expires in 10 minutes
              </span>
            </div>

            <form onSubmit={handleVerifyOTP}>
              <div style={{ marginBottom: "24px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "8px" }}>
                  Verification Code
                </label>
                <div style={{ position: "relative" }}>
                  <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#aaa" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    maxLength="6"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    disabled={isLoading}
                    style={{ width: "100%", padding: "14px 14px 14px 42px", fontSize: "24px", fontWeight: "700", letterSpacing: "0.4em", textAlign: "center", background: "#f8f8f8", border: "1.5px solid #e8e8e8", borderRadius: "10px", outline: "none", boxSizing: "border-box" }}
                    onFocus={(e) => { e.target.style.borderColor = "#7c0000"; e.target.style.boxShadow = "0 0 0 3px rgba(124,0,0,0.1)"; e.target.style.background = "#fff"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#e8e8e8"; e.target.style.boxShadow = "none"; e.target.style.background = "#f8f8f8"; }}
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "6px" }}>
                  <span style={{ fontSize: "11px", color: otp.length === 6 ? "#16a34a" : "#aaa", fontWeight: "500" }}>
                    {otp.length}/6
                  </span>
                </div>
              </div>

              <button type="submit" disabled={isLoading} style={{ width: "100%", padding: "13px", background: "linear-gradient(135deg, #7c0000, #a00000)", color: "#fff", fontWeight: "700", fontSize: "14px", letterSpacing: "0.06em", border: "none", borderRadius: "10px", cursor: isLoading ? "not-allowed" : "pointer", boxShadow: "0 6px 20px rgba(124,0,0,0.4)", opacity: isLoading ? 0.7 : 1 }}>
                {isLoading ? "VERIFYING..." : "VERIFY & CONTINUE"}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: "20px" }}>
              <button onClick={handleResendCode} disabled={resendCooldown > 0 || isLoading} style={{ background: "none", border: "none", color: "#7c0000", fontSize: "13px", cursor: resendCooldown > 0 ? "not-allowed" : "pointer", textDecoration: "underline", opacity: resendCooldown > 0 ? 0.5 : 1 }}>
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Didn't receive code? Resend"}
              </button>
            </div>

            <div style={{ borderTop: "1px solid #f0f0f0", paddingTop: "20px", marginTop: "24px", textAlign: "center" }}>
              <Link to="/auth/forgot" style={{ fontSize: "13px", color: "#7c0000", textDecoration: "none", fontWeight: "500" }}>
                ← Back to Forgot Password
              </Link>
            </div>
          </div>
        </div>
      </div>
      <ToastContainer />
    </>
  );
}