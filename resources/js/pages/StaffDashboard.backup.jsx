
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
    const [noShowId, setNoShowId] = useState(null);

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

    const handleMarkNoShow = async (id) => {
        setMessage({ type: '', text: '' });
        setNoShowId(id);

        try {
            const token = localStorage.getItem('token');

            const response = await fetch(
                `/api/appointments/${id}/no-show`,
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
                    data.message || 'Failed to update appointment status.'
                );
            }

            setMessage({
                type: 'success',
                text: `Appointment #${id} marked as Did Not Come.`
            });

            await fetchAllAppointments();
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.message || 'Unable to update appointment.'
            });
        } finally {
            setNoShowId(null);
        }
    };

    const handleReportInputChange = (apptId, value) => {
        setReportsData((previousReports) => ({
            ...previousReports,
            [apptId]: value
        }));
    };

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

    const saveProfileChanges = (event) => {
        event.preventDefault();

        setIsEditingProfile(false);

        setMessage({
            type: 'success',
            text: 'Profile changes applied in this session.'
        });
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return 'Pending';

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) return 'Pending';

        return date.toLocaleString();
    };

    const getPatientName = (appt) => {
        return (
            appt.client?.name ||
            appt.client?.user?.name ||
            `User #${appt.client_id ?? 'Unknown'}`
        );
    };

    const getStatusClasses = (status) => {
        if (status === 'no_show') {
            return 'bg-rose-50 border-rose-200 text-rose-600';
        }

        if (status === 'booked') {
            return 'bg-amber-50 border-amber-200 text-amber-700';
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
                    <div className="space-y-4">
                        {appointments.map((appt) => {
                            const isExpanded = expandedClient === appt.id;

                            const clientHistory = appointments.filter(
                                (item) =>
                                    item.client_id != null &&
                                    String(item.client_id) ===
                                        String(appt.client_id)
                            );

                            return (
                                <article
                                    key={appt.id}
                                    className="p-5 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-4 shadow-sm"
                                >
                                    {/* Appointment Details */}
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                        <div className="space-y-2 min-w-0">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
                                                    ID: #{appt.id}
                                                </span>

                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setExpandedClient(
                                                            isExpanded
                                                                ? null
                                                                : appt.id
                                                        )
                                                    }
                                                    aria-expanded={isExpanded}
                                                    className="text-sm font-bold text-blue-600 hover:text-blue-700 underline transition text-left"
                                                >
                                                    Patient: {getPatientName(appt)}
                                                </button>

                                                <span
                                                    className={`px-2 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${getStatusClasses(appt.status)}`}
                                                >
                                                    {appt.status === 'no_show'
                                                        ? 'Did Not Come'
                                                        : appt.status === 'booked'
                                                            ? 'Booked'
                                                            : appt.status || 'Unknown'}
                                                </span>
                                            </div>

                                            <p className="text-xs text-slate-500 font-semibold">
                                                Schedule:{' '}
                                                {formatDate(
                                                    appt.time_slot?.start_time
                                                )}
                                            </p>

                                            <p className="text-xs text-slate-500">
                                                Notes: {appt.notes || 'None provided.'}
                                            </p>

                                            {appt.time_slot?.provider?.name && (
                                                <p className="text-xs text-slate-500">
                                                    Practitioner:{' '}
                                                    {appt.time_slot.provider.name}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setExpandedClient(
                                                        isExpanded
                                                            ? null
                                                            : appt.id
                                                    )
                                                }
                                                className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg"
                                            >
                                                {isExpanded
                                                    ? 'Hide History'
                                                    : 'View History'}
                                            </button>

                                            {appt.status === 'booked' && (
                                                <button
                                                    type="button"
                                                    disabled={noShowId === appt.id}
                                                    onClick={() =>
                                                        handleMarkNoShow(appt.id)
                                                    }
                                                    className="px-3 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
                                                >
                                                    {noShowId === appt.id
                                                        ? 'Updating...'
                                                        : 'Mark No-Show'}
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Patient History */}
                                    {isExpanded && (
                                        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3">
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                                                Patient Appointment History
                                            </h3>

                                            <p className="text-xs text-slate-500">
                                                Patient: {getPatientName(appt)}
                                            </p>

                                            {clientHistory.length === 0 ? (
                                                <p className="text-xs text-slate-500">
                                                    No additional history is available.
                                                </p>
                                            ) : (
                                                <div className="space-y-3">
                                                    {clientHistory.map((historyItem) => (
                                                        <div
                                                            key={historyItem.id}
                                                            className="border-l-2 border-blue-200 pl-3 py-1"
                                                        >
                                                            <p className="text-xs font-semibold text-slate-700">
                                                                Appointment #{historyItem.id}
                                                            </p>

                                                            <p className="text-xs text-slate-500 mt-1">
                                                                {formatDate(
                                                                    historyItem.time_slot?.start_time
                                                                )}
                                                            </p>

                                                            <p className="text-xs text-slate-500 mt-1">
                                                                Status:{' '}
                                                                {historyItem.status || 'Unknown'}
                                                            </p>

                                                            {historyItem.consultation_report && (
                                                                <p className="text-xs text-slate-600 mt-2 whitespace-pre-wrap">
                                                                    Report:{' '}
                                                                    {historyItem.consultation_report}
                                                                </p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Consultation Report */}
                                    <div className="border-t border-slate-200 pt-4 space-y-3">
                                        <label
                                            htmlFor={`report-${appt.id}`}
                                            className="block text-xs font-bold uppercase tracking-wider text-slate-600"
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
                                            placeholder="Enter the consultation report for this appointment..."
                                            className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                                        />

                                        <div className="flex justify-end">
                                            <button
                                                type="button"
                                                disabled={savingReportId === appt.id}
                                                onClick={() =>
                                                    handleSaveReport(appt.id)
                                                }
                                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition"
                                            >
                                                {savingReportId === appt.id
                                                    ? 'Saving Report...'
                                                    : 'Save Consultation Report'}
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
