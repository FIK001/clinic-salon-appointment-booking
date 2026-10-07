import React, { useState, useEffect } from 'react';

export default function StaffDashboard() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchAllAppointments();
    }, []);

    const fetchAllAppointments = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:8000/api/appointments', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            setAppointments(Array.isArray(data) ? data : data.data || []);
        } catch (err) {
            console.error('Failed syncing administrative appointment records:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleMarkNoShow = async (id) => {
        setMessage({ type: '', text: '' });
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:8000/api/appointments/${id}/no-show`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });

            if (!response.ok) throw new Error('Failed to update appointment status parameters.');

            setMessage({ type: 'success', text: 'Appointment securely logged as No-Show status. 🟥' });
            fetchAllAppointments(); 
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        }
    };

    return (
        <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
            <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-xl font-bold text-slate-800">Staff Administrative Panel</h2>
                <p className="text-sm text-slate-500 mt-1">Monitor scheduling blocks, view customer context files, and mark client attendance logs.</p>
            </div>

            {message.text && (
                <div className={`mb-6 p-4 rounded-xl text-sm font-medium border ${
                    message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-600'
                }`}>
                    {message.text}
                </div>
            )}

            {loading ? (
                <p className="text-sm text-slate-400 py-4 animate-pulse">Syncing administrative records...</p>
            ) : appointments.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-500">No scheduled encounters exist across system history indexes.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                                <th className="p-4">Appt ID</th>
                                <th className="p-4">Client Profile</th>
                                <th className="p-4">Service Details</th>
                                <th className="p-4">Scheduled Window</th>
                                <th className="p-4">Status Field</th>
                                <th className="p-4 text-right">Action Guards</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                            {appointments.map((appt) => (
                                <tr key={appt.id} className="hover:bg-slate-50/50 transition">
                                    <td className="p-4 font-bold text-slate-900">#{appt.id}</td>
                                    <td className="p-4">{appt.client?.name || `User ID: ${appt.client_id}`}</td>
                                    <td className="p-4">{appt.service?.name || 'General Consultation'}</td>
                                    <td className="p-4 text-xs font-mono text-slate-600">
                                        {appt.time_slot ? new Date(appt.time_slot.start_time).toLocaleString() : 'Pending'}
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium border capitalize ${
                                            appt.status === 'booked' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                                            appt.status === 'cancelled' ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-rose-50 border-rose-100 text-rose-700'
                                        }`}>
                                            {appt.status}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">
                                        {appt.status === 'booked' && (
                                            <button
                                                onClick={() => handleMarkNoShow(appt.id)}
                                                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-lg shadow-md transition"
                                            >
                                                Mark No-Show
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
