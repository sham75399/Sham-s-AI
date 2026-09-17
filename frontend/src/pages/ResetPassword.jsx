import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { getErrorMessage } from "../services/api";
import PasswordInput from "../components/PasswordInput";

const ResetPassword = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, {
        password: form.password,
      });
      navigate("/login", {
        replace: true,
        state: { message: "Password reset successfully. Please log in." },
      });
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
        <p className="auth-tagline">Choose a new password</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="password">New password</label>
            <PasswordInput
              id="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="At least 6 characters"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm">Confirm password</label>
            <PasswordInput
              id="confirm"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(event) =>
                setForm((current) => ({ ...current, confirm: event.target.value }))
              }
              placeholder="Repeat password"
            />
          </div>
          <button type="submit" className="btn" disabled={loading}>
            {loading ? "Updating password..." : "Update password"}
          </button>
        </form>

        <div className="auth-footer">
          <Link to="/login">Back to login</Link>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
