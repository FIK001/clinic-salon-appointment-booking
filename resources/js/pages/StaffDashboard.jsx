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

    // Schedule management state
    const [schedule, setSchedule] = useState({
        working_days: [],
        start_time: '09:00',
        end_time: '17:00',
        break_start: '',
        break_end: ''
    });

    const [scheduleLoading, setScheduleLoading] = useState(true);
    const [savingSchedule, setSavingSchedule] = useState(false);

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

    // Fetch the authenticated staff member's own schedule.
    const fetchSchedule = useCallback(async () => {
        try {
            const token = localStorage.getItem('token');

            const response = await fetch('/api/staff/schedule', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json'
                }
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));

                throw new Error(
                    data.message || 'Unable to load your working schedule.'
                );
            }

            const data = await response.json();
            const saved = data.schedule;

            if (saved) {
                setSchedule({
                    working_days: saved.working_days || [],
                    start_time: saved.start_time?.slice(0, 5) || '09:00',
                    end_time: saved.end_time?.slice(0, 5) || '17:00',
                    break_start: saved.break_start?.slice(0, 5) || '',
                    break_end: saved.break_end?.slice(0, 5) || ''
                });
            }
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.message
            });
        } finally {
            setScheduleLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllAppointments();
        fetchSchedule();
    }, [fetchAllAppointments, fetchSchedule]);

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

    // Select or deselect working days.
    const toggleWorkingDay = (day) => {
        setSchedule((current) => ({
            ...current,
            working_days: current.working_days.includes(day)
                ? current.working_days.filter((item) => item !== day)
                : [...current.working_days, day]
        }));
    };

    // Save schedule to the database.
    const handleSaveSchedule = async (event) => {
        event.preventDefault();

        setSavingSchedule(true);
        setMessage({ type: '', text: '' });

        try {
            const token = localStorage.getItem('token');

            const response = await fetch('/api/staff/schedule', {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify(schedule)
            });

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                const validationErrors = data.errors
                    ? Object.values(data.errors).flat().join(' ')
                    : '';

                throw new Error(
                    validationErrors ||
                    data.message ||
                    'Unable to save schedule.'
                );
            }

            setMessage({
                type: 'success',
                text: data.message ||
                    'Your working schedule has been saved successfully.'
            });

            await fetchSchedule();
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.message
            });
        } finally {
            setSavingSchedule(false);
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

            {/* Schedule Management */}
            <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
                <div className="border-b border-slate-100 pb-4 mb-5">
                    <h2 className="text-base font-bold text-slate-800">
                        Schedule Management
                    </h2>

                    <p className="text-xs text-slate-400 mt-1">
                        Manage your working days, office hours and break periods.
                    </p>
                </div>

                {scheduleLoading ? (
                    <p className="text-sm text-slate-400">
                        Loading your schedule...
                    </p>
                ) : (
                    <form
                        onSubmit={handleSaveSchedule}
                        className="space-y-6"
                    >
                        {/* Working Days */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-3">
                                Working Days
                            </label>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {[
                                    'Monday',
                                    'Tuesday',
                                    'Wednesday',
                                    'Thursday',
                                    'Friday',
                                    'Saturday',
                                    'Sunday'
                                ].map((day) => (
                                    <label
                                        key={day}
                                        className="flex items-center gap-2 p-3 border border-slate-200 rounded-lg text-sm cursor-pointer hover:bg-slate-50"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={schedule.working_days.includes(day)}
                                            onChange={() => toggleWorkingDay(day)}
                                            className="w-4 h-4 accent-blue-600"
                                        />

                                        {day}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Working Hours */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label
                                    className="block text-xs font-bold text-slate-500 mb-2"
                                    htmlFor="schedule-start"
                                >
                                    Opening Time
                                </label>

                                <input
                                    id="schedule-start"
                                    type="time"
                                    required
                                    value={schedule.start_time}
                                    onChange={(event) =>
                                        setSchedule((current) => ({
                                            ...current,
                                            start_time: event.target.value
                                        }))
                                    }
                                    className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm"
                                />
                            </div>

                            <div>
                                <label
                                    className="block text-xs font-bold text-slate-500 mb-2"
                                    htmlFor="schedule-end"
                                >
                                    Closing Time
                                </label>

                                <input
                                    id="schedule-end"
                                    type="time"
                                    required
                                    value={schedule.end_time}
                                    onChange={(event) =>
                                        setSchedule((current) => ({
                                            ...current,
                                            end_time: event.target.value
                                        }))
                                    }
                                    className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm"
                                />
                            </div>
                        </div>

                        {/* Break Period */}
                        <div className="border-t border-slate-100 pt-5">
                            <h3 className="text-sm font-bold text-slate-700 mb-1">
                                Break Period
                            </h3>

                            <p className="text-xs text-slate-400 mb-4">
                                Leave both fields empty if you do not take a scheduled break.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                <div>
                                    <label
                                        className="block text-xs font-bold text-slate-500 mb-2"
                                        htmlFor="break-start"
                                    >
                                        Break Starts
                                    </label>

                                    <input
                                        id="break-start"
                                        type="time"
                                        value={schedule.break_start}
                                        onChange={(event) =>
                                            setSchedule((current) => ({
                                                ...current,
                                                break_start: event.target.value
                                            }))
                                        }
                                        className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm"
                                    />
                                </div>

                                <div>
                                    <label
                                        className="block text-xs font-bold text-slate-500 mb-2"
                                        htmlFor="break-end"
                                    >
                                        Break Ends
                                    </label>

                                    <input
                                        id="break-end"
                                        type="time"
                                        value={schedule.break_end}
                                        onChange={(event) =>
                                            setSchedule((current) => ({
                                                ...current,
                                                break_end: event.target.value
                                            }))
                                        }
                                        className="w-full px-3 py-3 border border-slate-200 rounded-xl text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Save Schedule */}
                        <div className="flex justify-end border-t border-slate-100 pt-5">
                            <button
                                type="submit"
                                disabled={savingSchedule || scheduleLoading}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition"
                            >
                                {savingSchedule
                                    ? 'Saving Schedule...'
                                    : 'Save Schedule'}
                            </button>
                        </div>
                    </form>
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
