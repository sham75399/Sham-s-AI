import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api, { getErrorMessage } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { formatFullDate } from "../utils/formatDate";
import PasswordInput from "../components/PasswordInput";

const Profile = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || "");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState("");
  const [nameErr, setNameErr] = useState("");

  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");

  const saveName = async (e) => {
    e.preventDefault();
    setNameErr("");
    setNameMsg("");
    if (!name.trim()) {
      setNameErr("Name cannot be empty");
      return;
    }
    setSavingName(true);
    try {
      const { data } = await api.put("/users/profile", { name });
      updateUser({ name: data.name });
      setNameMsg("Profile updated");
    } catch (err) {
      setNameErr(getErrorMessage(err));
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    setPwErr("");
    setPwMsg("");
    if (!pwForm.currentPassword || !pwForm.newPassword) {
      setPwErr("Both fields are required");
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setPwErr("New password must be at least 6 characters");
      return;
    }
    setSavingPw(true);
    try {
      await api.put("/users/password", pwForm);
      setPwMsg("Password changed");
      setPwForm({ currentPassword: "", newPassword: "" });
    } catch (err) {
      setPwErr(getErrorMessage(err));
    } finally {
      setSavingPw(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div className="page-container">
      <header className="page-header">
        <Link to="/chat" className="back-btn">
          <ArrowLeft size={16} /> Back to Chat
        </Link>
        <h1>Profile</h1>
      </header>

      <div className="settings-content">
        <div className="profile-card">
          <div className="profile-avatar-lg">
            {user.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div className="profile-name">{user.name}</div>
          <div className="profile-email">{user.email}</div>
          {user.createdAt && (
            <div className="profile-joined">
              Joined {formatFullDate(user.createdAt)}
            </div>
          )}
        </div>

        <div className="settings-section">
          <h2>Account</h2>
          <div className="section-title">Edit profile</div>

          {nameMsg && <div className="success-msg">{nameMsg}</div>}
          {nameErr && <div className="error-msg">{nameErr}</div>}

          <form onSubmit={saveName}>
            <div className="form-group">
              <label>Full Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <button className="btn" disabled={savingName} style={{ width: "auto", padding: "10px 20px" }}>
              {savingName ? "Saving…" : "Save Changes"}
            </button>
          </form>
        </div>

        <div className="settings-section">
          <h2>Security</h2>
          <div className="section-title">Change password</div>

          {pwMsg && <div className="success-msg">{pwMsg}</div>}
          {pwErr && <div className="error-msg">{pwErr}</div>}

          <form onSubmit={savePassword}>
            <div className="form-group">
              <label>Current Password</label>
              <PasswordInput
                id="currentPassword"
                value={pwForm.currentPassword}
                onChange={(e) =>
                  setPwForm((f) => ({ ...f, currentPassword: e.target.value }))
                }
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <PasswordInput
                id="newPassword"
                value={pwForm.newPassword}
                onChange={(e) =>
                  setPwForm((f) => ({ ...f, newPassword: e.target.value }))
                }
              />
            </div>
            <button className="btn" disabled={savingPw} style={{ width: "auto", padding: "10px 20px" }}>
              {savingPw ? "Updating…" : "Update Password"}
            </button>
          </form>
        </div>

        <div className="settings-section">
          <h2>Session</h2>
          <div className="settings-row">
            <div className="label">Log out of Sham&apos;s AI</div>
            <button className="settings-btn danger" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;