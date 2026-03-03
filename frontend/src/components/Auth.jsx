import React from 'react';

function Auth({
    authMode,
    setAuthMode,
    email,
    setEmail,
    password,
    setPassword,
    authError,
    handleAuth,
    isMentor,
    setIsMentor,
    mentorName,
    setMentorName,
    mentorFields,
    setMentorFields,
    mentorBackground,
    setMentorBackground,
    mentorContact,
    setMentorContact
}) {
    return (
        <div className="auth-overlay">
            <form className="auth-form" onSubmit={handleAuth}>
                <div className="auth-header">
                    <h2>Mentoris</h2>
                    <p className="subtitle">
                        {authMode === 'login'
                            ? 'התחברו כדי למצוא את המנטור המושלם עבורכם'
                            : 'הצטרפו לקהילה שלנו ומצאו מנטור עוד היום'}
                    </p>
                </div>

                {authError && <div style={{ color: '#ef4444', textAlign: 'center', fontSize: '0.9rem' }}>{authError}</div>}

                <div className="form-group">
                    <input
                        type="email"
                        placeholder="אימייל"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <input
                        type="password"
                        placeholder="סיסמה"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                </div>

                {authMode === 'signup' && (
                    <div className="mentor-signup-toggle">
                        <label>
                            <input
                                type="checkbox"
                                checked={isMentor}
                                onChange={e => setIsMentor(e.target.checked)}
                            />
                            אני רוצה להצטרף כמנטור
                        </label>
                    </div>
                )}

                {authMode === 'signup' && isMentor && (
                    <div className="mentor-extra-fields">
                        <div className="form-group">
                            <input
                                type="text"
                                placeholder="שם / טוויטר"
                                value={mentorName}
                                onChange={e => setMentorName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="text"
                                placeholder="תחומי מנטורינג (למשל: Frontend, Python)"
                                value={mentorFields}
                                onChange={e => setMentorFields(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <textarea
                                placeholder="רקע רלוונטי"
                                value={mentorBackground}
                                onChange={e => setMentorBackground(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="text"
                                placeholder="איך ליצור קשר (לינק או פרטים)"
                                value={mentorContact}
                                onChange={e => setMentorContact(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                )}

                <button type="submit">
                    {authMode === 'login' ? 'התחברות' : (isMentor ? 'הרשמה כמנטור' : 'יצירת חשבון')}
                </button>

                <div className="toggle-auth">
                    {authMode === 'login' ? (
                        <p>אין לכם חשבון? <span onClick={() => { setAuthMode('signup'); setIsMentor(false); }}>הירשמו כאן</span></p>
                    ) : (
                        <p>כבר יש לכם חשבון? <span onClick={() => { setAuthMode('login'); setIsMentor(false); }}>התחברו כאן</span></p>
                    )}
                </div>
            </form>
        </div>
    );
}

export default Auth;
