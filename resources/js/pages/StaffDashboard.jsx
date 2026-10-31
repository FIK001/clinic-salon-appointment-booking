
import React, { useState, useEffect, useCallback } from 'react';

export default function StaffDashboard() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reportsData, setReportsData] = useState({});
    const [message, setMessage] = useState({ type: '', text: '' });

    const [expandedClient, setExpandedClient] = useState(null);
    const [profileBio, setProfileBio] = useState(
        'Senior care and style consultant providing acute management diagnostics.'
    );
    const [profilePhone, setProfilePhone] = useState('08031112223');
    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [savingReportId, setSavingReportId] = useState(null);
    const [completingId, setCompletingId] = useState(null);

    // Fetch appointments from the database.
    const fetchAllAppointments = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');

            const response = await fetch('/api/appointments', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Unable to load appointment records.');
            }

            const data = await response.json();

            const appointmentsArray = Array.isArray(data)
                ? data
                : Array.isArray(data.data)
                    ? data.data
                    : [];

            setAppointments(appointmentsArray);

            setReportsData((previousReports) => {
                const updatedReports = {};

                appointmentsArray.forEach((appt) => {
                    updatedReports[appt.id] =
                        previousReports[appt.id] ??
                        appt.consultation_report ??
                        '';
                });

                return updatedReports;
            });
        } catch (error) {
            console.error('Failed fetching appointment records:', error);

            setMessage({
                type: 'error',
                text: error.message || 'Failed to load appointments.'
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllAppointments();
    }, [fetchAllAppointments]);

    // Mark an attended appointment as completed.
    const handleMarkCompleted = async (id) => {
        setMessage({ type: '', text: '' });
        setCompletingId(id);

        try {
            const token = localStorage.getItem('token');

            const response = await fetch(
                `/api/appointments/${id}/complete`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json'
                    }
                }
            );

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));

                throw new Error(
                    data.message || 'Failed to complete appointment.'
                );
            }

            setMessage({
                type: 'success',
                text: `Appointment #${id} marked as Completed.`
            });

            await fetchAllAppointments();
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.message || 'Unable to complete appointment.'
            });
        } finally {
            setCompletingId(null);
        }
    };

    // Handle consultation report input.
    const handleReportInputChange = (apptId, value) => {
        setReportsData((previousReports) => ({
            ...previousReports,
            [apptId]: value
        }));
    };

    // Save consultation report to the database.
    const handleSaveReport = async (apptId) => {
        setMessage({ type: '', text: '' });
        setSavingReportId(apptId);

        try {
            const token = localStorage.getItem('token');

            const response = await fetch(
                '/api/appointments/save-report',
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    },
                    body: JSON.stringify({
                        appointment_id: apptId,
                        consultation_report: reportsData[apptId] || ''
                    })
                }
            );

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));

                throw new Error(
                    data.message || 'Failed to save consultation report.'
                );
            }

            setMessage({
                type: 'success',
                text: `Consultation report for appointment #${apptId} saved successfully.`
            });

            await fetchAllAppointments();
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.message || 'Unable to save consultation report.'
            });
        } finally {
            setSavingReportId(null);
        }
    };

    // Update practitioner profile display.
    const saveProfileChanges = (event) => {
        event.preventDefault();

        setIsEditingProfile(false);

        setMessage({
            type: 'success',
            text: 'Profile changes applied in this session.'
        });
    };

    // Format appointment date and time.
    const formatDate = (dateValue) => {
        if (!dateValue) return 'Pending';

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) return 'Pending';

        return date.toLocaleString();
    };

    // Get patient name.
    const getPatientName = (appt) => {
        return (
            appt.client?.name ||
            appt.client?.user?.name ||
            `User #${appt.client_id ?? 'Unknown'}`
        );
    };

    // Appointment status styling.
    const getStatusClasses = (status) => {
        if (status === 'no_show') {
            return 'bg-rose-50 border-rose-200 text-rose-600';
        }

        if (status === 'booked') {
            return 'bg-amber-50 border-amber-200 text-amber-700';
        }

        if (status === 'completed') {
            return 'bg-emerald-50 border-emerald-200 text-emerald-700';
        }

        return 'bg-slate-100 border-slate-200 text-slate-500';
    };

    return (
        <div className="max-w-6xl mx-auto space-y-6 font-sans pb-12">

            {/* Practitioner Profile */}
            <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 border-b border-slate-100 pb-3 mb-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-800">
                            Practitioner Workspace Settings
                        </h3>

                        <p className="text-xs text-slate-400 mt-1">
                            Manage your practitioner profile information.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsEditingProfile((current) => !current)}
                        className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg transition"
                    >
                        {isEditingProfile ? 'Cancel' : 'Edit Profile'}
                    </button>
                </div>

                {isEditingProfile ? (
                    <form
                        onSubmit={saveProfileChanges}
                        className="space-y-4"
                    >
                        <div>
                            <label
                                htmlFor="profile-phone"
                                className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1"
                            >
                                Contact Phone
                            </label>

                            <input
                                id="profile-phone"
                                type="tel"
                                value={profilePhone}
                                onChange={(event) =>
                                    setProfilePhone(event.target.value)
                                }
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label
                                htmlFor="profile-bio"
                                className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1"
                            >
                                About Me / Bio
                            </label>

                            <textarea
                                id="profile-bio"
                                value={profileBio}
                                onChange={(event) =>
                                    setProfileBio(event.target.value)
                                }
                                rows={3}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                            />
                        </div>

                        <button
                            type="submit"
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition"
                        >
                            Save Configurations
                        </button>
                    </form>
                ) : (
                    <div className="text-sm space-y-3 text-slate-600">
                        <p>
                            <span className="font-bold text-slate-400 mr-2">
                                Contact Number:
                            </span>
                            {profilePhone}
                        </p>

                        <p>
                            <span className="font-bold text-slate-400 mr-2">
                                Background Bio:
                            </span>
                            {profileBio}
                        </p>
                    </div>
                )}
            </section>

            {/* Feedback Messages */}
            {message.text && (
                <div
                    role="alert"
                    className={`p-4 rounded-xl text-sm font-medium border ${
                        message.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-rose-50 border-rose-200 text-rose-600'
                    }`}
                >
                    {message.text}
                </div>
            )}

            {/* Appointments Queue */}
            <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5">
                    <div>
                        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                            Active Appointments Queue
                        </h2>

                        <p className="text-xs text-slate-400 mt-1">
                            Review appointments, patient histories and consultation reports.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={fetchAllAppointments}
                        disabled={loading}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
                    >
                        Refresh Records
                    </button>
                </div>

                {loading ? (
                    <p className="text-sm text-slate-400 py-4 animate-pulse">
                        Loading appointment records...
                    </p>
                ) : appointments.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4">
                        No appointment records were found.
                    </p>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full min-w-[850px] text-left">
                            <thead className="bg-slate-100">
                                <tr>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-600">
                                        ID
                                    </th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-600">
                                        Patient
                                    </th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-600">
                                        Date & Time
                                    </th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-600">
                                        Practitioner
                                    </th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-600">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-xs font-bold text-slate-600">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-200">
                                {appointments.map((appt) => {
                                    const isExpanded = expandedClient === appt.id;

                                    const clientHistory = appointments.filter(
                                        (item) =>
                                            item.client_id != null &&
                                            String(item.client_id) === String(appt.client_id)
                                    );

                                    return (
                                        <React.Fragment key={appt.id}>
                                            <tr className="hover:bg-slate-50">
                                                <td className="px-4 py-4 text-sm font-semibold text-slate-700">
                                                    #{appt.id}
                                                </td>

                                                <td className="px-4 py-4 text-sm text-slate-700">
                                                    {getPatientName(appt)}
                                                </td>

                                                <td className="px-4 py-4 text-sm text-slate-600">
                                                    {formatDate(appt.time_slot?.start_time)}
                                                </td>

                                                <td className="px-4 py-4 text-sm text-slate-600">
                                                    {appt.time_slot?.provider?.name || 'Not specified'}
                                                </td>

                                                <td className="px-4 py-4">
                                                    <span className={`px-2 py-1 rounded-md text-xs font-semibold border ${getStatusClasses(appt.status)}`}>
                                                        {appt.status === 'no_show'
                                                            ? 'Did Not Come'
                                                            : appt.status === 'completed'
                                                                ? 'Completed'
                                                                : appt.status === 'booked'
                                                                    ? 'Booked'
                                                                    : appt.status || 'Unknown'}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-4">
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                setExpandedClient(isExpanded ? null : appt.id)
                                                            }
                                                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
                                                        >
                                                            {isExpanded ? 'Close' : 'View'}
                                                        </button>

                                                        {appt.status === 'booked' && (
                                                            <button
                                                                type="button"
                                                                disabled={completingId === appt.id}
                                                                onClick={() => handleMarkCompleted(appt.id)}
                                                                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
                                                            >
                                                                {completingId === appt.id
                                                                    ? 'Updating...'
                                                                    : 'Complete'}
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>

                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan="6" className="px-5 py-5 bg-slate-50">
                                                        <div className="space-y-5">
                                                            <div>
                                                                <h3 className="text-sm font-bold text-slate-700 mb-2">
                                                                    Appointment Details
                                                                </h3>

                                                                <p className="text-sm text-slate-600">
                                                                    Notes: {appt.notes || 'None provided.'}
                                                                </p>
                                                            </div>

                                                            <div>
                                                                <h3 className="text-sm font-bold text-slate-700 mb-3">
                                                                    Patient Appointment History
                                                                </h3>

                                                                <div className="space-y-3">
                                                                    {clientHistory.map((historyItem) => (
                                                                        <div
                                                                            key={historyItem.id}
                                                                            className="bg-white border border-slate-200 rounded-lg p-3"
                                                                        >
                                                                            <p className="text-sm font-semibold text-slate-700">
                                                                                Appointment #{historyItem.id}
                                                                            </p>

                                                                            <p className="text-xs text-slate-500 mt-1">
                                                                                {formatDate(historyItem.time_slot?.start_time)}
                                                                            </p>

                                                                            <p className="text-xs text-slate-500 mt-1">
                                                                                Status: {historyItem.status || 'Unknown'}
                                                                            </p>

                                                                            {historyItem.consultation_report && (
                                                                                <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">
                                                                                    Report: {historyItem.consultation_report}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* Consultation Report */}
                                                            <div className="border-t border-slate-200 pt-4 space-y-3">
                                                                <label
                                                                    htmlFor={`report-${appt.id}`}
                                                                    className="block text-sm font-bold text-slate-700"
                                                                >
                                                                    Consultation Report
                                                                </label>

                                                                <textarea
                                                                    id={`report-${appt.id}`}
                                                                    value={reportsData[appt.id] ?? ''}
                                                                    onChange={(event) =>
                                                                        handleReportInputChange(
                                                                            appt.id,
                                                                            event.target.value
                                                                        )
                                                                    }
                                                                    rows={4}
                                                                    placeholder="Enter the consultation report..."
                                                                    className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                                                                />

                                                                <div className="flex justify-end">
                                                                    <button
                                                                        type="button"
                                                                        disabled={savingReportId === appt.id}
                                                                        onClick={() => handleSaveReport(appt.id)}
                                                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg"
                                                                    >
                                                                        {savingReportId === appt.id
                                                                            ? 'Saving Report...'
                                                                            : 'Save Consultation Report'}
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
        </div>
    );
}
