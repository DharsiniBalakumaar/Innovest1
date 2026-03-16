import { Link } from "react-router-dom";
import "../styles/HomePage.css";

export default function HomePage() {
  return (
    <div className="home">
      <div className="hero">
        <h1>Powering the Next Wave of Indian Innovation</h1>
        <p className="subtitle">
          India is now the 3rd largest startup ecosystem globally. <strong>Innovest</strong> bridges the gap between 
          visionary founders and strategic capital, providing the structured AI support needed to turn raw 
          potential into national impact.
        </p>

        <div className="actions">
          <Link to="/register" className="btn-primary">Start Your Journey</Link>
          <Link to="/login" className="btn-secondary">Partner Login</Link>
        </div>
      </div>

      <div className="trust-section">
        <div className="container">
          <h2>Why Trust Innovest?</h2>
          <div className="trust-grid">
            <div className="trust-item">
              <h4>Verified Profiles</h4>
              <p>We use Multi-Factor Authentication and LinkedIn integration to ensure every innovator and investor is a real person with a real track record.</p>
            </div>
            <div className="trust-item">
              <h4>Data Privacy</h4>
              <p>Your intellectual property is protected. Pitch decks and sensitive data are only shared with investors you explicitly approve.</p>
            </div>
            <div className="trust-item">
              <h4>Objective AI Analysis</h4>
              <p>Our backend Python scripts provide unbiased market sentiment analysis, helping you see the facts beyond the hype.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="features">
        <h2>Features of Innovest</h2>
        <div className="feature-grid">
          <div className="feature">
            <h3>Fueling Bharat’s Growth</h3>
            <p>Startups contributed over 4% to India's GDP last year. We simplify the fundraising process to keep that momentum moving.</p>
          </div>
          <div className="feature">
            <h3>AI-Driven Due Diligence</h3>
            <p>Our smart support helps investors identify high-potential sectors like Fintech and DeepTech using real-time data trends.</p>
          </div>
          <div className="feature">
            <h3>Feedback Loop</h3>
            <p>We eliminate "Ghosting." Our platform mandates feedback triggers, ensuring innovators know exactly where they stand after every pitch.</p>
          </div>
        </div>
      </div>

      <div className="footer">
        © 2026 Innovest. Built for the Indian Startup Ecosystem.
      </div>
    </div>
  );
}