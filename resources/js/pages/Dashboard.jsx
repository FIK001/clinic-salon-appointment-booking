import React, { useState, useEffect } from 'react';

export default function Dashboard() {
    // Force format a robust local YYYY-MM-DD template date
    const getLocalDateString = (date) => {
        const offset = date.getTimezoneOffset();
        const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
        return adjustedDate.toISOString().split('T')[0];
    };

    const [selectedDate, setSelectedDate] = useState(getLocalDateString(new Date()));
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bookingNote, setBookingNote] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchSlots();
    }, [selectedDate]);

    const fetchSlots = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            
            // Clean up the date string to remove trailing characters
            const cleanDate = String(selectedDate).trim();
            
            const response = await fetch(`http://localhost:8000/api/providers/1/slots?date=${cleanDate}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            setSlots(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed fetching calendar availability data:', err);
        } finally {
            setLoading(false);
        }
    };

    const bookAppointment = async (slotId) => {
        setMessage({ type: '', text: '' });
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8000/api/appointments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    time_slot_id: slotId,
                    service_id: 1, 
                    notes: bookingNote
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Booking conflict or verification error.');
            }

            setMessage({ type: 'success', text: 'Appointment securely booked! 🎉' });
            setBookingNote('');
            fetchSlots(); 
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <div className="border-b border-slate-100 pb-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Book an Appointment</h2>
                    <p className="text-sm text-slate-500 mt-1">Select an open calendar time slot window below to book your consultation segment.</p>
                </div>
                
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Select Date</label>
                    <input 
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {message.text && (
                <div className={`mb-6 p-4 rounded-xl text-sm font-medium border ${
                    message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-600'
                }`}>
                    {message.text}
                </div>
            )}

            <div className="mb-6">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Appointment Notes (Optional)</label>
                <textarea
                    rows="2"
                    value={bookingNote}
                    onChange={(e) => setBookingNote(e.target.value)}
                    placeholder="Provide any custom context details or requirements for the provider..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition text-sm text-slate-700"
                />
            </div>

            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
                Available Slots for {new Date(selectedDate).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
            </h3>
            
            {loading ? (
                <p className="text-sm text-slate-400 py-4 animate-pulse">Syncing schedule parameters...</p>
            ) : slots.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-500">No open booking options found for this date layout window.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {slots.map((slot) => (
                        <div key={slot.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition">
                            <div>
                                <span className="block text-sm font-semibold text-slate-800">
                                    {new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                <span className="text-xs text-slate-500">Duration: 30 minutes</span>
                            </div>
                            <button
                                onClick={() => bookAppointment(slot.id)}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md transition"
                            >
                                Book Now
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
