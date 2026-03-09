import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

function Auth() {
    const { authError, login, signup } = useAuth();

    const [authMode, setAuthMode] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [isMentor, setIsMentor] = useState(false);
    const [mentorName, setMentorName] = useState('');
    const [mentorFields, setMentorFields] = useState('');
    const [mentorBackground, setMentorBackground] = useState('');
    const [mentorCalendar, setMentorCalendar] = useState('');
    const [mentorPhone, setMentorPhone] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        if (authMode === 'login') {
            await login(email, password);
        } else {
            const role = isMentor ? 'mentor' : 'mentee';
            let mentorData = null;
            if (isMentor) {
                mentorData = {
                    name: email.split('@')[0],
                    role: mentorName,
                    fields: mentorFields,
                    background: mentorBackground,
                    contact: {
                        email: email,
                        calendar: mentorCalendar,
                        phone: mentorPhone
                    }
                };
            }
            await signup(email, password, role, mentorData);
        }
        setPassword('');
    };

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
                        id="auth-email"
                        type="email"
                        placeholder="אימייל"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <input
                        id="auth-password"
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
                                placeholder="תפקיד / תואר מקצועי (למשל: Senior CTO)"
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
                                placeholder="ספרו על הניסיון שלכם ואיך תוכלו לעזור"
                                value={mentorBackground}
                                onChange={e => setMentorBackground(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="url"
                                placeholder="לינק ליומן (Calendly וכו') - אופציונלי"
                                value={mentorCalendar}
                                onChange={e => setMentorCalendar(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <input
                                type="tel"
                                placeholder="מספר טלפון לתיאום - אופציונלי"
                                value={mentorPhone}
                                onChange={e => setMentorPhone(e.target.value)}
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
