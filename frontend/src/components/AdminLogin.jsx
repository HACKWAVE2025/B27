import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../utils/auth';
import '../styles/adminlogin.css';
import HandDrawnChildButton from './HandDrawnChildButton';
import HandDrawnSuperAdminButton from './HandDrawnSuperAdminButton';
import '../styles/foilbackground.css';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage('Please enter email and password');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      await login('admin', { email, password });
      navigate('/admin');
    } catch (error) {
      console.error("Admin Login failed:", error);
      setErrorMessage(error.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="foil-stamp-background">
    <div className="admin-login-container">
      <div className="card">
        <div className="banner">
          <span className="banner-text">LOGIN</span>
          <span className="banner-text">ADMIN</span>
        </div>

        <span className="card__title">Admin Panel</span>
        <p className="card__subtitle">Access the Admin Dashboard</p>

        <form className="card__form" onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Admin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Admin Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" disabled={loading} className="sign-up">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        {errorMessage && <div className="error-message">{errorMessage}</div>}
      </div>

      <HandDrawnChildButton />
      <HandDrawnSuperAdminButton />
    </div>
    </div>
  );
};

export default AdminLogin;
