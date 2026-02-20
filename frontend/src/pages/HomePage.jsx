import { Link } from "react-router-dom";
import "../styles/HomePage.css";

export default function HomePage() {
  return (
    <div className="home">
      <div className="hero">
        <h1>Where Innovators Meet Investors</h1>

        <p>
          Innovest is a simple platform where innovators and investors can
          connect, communicate, and grow ideas together using smart AI support.
        </p>

        <div className="actions">
          <Link to="/register" className="btn-primary">
            Get Started
          </Link>

          <Link to="/login" className="btn-secondary">
            Login
          </Link>
        </div>
      </div>

      <div className="features">
        <div className="feature-grid">
          <div className="feature">
            <h3>Easy Connection</h3>
            <p>
              Innovators and investors can easily find each other and start
              meaningful discussions.
            </p>
          </div>

          <div className="feature">
            <h3>AI-Based Idea Support</h3>
            <p>
              Ideas are supported with AI analysis to help investors understand
              their potential clearly.
            </p>
          </div>

          <div className="feature">
            <h3>Clear Communication</h3>
            <p>
              Built-in communication ensures feedback is always shared — no more
              waiting without responses.
            </p>
          </div>
        </div>
      </div>

      <div className="footer">
        © 2026 Innovest. All rights reserved.
      </div>
    </div>
  );
}
