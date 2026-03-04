import React from 'react';

function Header({ searchTerm, setSearchTerm, currentUser, handleLogout, onOpenDMs, onOpenDashboard, unreadCount }) {
    return (
        <>
            <div className="user-profile">
                <span className="user-email">{currentUser?.user_id}</span>
                <div className="nav-buttons">
                    <button className="nav-btn dm-trigger" onClick={onOpenDMs}>
                        💬 הודעות
                        {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
                    </button>
                    {currentUser?.role === 'mentor' && (
                        <button className="nav-btn" onClick={onOpenDashboard}>🚀 דאשבורד</button>
                    )}
                    <button className="logout-btn" onClick={handleLogout}>התנתקות</button>
                </div>
            </div>

            <header>
                <h1>Mentoris</h1>
                <p>מצאו את המנטור המושלם עבורכם</p>
            </header>

            <section className="search-section">
                <input
                    type="text"
                    placeholder="חפשו לפי טכנולוגיה, תחום, תגיות או שם..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </section>
        </>
    );
}

export default Header;
