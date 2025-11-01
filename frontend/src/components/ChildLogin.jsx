import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../utils/auth';
import '../styles/childstyles.css';
import '../styles/foilbackground.css';
import AdminButton from './HandDrawnAdminButton';

const ChildLogin = () => {
  const [childName, setChildName] = useState('');
  const [digits, setDigits] = useState(Array(6).fill(''));
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef([]);
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem('child_token');
    localStorage.removeItem('userId');
    inputRefs.current[0].focus();
  }, []);

  const handleDigitChange = (value, index) => {
    if (!/^\d?$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);
    if (value && index < 5) inputRefs.current[index + 1].focus();
  };

  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
    if (e.key === 'Enter') validateLogin();
  };

  const validateLogin = async () => {
    const userId = digits.join('');
    if (!childName || userId.length !== 6) {
      setErrorMessage('Please enter your name and 6-digit code.');
      return;
    }

    setLoading(true);
    try {
      await login('child', { childName, userId, password: userId });
      navigate('/game');
    } catch (error) {
      setErrorMessage(error.message);
      localStorage.removeItem('child_token');
      localStorage.removeItem('userId');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="foil-stamp-background">
      {/* 🐻 Top Left Image */}
      <img
        src="istockphoto-1140109823-612x612-removebg-preview (1).png"
        alt="Cute Animal"
        className="corner-image"
      />

      {/* 🦒 Right Side Image */}
      <img
        src="c4f32a3f16d478cc61ba9bd211d204d6-removebg-preview.png"
        alt="Friendly Giraffe"
        className="corner-image-right"
      />

      {/* 🐧 Bottom Left Image or GIF */}
      <img
        src="cute-kawaii-style-halloween-werewolf-character-with-white-board_324746-1272.png"   // 🟢 replace this with your actual gif or image path
        alt="Bottom Animal"
        className="corner-image-bottom"
      />

      <div className="login-body">
        <div className="container">
          <div className="card">
            <div className="banner">
              <span className="banner-text">JOIN</span>
              <span className="banner-text">FUN</span>
            </div>

            <span className="card__title">Child Login</span>
            <p className="card__subtitle">Enter your name and secret code</p>

            <form className="card__form" onSubmit={(e) => e.preventDefault()}>
              <input
                type="text"
                placeholder="Your Name"
                value={childName}
                onChange={(e) => setChildName(e.target.value)}
                required
              />

              <div className="digit-boxes">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    maxLength="1"
                    value={digit}
                    ref={(el) => (inputRefs.current[index] = el)}
                    onChange={(e) => handleDigitChange(e.target.value, index)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                  />
                ))}
              </div>

              <button
                type="button"
                className="sign-up"
                onClick={validateLogin}
                disabled={loading}
              >
                {loading ? 'Logging in...' : 'Join the Fun!'}
              </button>

              {errorMessage && <div className="error-message">{errorMessage}</div>}
            </form>
          </div>

          <AdminButton />
        </div>
      </div>
    </div>
  );
};

export default ChildLogin;
