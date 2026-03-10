import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { API_BASE_URL } from '../config';

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const BookingModal = ({ isOpen, onClose, mentorId, mentorName }) => {
    const { currentUser } = useAuth();
    const [slots, setSlots] = useState([]);
    const [availableDates, setAvailableDates] = useState([]);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedSlot, setSelectedSlot] = useState(null);
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen && mentorId) {
            fetchAvailability();
            setSelectedDate(null);
            setSelectedSlot(null);
            setTopic('');
            setError('');
            setSuccess(false);
        }
    }, [isOpen, mentorId]);

    const fetchAvailability = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/availability/${encodeURIComponent(mentorId)}`);
            const data = await res.json();
            const rawSlots = data.slots || [];
            setSlots(rawSlots);
            setAvailableDates(buildDateList(rawSlots));
        } catch (err) {
            console.error("Error fetching availability:", err);
        }
    };

    /**
     * Build a unified list of available dates for the next 4 weeks.
     * Recurring slots generate one entry per week; one-time slots add their date.
     * Each entry: { dateStr, dayOfWeek, dayName, displayLabel, slots: [{ start_time, end_time, original }] }
     */
    const buildDateList = (rawSlots) => {
        const dateMap = {};
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Generate next 4 weeks for recurring slots
        const recurringSlots = rawSlots.filter(s => s.slot_type !== 'one_time');
        for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
            recurringSlots.forEach(slot => {
                const date = new Date(today);
                const currentDay = today.getDay();
                let diff = slot.day_of_week - currentDay + (weekOffset * 7);
                if (weekOffset === 0 && diff <= 0) diff += 7;
                date.setDate(today.getDate() + diff);
                const dateStr = date.toISOString().split('T')[0];

                if (!dateMap[dateStr]) {
                    dateMap[dateStr] = {
                        dateStr,
                        dayOfWeek: slot.day_of_week,
                        dayName: DAYS[slot.day_of_week],
                        slots: []
                    };
                }
                dateMap[dateStr].slots.push({
                    start_time: slot.start_time,
                    end_time: slot.end_time,
                    original: slot
                });
            });
        }

        // Add one-time slots
        const oneTimeSlots = rawSlots.filter(s => s.slot_type === 'one_time');
        oneTimeSlots.forEach(slot => {
            if (!slot.date) return;
            const slotDate = new Date(slot.date);
            if (slotDate < today) return; // skip past dates

            const dateStr = slot.date;
            const dayOfWeek = slotDate.getDay();
            if (!dateMap[dateStr]) {
                dateMap[dateStr] = {
                    dateStr,
                    dayOfWeek,
                    dayName: DAYS[dayOfWeek],
                    slots: []
                };
            }
            dateMap[dateStr].slots.push({
                start_time: slot.start_time,
                end_time: slot.end_time,
                original: slot
            });
        });

        // Sort by date, deduplicate times within each date
        return Object.values(dateMap)
            .sort((a, b) => a.dateStr.localeCompare(b.dateStr))
            .map(entry => ({
                ...entry,
                slots: entry.slots
                    .filter((s, i, arr) => arr.findIndex(x => x.start_time === s.start_time && x.end_time === s.end_time) === i)
                    .sort((a, b) => a.start_time.localeCompare(b.start_time))
            }));
    };

    const formatDateLabel = (dateStr, dayName) => {
        const parts = dateStr.split('-');
        return `${dayName}, ${parts[2]}/${parts[1]}`;
    };

    const handleSubmit = async () => {
        if (!selectedSlot || !selectedDate || !topic.trim()) {
            setError('נא לבחור זמן ולמלא נושא');
            return;
        }
        if (!currentUser?.access_token) return;

        setLoading(true);
        setError('');
        try {
            const res = await fetch(`${API_BASE_URL}/bookings/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.access_token}`
                },
                body: JSON.stringify({
                    mentor_id: mentorId,
                    mentee_id: currentUser.user_id,
                    date: selectedDate.dateStr,
                    day_of_week: selectedDate.dayOfWeek,
                    start_time: selectedSlot.start_time,
                    end_time: selectedSlot.end_time,
                    topic: topic.trim()
                })
            });

            if (res.ok) {
                setSuccess(true);
            } else {
                const data = await res.json();
                setError(data.detail || 'שגיאה בשליחת הבקשה');
            }
        } catch (err) {
            setError('שגיאה בחיבור לשרת');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="booking-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="booking-modal">
                <div className="booking-modal-header">
                    <h2>📅 קביעת סשן {mentorName ? `עם ${mentorName}` : ''}</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                {success ? (
                    <div className="booking-success">
                        <div className="success-icon">✅</div>
                        <h3>הבקשה נשלחה בהצלחה!</h3>
                        <p>המנטור יקבל הודעה ויאשר או ידחה את הבקשה.</p>
                        <button className="booking-done-btn" onClick={onClose}>סגור</button>
                    </div>
                ) : (
                    <div className="booking-modal-body">
                        {slots.length === 0 ? (
                            <div className="no-availability">
                                <p>😔 למנטור אין זמינות מוגדרת כרגע</p>
                            </div>
                        ) : (
                            <>
                                {/* Step 1: Pick a date */}
                                <div className="booking-step">
                                    <h4>1. בחרו יום</h4>
                                    <div className="date-chips">
                                        {availableDates.map(entry => (
                                            <button
                                                key={entry.dateStr}
                                                className={`date-chip ${selectedDate?.dateStr === entry.dateStr ? 'selected' : ''}`}
                                                onClick={() => { setSelectedDate(entry); setSelectedSlot(null); setError(''); }}
                                            >
                                                {formatDateLabel(entry.dateStr, entry.dayName)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Step 2: Pick a time */}
                                {selectedDate && (
                                    <div className="booking-step">
                                        <h4>2. בחרו שעה</h4>
                                        <div className="slot-chips">
                                            {selectedDate.slots.map((slot, i) => (
                                                <button
                                                    key={i}
                                                    className={`slot-chip ${selectedSlot?.start_time === slot.start_time ? 'selected' : ''}`}
                                                    onClick={() => { setSelectedSlot(slot); setError(''); }}
                                                >
                                                    {slot.start_time}–{slot.end_time}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Topic */}
                                {selectedSlot && (
                                    <div className="booking-step">
                                        <h4>3. נושא הסשן</h4>
                                        <input
                                            type="text"
                                            className="topic-input"
                                            placeholder="על מה תרצו לדבר?"
                                            value={topic}
                                            onChange={(e) => setTopic(e.target.value)}
                                        />
                                    </div>
                                )}

                                {error && <div className="booking-error">{error}</div>}

                                {selectedSlot && topic.trim() && (
                                    <button
                                        className="submit-booking-btn"
                                        onClick={handleSubmit}
                                        disabled={loading}
                                    >
                                        {loading ? 'שולח...' : 'שלח בקשה'}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BookingModal;
