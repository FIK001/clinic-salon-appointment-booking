import React, { useState, useEffect } from 'react';

export default function MyAppointments() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchAppointments();
    }, []);

    const fetchAppointments = async () => {
        try {
            const token = localStorage.getItem('token');
            // Fetch appointments for the logged-in client profile
            const response = await fetch('http://localhost:8000/api/appointments', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            // Fallback to array wrap if single record returned
            setAppointments(Array.isArray(data) ? data : data.data || []);
        } catch (err) {
            console.error('Failed syncing appointment payload summaries:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async (id) => {
        if (!confirm('Are you sure you want to cancel this booking encounter?')) return;
        setMessage({ type: '', text: '' });

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8000/api/appointments/${id}/cancel`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Cancellation processing failure.');

            setMessage({ type: 'success', text: 'Appointment cancelled and time slot released! 🟩' });
            fetchAppointments(); // Refresh the list
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        }
    };

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-xl font-bold text-slate-800">My Scheduled Consultations</h2>
                <p className="text-sm text-slate-500 mt-1">Review active bookings, monitor statuses, or manage cancellations below.</p>
            </div>

            {message.text && (
                <div className={`mb-6 p-4 rounded-xl text-sm font-medium border ${
                    message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-600'
                }`}>
                    {message.text}
                </div>
            )}

            {loading ? (
                <p className="text-sm text-slate-400 py-4 animate-pulse">Loading active scheduling indexes...</p>
            ) : appointments.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-500">You do not have any active appointments recorded in the system profile trail right now.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {appointments.map((appt) => (
                        <div key={appt.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                            <div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs font-bold uppercase px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                                        ID: {appt.id}
                                    </span>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border capitalize ${
                                        appt.status === 'booked' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                        appt.status === 'cancelled' ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-rose-50 border-rose-200 text-rose-700'
                                    }`}>
                                        {appt.status}
                                    </span>
                                </div>
                                <span className="block text-sm font-bold text-slate-800 mt-2">
                                    {appt.service?.name || 'General Consultation'}
                                </span>
                                <span className="block text-xs text-slate-500 mt-1">
                                    📅 Scheduled Time: {appt.time_slot ? new Date(appt.time_slot.start_time).toLocaleString() : 'Pending parameters'}
                                </span>
                                {appt.notes && <p className="text-xs text-slate-400 mt-2 bg-white p-2 rounded-lg border border-slate-100 italic">" {appt.notes} "</p>}
                            </div>

                            {appt.status === 'booked' && (
                                <div className="flex items-center space-x-2 self-end sm:self-center">
                                    <button
                                        onClick={() => handleCancel(appt.id)}
                                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-lg border border-rose-100 transition"
                                    >
                                        Cancel Booking
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
