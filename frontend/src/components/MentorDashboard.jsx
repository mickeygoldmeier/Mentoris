import React, { useState, useEffect } from 'react';

const MentorDashboard = ({ currentUser, isOpen, onClose }) => {
    const [bookings, setBookings] = useState([]);
    const [stats, setStats] = useState({ totalTasks: 0, pendingTasks: 0 });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && currentUser) {
            fetchBookings();
        }
    }, [isOpen, currentUser]);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            const res = await fetch(`http://localhost:8000/bookings/mentor/${currentUser.user_id}`);
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
        try {
            const res = await fetch(`http://localhost:8000/bookings/status/${bookingId}?status=${newStatus}`, {
                method: 'PATCH'
            });
            if (res.ok) {
                fetchBookings();
            }
        } catch (err) {
            console.error("Error updating status:", err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="dashboard-overlay">
            <div className="dashboard-container glass">
                <div className="dashboard-header">
                    <h2>דאשבורד מנטור 🚀</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

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

                <div className="dashboard-content">
                    <h3>בקשות לסשנים</h3>
                    <div className="booking-list">
                        {bookings.length > 0 ? (
                            bookings.map((booking, i) => (
                                <div key={i} className={`booking-item ${booking.status}`}>
                                    <div className="booking-info">
                                        <div className="mentee-id">{booking.mentee_id}</div>
                                        <div className="booking-topic">{booking.topic}</div>
                                        <div className="booking-time">{booking.suggested_time}</div>
                                    </div>
                                    <div className="booking-actions">
                                        {booking.status === 'pending' && (
                                            <>
                                                <button className="accept-btn" onClick={() => handleStatusUpdate(booking._id, 'accepted')}>אשר</button>
                                                <button className="reject-btn" onClick={() => handleStatusUpdate(booking._id, 'rejected')}>דחה</button>
                                            </>
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
            </div>
        </div>
    );
};

export default MentorDashboard;
