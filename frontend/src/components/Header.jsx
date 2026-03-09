import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';

function Header({ searchTerm, setSearchTerm, onOpenDMs, onOpenDashboard, unreadCount }) {
    const { currentUser, logout } = useAuth();

    return (
        <>
            <header>
                <h1>Mentoris</h1>
                <p style={{ color: 'var(--text-dim)' }}>מצאו את המנטור המושלם עבורכם</p>
            </header>

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

            <div className="search-section">
                <input
                    id="search-input"
                    type="text"
                    placeholder="חיפוש מנטור לפי שם, תחום, או מילת מפתח..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
        </>
    );
}

export default Header;
