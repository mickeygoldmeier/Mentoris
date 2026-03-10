import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { API_BASE_URL } from '../config';
import AvailabilityEditor from './AvailabilityEditor.jsx';

const MentorDashboard = ({ isOpen, onClose }) => {
    const { currentUser } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [stats, setStats] = useState({ totalTasks: 0, pendingTasks: 0 });
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('bookings');

    useEffect(() => {
        if (isOpen && currentUser) {
            fetchBookings();
        }
    }, [isOpen, currentUser]);

    const fetchBookings = async () => {
        if (!currentUser?.access_token || String(currentUser.access_token) === 'undefined' || String(currentUser.access_token) === 'null') {
            console.error("Missing or malformed credentials for fetchBookings");
            return;
        }
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/bookings/mentor/${currentUser.user_id}`, {
                headers: { 'Authorization': `Bearer ${currentUser.access_token}` }
            });
            const data = await res.json();
            setBookings(data);

            const pending = data.filter(b => b.status === 'pending').length;
            setStats({ totalTasks: data.length, pendingTasks: pending });
        } catch (err) {
            console.error("Error fetching bookings:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (bookingId, newStatus) => {
        if (!currentUser?.access_token || currentUser.access_token === 'undefined') return;
        try {
            const res = await fetch(`${API_BASE_URL}/bookings/status/${bookingId}?status=${newStatus}`, {
                method: 'PATCH',
                headers: { 'Authorization': `Bearer ${currentUser.access_token}` }
            });
            if (res.ok) {
                const data = await res.json();
                fetchBookings();

                // If accepted, backend might return a calendar link. Open it for the mentor.
                if (newStatus === 'accepted' && data.calendar_link) {
                    window.open(data.calendar_link, '_blank', 'noopener,noreferrer');
                }
            }
        } catch (err) {
            console.error("Error updating status:", err);
        }
    };

    const formatBookingTime = (booking) => {
        if (booking.date && booking.start_time) {
            const dayNames = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
            const day = booking.day_of_week !== undefined ? dayNames[booking.day_of_week] : '';
            return `${day} ${booking.date} | ${booking.start_time}–${booking.end_time}`;
        }
        return booking.suggested_time || '';
    };

    if (!isOpen) return null;

    return (
        <div className="dashboard-overlay">
            <div className="dashboard-container glass">
                <div className="dashboard-header">
                    <h2>דאשבורד מנטור 🚀</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="dashboard-tabs">
                    <button
                        className={`dashboard-tab ${activeTab === 'bookings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('bookings')}
                    >
                        בקשות סשנים
                    </button>
                    <button
                        className={`dashboard-tab ${activeTab === 'availability' ? 'active' : ''}`}
                        onClick={() => setActiveTab('availability')}
                    >
                        ניהול זמינות
                    </button>
                </div>

                {activeTab === 'bookings' && (
                    <div className="dashboard-content">
                        <div className="dashboard-stats">
                            <div className="stat-card">
                                <span className="stat-value">{stats.totalTasks}</span>
                                <span className="stat-label">סך הכל פניות</span>
                            </div>
                            <div className="stat-card urgent">
                                <span className="stat-value">{stats.pendingTasks}</span>
                                <span className="stat-label">פניות ממתינות</span>
                            </div>
                        </div>

                        <h3>בקשות לסשנים</h3>
                        <div className="booking-list">
                                {bookings.length > 0 ? (
                                    bookings.map((booking, i) => (
                                        <div key={i} className={`booking-item ${booking.status}`}>
                                            <div className="booking-info">
                                                <div className="mentee-id">{booking.mentee_id}</div>
                                                <div className="booking-topic">{booking.topic}</div>
                                                <div className="booking-time">{formatBookingTime(booking)}</div>
                                            </div>
                                            <div className="booking-actions">
                                                {booking.status === 'pending' && (
                                                    <>
                                                        <button className="accept-btn" onClick={() => handleStatusUpdate(booking._id, 'accepted')}>אשר</button>
                                                        <button className="reject-btn" onClick={() => handleStatusUpdate(booking._id, 'rejected')}>דחה</button>
                                                    </>
                                                )}
                                                {booking.status === 'accepted' && booking.ics_link && (
                                                    <a href={booking.ics_link} target="_blank" rel="noopener noreferrer" className="dash-cal-btn single">
                                                        הוסף ליומן 📅
                                                    </a>
                                                )}
                                                <span className="status-badge">{booking.status}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="no-data">אין בקשות כרגע...</p>
                                )}
                                </div>
                    </div>
                )}

                {activeTab === 'availability' && (
                    <div className="dashboard-content">
                        <AvailabilityEditor />
                    </div>
                )}
            </div>
        </div>
    );
};

export default MentorDashboard;

