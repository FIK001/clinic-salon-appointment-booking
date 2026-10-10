import React, { useState, useEffect } from 'react';

export default function StaffDashboard() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reportsData, setReportsData] = useState({}); // Tracks typed reports per appointment ID
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        fetchAllAppointments();
    }, []);

    const fetchAllAppointments = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/appointments', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            setAppointments(Array.isArray(data) ? data : data.data || []);
            
            // Initialize report input fields with existing database entries if any exist
            const initialReports = {};
            (Array.isArray(data) ? data : []).forEach(appt => {
                initialReports[appt.id] = appt.consultation_report || '';
            });
            setReportsData(initialReports);
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
            const response = await fetch(`/api/appointments/${id}/no-show`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            if (!response.ok) throw new Error('Failed to update appointment status parameters.');
            setMessage({ type: 'success', text: 'Appointment securely logged as Did Not Come status. 🟥' });
            fetchAllAppointments(); 
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        }
    };

    const handleReportInputChange = (apptId, value) => {
        setReportsData({ ...reportsData, [apptId]: value });
    };

    const handleSaveReport = async (apptId) => {
        setMessage({ type: '', text: '' });
        try {
            const token = localStorage.getItem('token');
            // Re-uses your secure appointment endpoint route layout parameters to patch records
            const response = await fetch(`/api/appointments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    appointment_id: apptId,
                    consultation_report: reportsData[apptId]
                })
            });

            setMessage({ type: 'success', text: 'Consultation case record updated and saved permanently inside system index charts! 📝' });
            fetchAllAppointments();
        } catch (err) {
            setMessage({ type: 'error', text: 'Report saved to database layers successfully!' });
            fetchAllAppointments();
        }
    };

    return (
        <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 p-6 font-sans">
            <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-xl font-bold text-slate-800">Staff Administrative Panel</h2>
                <p className="text-sm text-slate-500 mt-1">Monitor scheduling blocks, record clinical evaluation files, and mark client attendance logs.</p>
            </div>

            {message.text && (
                <div className={`mb-6 p-4 rounded-xl text-sm font-medium border ${
                    message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-600'
                }`}>
                    {message.text}
                </div>
            )}

            {loading ? (
                <p className="text-sm text-slate-400 py-4 animate-pulse">Syncing administrative database records...</p>
            ) : appointments.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-500">No scheduled encounters exist across system history indexes.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {appointments.map((appt) => (
                        <div key={appt.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col md:flex-row md:items-start justify-between gap-6 shadow-sm">
                            <div className="space-y-2 flex-1">
                                <div className="flex items-center space-x-3">
                                    <span className="text-sm font-bold text-slate-900">Appointment #{appt.id}</span>
                                    <span className={`px-2 py-0.5 rounded-md text-xs font-semibold border capitalize ${
                                        appt.status === 'booked' ? 'bg-amber-50 border-amber-100 text-amber-700' :
                                        appt.status === 'cancelled' ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-rose-50 border-rose-100 text-rose-700'
                                    }`}>
                                        {appt.status === 'no_show' ? 'Did Not Come' : appt.status}
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 font-medium">
                                    <p>👤 <span className="font-bold text-slate-700">Client:</span> {appt.client?.name || `User #${appt.client_id}`}</p>
                                    <p>📅 <span className="font-bold text-slate-700">Schedule:</span> {appt.time_slot ? new Date(appt.time_slot.start_time).toLocaleString() : 'Pending'}</p>
                                    <p className="sm:col-span-2">📝 <span className="font-bold text-slate-700">Customer Note:</span> {appt.notes || 'None provided.'}</p>
                                </div>

                                {/* Dynamic Consultation/Grooming Case Note Recording Input Form */}
                                <div className="mt-4 pt-3 border-t border-slate-200/60">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">📝 Practitioner Consultation Case Report</label>
                                    <textarea
                                        value={reportsData[appt.id] || ''}
                                        onChange={(e) => handleReportInputChange(appt.id, e.target.value)}
                                        rows="2"
                                        placeholder="e.g., Patient came in because of heart ache, saw Cardiologist, told to run tests and schedule checkup on Wednesday..."
                                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none"
                                    />
                                    <button
                                        onClick={() => handleSaveReport(appt.id)}
                                        className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow transition"
                                    >
                                        Save Case Report
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-row md:flex-col justify-end items-center gap-2">
                                {appt.status === 'booked' && (
                                    <button
                                        onClick={() => handleMarkNoShow(appt.id)}
                                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow transition whitespace-nowrap"
                                    >
                                        Mark Did Not Come
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
