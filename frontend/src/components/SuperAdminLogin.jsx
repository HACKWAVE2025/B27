import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../utils/auth';
import '../styles/superadminlogin.css';
import HandDrawnChildButton from './HandDrawnChildButton';
import HandDrawnAdminButton from './HandDrawnAdminButton';
import '../styles/foilbackground.css';

const SuperAdminLogin = () => {
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
    try {
      await login('superadmin', { email, password });
      navigate('/superadmin');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="foil-stamp-background">
    <div className="superadmin-login-container">
      <div className="card">
        <div className="banner">
          <span className="banner-text">LOGIN</span>
          <span className="banner-text">SUPERADMIN</span>
        </div>

        <span className="card__title">Super Admin</span>
        <p className="card__subtitle">Access the SuperAdmin Control Center</p>

        <form className="card__form" onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="SuperAdmin Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="SuperAdmin Password"
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
      <HandDrawnAdminButton />
    </div>
    </div>
  );
};

export default SuperAdminLogin;
