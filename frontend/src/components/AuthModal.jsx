import React, { useState } from 'react';
import { X, User as UserIcon, Mail, Lock, KeyRound } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { loginUser, registerUser, verifyOtpCode, googleAuthSync, forgotPassword, resetPassword } from '../api/authApi.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function AuthModal({ onClose }) {
  const { loginState } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register', 'otp', 'forgot', 'reset'
  const [authForm, setAuthForm] = useState({ name: '', email: '', password: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');

    try {
      const data = authMode === 'register'
        ? await registerUser(authForm)
        : await loginUser(authForm);

      if (data.success) {
        if (data.requireOtp) {
          setPendingEmail(data.email);
          setAuthMode('otp');
          setAuthSuccessMsg(data.message || `Verification code sent to ${data.email}`);
        } else {
          loginState(data.user, data.token);
          onClose();
        }
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch (err) {
      setAuthError('Connection error during auth.');
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');

    try {
      const data = await verifyOtpCode({ email: pendingEmail, otp: otpInput });
      if (data.success) {
        loginState(data.user, data.token);
        onClose();
      } else {
        setAuthError(data.error || 'Verification failed');
      }
    } catch (err) {
      setAuthError('Error verifying OTP.');
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');

    try {
      const data = await forgotPassword({ email: forgotEmail });
      if (data.success) {
        setPendingEmail(data.email);
        setAuthMode('reset');
        setAuthSuccessMsg(data.message || `Verification code sent to ${data.email}`);
      } else {
        setAuthError(data.error || 'Failed to send reset email');
      }
    } catch (err) {
      setAuthError('Error connecting to password reset service.');
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');

    try {
      const data = await resetPassword({
        email: pendingEmail,
        otp: resetOtp,
        newPassword
      });

      if (data.success) {
        setAuthSuccessMsg(data.message);
        setAuthMode('login');
        setForgotEmail('');
        setResetOtp('');
        setNewPassword('');
      } else {
        setAuthError(data.error || 'Password reset failed');
      }
    } catch (err) {
      setAuthError('Error resetting password.');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setAuthError('');
    try {
      const decodedGoogleUser = jwtDecode(credentialResponse.credential);
      const data = await googleAuthSync({
        googleId: decodedGoogleUser.sub,
        email: decodedGoogleUser.email,
        name: decodedGoogleUser.name,
        avatar: decodedGoogleUser.picture
      });

      if (data.success) {
        loginState(data.user, data.token);
        onClose();
      } else {
        setAuthError(data.error || 'Google auth sync failed');
      }
    } catch (err) {
      setAuthError('Google sign in decoding failed');
    }
  };

  const getHeaderTitle = () => {
    switch (authMode) {
      case 'otp': return 'Email Verification';
      case 'forgot': return 'Reset Your Password';
      case 'reset': return 'Set New Password';
      case 'register': return 'Create Sabha.ai Account';
      default: return 'Sign In to Sabha.ai';
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content auth-modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>
            {getHeaderTitle()}
          </h3>
          <button className="close-modal-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {authError && <div className="auth-error-box">{authError}</div>}
          {authSuccessMsg && <div style={{ background: 'rgba(74, 222, 128, 0.15)', border: '1px solid rgba(74, 222, 128, 0.4)', color: '#4ade80', padding: '0.6rem', borderRadius: '6px', fontSize: '0.85rem' }}>{authSuccessMsg}</div>}

          {authMode === 'otp' && (
            <form onSubmit={handleOtpSubmit} className="auth-form">
              <p style={{ fontSize: '0.88rem', color: '#cbd5e1', marginBottom: '0.5rem' }}>
                Enter the 6-digit code sent to <strong>{pendingEmail}</strong>:
              </p>

              <div className="form-group">
                <div className="input-icon-wrapper">
                  <KeyRound size={16} color="#38bdf8" />
                  <input
                    type="text"
                    placeholder="123456"
                    maxLength="6"
                    value={otpInput}
                    onChange={e => setOtpInput(e.target.value)}
                    style={{ letterSpacing: '4px', fontWeight: 'bold', fontSize: '1.1rem' }}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="auth-submit-btn">
                Verify Code & Login
              </button>

              <div className="auth-toggle-footer">
                <button type="button" onClick={() => setAuthMode('register')}>
                  ← Back to Registration
                </button>
              </div>
            </form>
          )}

          {authMode === 'forgot' && (
            <form onSubmit={handleForgotPasswordSubmit} className="auth-form">
              <p style={{ fontSize: '0.88rem', color: '#cbd5e1', marginBottom: '0.75rem' }}>
                Enter your registered email address and we will send a 6-digit verification code to reset your password.
              </p>

              <div className="form-group">
                <label>Email Address</label>
                <div className="input-icon-wrapper">
                  <Mail size={16} />
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={forgotEmail}
                    onChange={e => setForgotEmail(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="auth-submit-btn">
                Send Reset Code
              </button>

              <div className="auth-toggle-footer">
                <button type="button" onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccessMsg(''); }}>
                  ← Back to Sign In
                </button>
              </div>
            </form>
          )}

          {authMode === 'reset' && (
            <form onSubmit={handleResetPasswordSubmit} className="auth-form">
              <p style={{ fontSize: '0.88rem', color: '#cbd5e1', marginBottom: '0.75rem' }}>
                Enter the 6-digit code sent to <strong>{pendingEmail}</strong> and your new password:
              </p>

              <div className="form-group">
                <label>6-Digit Verification Code</label>
                <div className="input-icon-wrapper">
                  <KeyRound size={16} color="#38bdf8" />
                  <input
                    type="text"
                    placeholder="123456"
                    maxLength="6"
                    value={resetOtp}
                    onChange={e => setResetOtp(e.target.value)}
                    style={{ letterSpacing: '4px', fontWeight: 'bold', fontSize: '1.1rem' }}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>New Password</label>
                <div className="input-icon-wrapper">
                  <Lock size={16} />
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button type="submit" className="auth-submit-btn">
                Reset Password & Continue
              </button>

              <div className="auth-toggle-footer">
                <button type="button" onClick={() => { setAuthMode('forgot'); setAuthError(''); setAuthSuccessMsg(''); }}>
                  ← Request New Code
                </button>
              </div>
            </form>
          )}

          {(authMode === 'login' || authMode === 'register') && (
            <>
              <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setAuthError('Google Sign-In was cancelled or failed')}
                  useOneTap
                  theme="filled_blue"
                  shape="pill"
                  width="300"
                />
              </div>

              <div className="auth-divider"><span>OR</span></div>

              <form onSubmit={handleAuthSubmit} className="auth-form">
                {authMode === 'register' && (
                  <div className="form-group">
                    <label>Full Name</label>
                    <div className="input-icon-wrapper">
                      <UserIcon size={16} />
                      <input
                        type="text"
                        placeholder="Priyanshu Kumar"
                        value={authForm.name}
                        onChange={e => setAuthForm({ ...authForm, name: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Email Address</label>
                  <div className="input-icon-wrapper">
                    <Mail size={16} />
                    <input
                      type="email"
                      placeholder="user@example.com"
                      value={authForm.email}
                      onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ margin: 0 }}>Password</label>
                    {authMode === 'login' && (
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode('forgot');
                          setAuthError('');
                          setAuthSuccessMsg('');
                          setForgotEmail(authForm.email);
                        }}
                        style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 500 }}
                      >
                        Forgot Password?
                      </button>
                    )}
                  </div>
                  <div className="input-icon-wrapper" style={{ marginTop: '0.3rem' }}>
                    <Lock size={16} />
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={authForm.password}
                      onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="auth-submit-btn">
                  {authMode === 'login' ? 'Sign In' : 'Register Account'}
                </button>
              </form>

              <div className="auth-toggle-footer">
                {authMode === 'login' ? (
                  <span>Don't have an account? <button onClick={() => { setAuthMode('register'); setAuthError(''); setAuthSuccessMsg(''); }}>Sign Up</button></span>
                ) : (
                  <span>Already have an account? <button onClick={() => { setAuthMode('login'); setAuthError(''); setAuthSuccessMsg(''); }}>Sign In</button></span>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
