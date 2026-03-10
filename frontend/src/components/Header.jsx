import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import logo from '../assets/logo.png';

function Header({ searchTerm, setSearchTerm, onOpenDMs, onOpenDashboard, unreadCount }) {
    const { currentUser, logout } = useAuth();

    return (
        <>
            <header className="main-header">
                <div className="logo-container">
                    <img src={logo} alt="Mentoris Logo" className="app-logo" />
                    <h1>Mentoris</h1>
                </div>

                <div className="user-profile">
                    <span className="user-email">{currentUser?.user_id}</span>
                    <div className="nav-buttons">
                        <div className="dm-trigger">
                            <button id="open-dms-btn" className="nav-btn" onClick={onOpenDMs}>הודעות</button>
                            {unreadCount > 0 && (
                                <span className="notification-badge">{unreadCount}</span>
                            )}
                        </div>
                        {currentUser?.role === 'mentor' && (
                            <button id="open-dashboard-btn" className="nav-btn" onClick={onOpenDashboard}>דאשבורד</button>
                        )}
                        <button id="logout-btn" className="logout-btn" onClick={logout}>יציאה</button>
                    </div>
                </div>
            </header>

            <div className="hero-section">
                <p className="hero-subtitle">מצאו את המנטור המושלם עבורכם</p>
                <div className="search-section">
                    <input
                        id="search-input"
                        type="text"
                        placeholder="חיפוש מנטור לפי שם, תחום, או מילת מפתח..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
        </>
    );
}

export default Header;
