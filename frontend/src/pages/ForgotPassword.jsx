import { useState } from "react";
import { Link } from "react-router-dom";
import api, { getErrorMessage } from "../services/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setMessage(data.message);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">S</div>
          Sham&apos;s AI
        </div>
        <p className="auth-tagline">Reset your password</p>

        {error && <div className="error-msg">{error}</div>}
        {message && <div className="success-msg">{message}</div>}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Sending link..." : "Send reset link"}
          </button>
        </form>

        <div className="auth-footer">
          Remember your password? <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
