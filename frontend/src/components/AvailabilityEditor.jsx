import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { API_BASE_URL } from '../config';

const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const HOURS = [];
for (let h = 8; h < 21; h++) {
    HOURS.push(`${String(h).padStart(2, '0')}:00`);
}

const AvailabilityEditor = () => {
    const { currentUser } = useAuth();
    const [slots, setSlots] = useState([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    // One-time slot form
    const [oneTimeDate, setOneTimeDate] = useState('');
    const [oneTimeStart, setOneTimeStart] = useState('');
    const [oneTimeEnd, setOneTimeEnd] = useState('');

    useEffect(() => {
        if (currentUser?.user_id) {
            fetchAvailability();
        }
    }, [currentUser]);

    const fetchAvailability = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/availability/${encodeURIComponent(currentUser.user_id)}`);
            const data = await res.json();
            if (data.slots) {
                setSlots(data.slots);
            }
        } catch (err) {
            console.error("Error fetching availability:", err);
        }
    };

    const recurringSlots = slots.filter(s => s.slot_type !== 'one_time');
    const oneTimeSlots = slots.filter(s => s.slot_type === 'one_time');

    const isSlotActive = (dayIndex, hour) => {
        const endHour = `${String(parseInt(hour.split(':')[0]) + 1).padStart(2, '0')}:00`;
        return recurringSlots.some(
            s => s.day_of_week === dayIndex && s.start_time === hour && s.end_time === endHour
        );
    };

    const toggleSlot = (dayIndex, hour) => {
        const endHour = `${String(parseInt(hour.split(':')[0]) + 1).padStart(2, '0')}:00`;
        const exists = slots.findIndex(
            s => s.slot_type !== 'one_time' && s.day_of_week === dayIndex && s.start_time === hour && s.end_time === endHour
        );

        if (exists >= 0) {
            setSlots(slots.filter((_, i) => i !== exists));
        } else {
            setSlots([...slots, { slot_type: 'recurring', day_of_week: dayIndex, start_time: hour, end_time: endHour }]);
        }
        setSaved(false);
    };

    const addOneTimeSlot = () => {
        if (!oneTimeDate || !oneTimeStart || !oneTimeEnd) return;
        if (oneTimeStart >= oneTimeEnd) return;

        const exists = slots.some(
            s => s.slot_type === 'one_time' && s.date === oneTimeDate && s.start_time === oneTimeStart
        );
        if (exists) return;

        setSlots([...slots, {
            slot_type: 'one_time',
            date: oneTimeDate,
            start_time: oneTimeStart,
            end_time: oneTimeEnd
        }]);
        setOneTimeDate('');
        setOneTimeStart('');
        setOneTimeEnd('');
        setSaved(false);
    };

    const removeOneTimeSlot = (index) => {
        const oneTimeIndex = slots.findIndex((s, i) => {
            if (s.slot_type !== 'one_time') return false;
            const oneTimeCount = slots.slice(0, i).filter(x => x.slot_type === 'one_time').length;
            return oneTimeCount === index;
        });
        if (oneTimeIndex >= 0) {
            setSlots(slots.filter((_, i) => i !== oneTimeIndex));
            setSaved(false);
        }
    };

    const saveAvailability = async () => {
        if (!currentUser?.access_token) return;
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE_URL}/availability/${encodeURIComponent(currentUser.user_id)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentUser.access_token}`
                },
                body: JSON.stringify({
                    mentor_id: currentUser.user_id,
                    slots
                })
            });
            if (res.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
            }
        } catch (err) {
            console.error("Error saving availability:", err);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="availability-editor">
            <div className="availability-header">
                <h3>ניהול זמינות 📅</h3>
                <p className="availability-hint">הגדירו שעות קבועות שבועיות או הוסיפו תאריכים חד-פעמיים</p>
            </div>

            {/* Weekly recurring grid */}
            <h4 className="section-title">🔄 זמינות שבועית קבועה</h4>
            <div className="availability-grid-wrapper">
                <div className="availability-grid">
                    <div className="grid-header">
                        <div className="time-label-header"></div>
                        {DAYS.map((day, i) => (
                            <div key={i} className="day-header">{day}</div>
                        ))}
                    </div>

                    <div className="grid-body">
                        {HOURS.map(hour => (
                            <div key={hour} className="grid-row">
                                <div className="time-label">{hour}</div>
                                {DAYS.map((_, dayIndex) => (
                                    <div
                                        key={dayIndex}
                                        className={`grid-cell ${isSlotActive(dayIndex, hour) ? 'active' : ''}`}
                                        onClick={() => toggleSlot(dayIndex, hour)}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* One-time date slots */}
            <h4 className="section-title">📌 זמינות חד-פעמית (תאריך ספציפי)</h4>
            <div className="one-time-form">
                <input
                    type="date"
                    className="one-time-input"
                    value={oneTimeDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={e => setOneTimeDate(e.target.value)}
                />
                <select className="one-time-input" value={oneTimeStart} onChange={e => setOneTimeStart(e.target.value)}>
                    <option value="">שעת התחלה</option>
                    {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select className="one-time-input" value={oneTimeEnd} onChange={e => setOneTimeEnd(e.target.value)}>
                    <option value="">שעת סיום</option>
                    {HOURS.map(h => {
                        const nextHour = `${String(parseInt(h.split(':')[0]) + 1).padStart(2, '0')}:00`;
                        return <option key={nextHour} value={nextHour}>{nextHour}</option>;
                    })}
                </select>
                <button className="add-one-time-btn" onClick={addOneTimeSlot} disabled={!oneTimeDate || !oneTimeStart || !oneTimeEnd}>
                    + הוסף
                </button>
            </div>

            {oneTimeSlots.length > 0 && (
                <div className="one-time-list">
                    {oneTimeSlots.map((slot, i) => (
                        <div key={i} className="one-time-chip">
                            <span>{slot.date} | {slot.start_time}–{slot.end_time}</span>
                            <button className="remove-chip-btn" onClick={() => removeOneTimeSlot(i)}>✕</button>
                        </div>
                    ))}
                </div>
            )}

            <div className="availability-actions">
                <button
                    className="save-availability-btn"
                    onClick={saveAvailability}
                    disabled={saving}
                >
                    {saving ? 'שומר...' : saved ? '✓ נשמר!' : 'שמור זמינות'}
                </button>
                <span className="slot-count">{slots.length} משבצות נבחרו</span>
            </div>
        </div>
    );
};

export default AvailabilityEditor;
