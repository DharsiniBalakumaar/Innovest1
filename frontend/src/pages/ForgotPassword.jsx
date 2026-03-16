import { useState } from "react";
import axios from "axios";
import "../styles/auth.css";

export default function ForgotPassword() {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState(""); // ✅ Added email state
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");

    const sendOTP = async () => {
        try {
            // We send 'email' to the backend. The backend finds the linked phone.
            const res = await axios.post("http://localhost:5000/api/auth/forgot-password-otp", { email });
            alert(res.data.message);
            setStep(2);
        } catch (err) { 
            alert(err.response?.data?.message || "Failed to send OTP"); 
        }
    };

    const resetPass = async () => {
        try {
            // We send 'email' back so the backend can verify the OTP stored against that email
            await axios.post("http://localhost:5000/api/auth/reset-password-otp", { email, otp, newPassword });
            alert("Password Changed Successfully!");
            window.location.href = "/login";
        } catch (err) { 
            alert(err.response?.data?.message || "Invalid OTP or Reset Failed"); 
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2 className="auth-title">Account Recovery</h2>
                {step === 1 ? (
                    <div className="form-group">
                        <label>Enter Registered Email</label>
                        <input 
                            type="email" 
                            placeholder="dharsini@gmail.com" 
                            onChange={(e) => setEmail(e.target.value)} 
                        />
                        <button className="auth-button" onClick={sendOTP}>Send OTP to Mobile</button>
                    </div>
                ) : (
                    <div className="form-group">
                        <p className="auth-subtitle">OTP sent to phone linked with {email}</p>
                        <label>Enter 6-Digit OTP</label>
                        <input type="text" onChange={(e) => setOtp(e.target.value)} />
                        
                        <label>New Password</label>
                        <input type="password" onChange={(e) => setNewPassword(e.target.value)} />
                        
                        <button className="auth-button" onClick={resetPass}>Update Password</button>
                    </div>
                )}
            </div>
        </div>
    );
}