import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE_URL } from '../config';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(
        JSON.parse(localStorage.getItem('mentoris_user'))
    );
    const [authError, setAuthError] = useState('');

    const login = async (email, password) => {
        setAuthError('');
        try {
            const res = await fetch(`${API_BASE_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            if (res.ok) {
                const userData = {
                    access_token: data.access_token,
                    user_id: data.user_id,
                    role: data.role
                };
                localStorage.setItem('mentoris_user', JSON.stringify(userData));
                setCurrentUser(userData);
                return true;
            } else {
                setAuthError(data.detail || 'שגיאה בתהליך ההתחברות');
                return false;
            }
        } catch {
            setAuthError('מצטער, חלה שגיאה בחיבור לשרת.');
            return false;
        }
    };

    const signup = async (email, password, role, mentorData) => {
        setAuthError('');
        const payload = { email, password, role };
        if (role === 'mentor' && mentorData) {
            payload.mentor_data = mentorData;
        }
        try {
            const res = await fetch(`${API_BASE_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (res.ok) {
                const userData = {
                    access_token: data.access_token,
                    user_id: data.user_id,
                    role: data.role
                };
                localStorage.setItem('mentoris_user', JSON.stringify(userData));
                setCurrentUser(userData);
                return true;
            } else {
                setAuthError(data.detail || 'שגיאה בתהליך ההרשמה');
                return false;
            }
        } catch {
            setAuthError('מצטער, חלה שגיאה בחיבור לשרת.');
            return false;
        }
    };

    const logout = () => {
        localStorage.removeItem('mentoris_user');
        setCurrentUser(null);
    };

    const value = {
        currentUser,
        authError,
        setAuthError,
        login,
        signup,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
