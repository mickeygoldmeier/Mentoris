import React from 'react';

function MentorCard({ mentor, index, setSearchTerm, onOpenDMs, onBookSession }) {

    return (
        <div className="mentor-card" style={{ animationDelay: `${index * 0.05}s` }}>
            <div className="mentor-card-header">
                <div className="mentor-name">{mentor["טוויטר / שם"] || mentor.name || "אנונימי"}</div>
                {mentor.role && <div className="mentor-role-badge">{mentor.role}</div>}
            </div>

            {mentor.summary && <div className="mentor-summary">{mentor.summary}</div>}

            <div className="mentor-fields">
                <strong>תחומי התמחות:</strong> {mentor["באיזה תחומים אתם מציעים מנטורינג?"] || mentor.fields}
            </div>

            <div className="mentor-background">
                <strong>רקע:</strong> {mentor["רקע רלוונטי"] || mentor.background}
            </div>

            {mentor.tags && mentor.tags.length > 0 && (
                <div className="mentor-tags">
                    {mentor.tags.map((tag, i) => (
                        <span key={i} className="tag-chip" onClick={() => setSearchTerm(tag.replace('#', ''))}>
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            <div className="mentor-contact-container">
                <button
                    className="contact-link message"
                    onClick={() => onOpenDMs(mentor.user_id || mentor.contact?.email || mentor.email)}
                >
                    💬 הודעה ישירה
                </button>

                {mentor.contact?.calendar ? (
                    <a href={mentor.contact.calendar} className="contact-link calendar" target="_blank" rel="noreferrer">
                        📅 קביעת סשן (חיצוני)
                    </a>
                ) : (
                    <button
                        className="contact-link calendar"
                        onClick={() => onBookSession(
                            mentor.user_id || mentor.contact?.email || mentor.email,
                            mentor["טוויטר / שם"] || mentor.name || "אנונימי"
                        )}
                    >
                        📅 בקשת סשן
                    </button>
                )}

                {mentor.contact && typeof mentor.contact === 'object' && (
                    <>
                        {mentor.contact.email && <a href={`mailto:${mentor.contact.email}`} className="contact-link email">📧 אימייל</a>}
                        {mentor.contact.phone && <span className="contact-link phone">📞 {mentor.contact.phone}</span>}
                    </>
                )}
            </div>

        </div>
    );
}

export default MentorCard;
