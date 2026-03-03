import React from 'react';

function Header({ searchTerm, setSearchTerm, currentUser, handleLogout }) {
    return (
        <>
            <div className="user-profile">
                <span className="user-email">{currentUser?.user_id}</span>
                <button className="logout-btn" onClick={handleLogout}>התנתקות</button>
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
