import React, { useState, useEffect, useCallback } from 'react';

export default function MyAppointments() {
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Rescheduling states
    const [selectedAppointment, setSelectedAppointment] = useState(null);
    const [rescheduleDate, setRescheduleDate] = useState('');
    const [availableSlots, setAvailableSlots] = useState([]);
    const [selectedSlotId, setSelectedSlotId] = useState('');
    const [slotsLoading, setSlotsLoading] = useState(false);
    const [rescheduling, setRescheduling] = useState(false);

    const getToken = () => localStorage.getItem('token');

    const getTomorrowDate = () => {
        const date = new Date();
        date.setDate(date.getDate() + 1);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        return `${year}-${month}-${day}`;
    };

    const fetchAppointments = useCallback(async () => {
        try {
            const token = getToken();

            const response = await fetch('/api/appointments', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Unable to load your appointments.');
            }

            const data = await response.json();

            setAppointments(
                Array.isArray(data) ? data : data.data || []
            );
        } catch (err) {
            console.error('Failed to fetch appointments:', err);
            setMessage({
                type: 'error',
                text: err.message,
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    // Cancel appointment
    const handleCancel = async (id) => {
        if (!window.confirm('Are you sure you want to cancel this appointment?')) {
            return;
        }

        setMessage({ type: '', text: '' });

        try {
            const token = getToken();

            const response = await fetch(`/api/appointments/${id}/cancel`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Unable to cancel appointment.');
            }

            setMessage({
                type: 'success',
                text: 'Appointment cancelled successfully.',
            });

            await fetchAppointments();
        } catch (err) {
            setMessage({
                type: 'error',
                text: err.message,
            });
        }
    };

    // Open rescheduling window
    const openReschedule = (appointment) => {
        setSelectedAppointment(appointment);
        setRescheduleDate(getTomorrowDate());
        setSelectedSlotId('');
        setAvailableSlots([]);
        setMessage({ type: '', text: '' });
    };

    // Load available slots for the original practitioner and service
    const fetchAvailableSlots = useCallback(async () => {
        if (!selectedAppointment || !rescheduleDate) {
            setAvailableSlots([]);
            return;
        }

        const providerId =
            selectedAppointment.time_slot?.provider_id ??
            selectedAppointment.time_slot?.provider?.id;

        const serviceId =
            selectedAppointment.service_id ??
            selectedAppointment.service?.id;

        if (!providerId || !serviceId) {
            setMessage({
                type: 'error',
                text: 'Unable to identify the original practitioner or service.',
            });
            return;
        }

        setSlotsLoading(true);
        setAvailableSlots([]);
        setSelectedSlotId('');

        try {
            const token = getToken();

            const params = new URLSearchParams({
                provider_id: String(providerId),
                service_id: String(serviceId),
                date: rescheduleDate,
            });

            const response = await fetch(
                `/api/marketplace/slots?${params.toString()}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json',
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Unable to load available slots.');
            }

            const slots = Array.isArray(data.slots) ? data.slots : [];

            setAvailableSlots(
                slots.filter((slot) => {
                    const slotId = slot.id ?? slot.time_slot_id;

                    return (
                        slotId != null &&
                        String(slotId) !== String(selectedAppointment.time_slot_id)
                    );
                })
            );
        } catch (err) {
            setMessage({
                type: 'error',
                text: err.message,
            });
        } finally {
            setSlotsLoading(false);
        }
    }, [selectedAppointment, rescheduleDate]);

    useEffect(() => {
        fetchAvailableSlots();
    }, [fetchAvailableSlots]);

    // Confirm rescheduling
    const handleReschedule = async () => {
        if (!selectedAppointment || !selectedSlotId) {
            setMessage({
                type: 'error',
                text: 'Please select a new appointment time.',
            });
            return;
        }

        const confirmed = window.confirm(
            'Are you sure you want to reschedule this appointment?'
        );

        if (!confirmed) return;

        setRescheduling(true);
        setMessage({ type: '', text: '' });

        try {
            const token = getToken();

            const response = await fetch(
                `/api/appointments/${selectedAppointment.id}/reschedule`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                    body: JSON.stringify({
                        time_slot_id: Number(selectedSlotId),
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || 'Unable to reschedule appointment.'
                );
            }

            setSelectedAppointment(null);
            setAvailableSlots([]);
            setSelectedSlotId('');

            setMessage({
                type: 'success',
                text: 'Appointment successfully rescheduled. A confirmation email has been queued.',
            });

            await fetchAppointments();
        } catch (err) {
            setMessage({
                type: 'error',
                text: err.message,
            });
        } finally {
            setRescheduling(false);
        }
    };

    const formatDate = (value) => {
        if (!value || Number.isNaN(new Date(value).getTime())) {
            return 'Pending';
        }

        return new Date(value).toLocaleString();
    };

    return (
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 p-6">

            <div className="border-b border-slate-100 pb-4 mb-6">
                <h2 className="text-xl font-bold text-slate-800">
                    My Scheduled Consultations
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                    Review active bookings, monitor statuses, or manage your appointments below.
                </p>
            </div>

            {message.text && (
                <div
                    role="alert"
                    className={`mb-6 p-4 rounded-xl text-sm font-medium border ${
                        message.type === 'success'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-rose-50 border-rose-200 text-rose-600'
                    }`}
                >
                    {message.text}
                </div>
            )}

            {loading ? (
                <p className="text-sm text-slate-400 py-4">
                    Loading appointments...
                </p>
            ) : appointments.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-sm text-slate-500">
                        You do not have any appointments recorded yet.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {appointments.map((appt) => (
                        <div
                            key={appt.id}
                            className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                        >
                            <div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-xs font-bold uppercase px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100">
                                        ID: {appt.id}
                                    </span>

                                    <span
                                        className={`text-xs font-semibold px-2 py-0.5 rounded-md border capitalize ${
                                            appt.status === 'booked'
                                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                                : appt.status === 'cancelled'
                                                ? 'bg-slate-100 border-slate-200 text-slate-500'
                                                : appt.status === 'completed'
                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                : 'bg-rose-50 border-rose-200 text-rose-700'
                                        }`}
                                    >
                                        {appt.status}
                                    </span>
                                </div>

                                <span className="block text-sm font-bold text-slate-800 mt-2">
                                    {appt.service?.name || 'General Consultation'}
                                </span>

                                <span className="block text-xs text-slate-500 mt-1">
                                    Scheduled Time: {formatDate(appt.time_slot?.start_time)}
                                </span>

                                <span className="block text-xs text-slate-500 mt-1">
                                    Practitioner: {appt.time_slot?.provider?.name || 'Not specified'}
                                </span>

                                {appt.notes && (
                                    <p className="text-xs text-slate-400 mt-2 bg-white p-2 rounded-lg border border-slate-100 italic">
                                        "{appt.notes}"
                                    </p>
                                )}
                            </div>

                            {appt.status === 'booked' && (
                                <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                                    <button
                                        type="button"
                                        onClick={() => openReschedule(appt)}
                                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-100 transition"
                                    >
                                        Reschedule
                                    </button>

                                    <button
                                        type="button"
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

            {/* Rescheduling modal */}
            {selectedAppointment && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">

                        <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-5">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">
                                    Reschedule Appointment
                                </h3>

                                <p className="text-xs text-slate-500 mt-1">
                                    Appointment #{selectedAppointment.id}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setSelectedAppointment(null)}
                                className="text-slate-400 hover:text-slate-700 text-xl"
                                aria-label="Close rescheduling window"
                            >
                                ×
                            </button>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 mb-5 text-sm">
                            <p className="font-semibold text-slate-700">
                                Current appointment
                            </p>

                            <p className="text-slate-500 mt-2">
                                {formatDate(selectedAppointment.time_slot?.start_time)}
                            </p>

                            <p className="text-xs text-slate-500 mt-2">
                                Practitioner: {selectedAppointment.time_slot?.provider?.name || 'Not specified'}
                            </p>
                        </div>

                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Select New Appointment Date
                        </label>

                        <input
                            type="date"
                            min={getTomorrowDate()}
                            value={rescheduleDate}
                            onChange={(event) => setRescheduleDate(event.target.value)}
                            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />

                        <div className="mt-5">
                            <h4 className="text-sm font-semibold text-slate-700 mb-3">
                                Available Appointment Times
                            </h4>

                            {slotsLoading ? (
                                <p className="text-sm text-slate-400">
                                    Loading available times...
                                </p>
                            ) : availableSlots.length === 0 ? (
                                <p className="text-sm text-slate-500 bg-slate-50 p-4 rounded-xl">
                                    No available appointments found for this date. Please select another date.
                                </p>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {availableSlots.map((slot) => {
                                        const slotId = slot.id ?? slot.time_slot_id;
                                        const slotTime = slot.start_time || slot.starts_at;

                                        return (
                                            <button
                                                type="button"
                                                key={slotId}
                                                onClick={() => setSelectedSlotId(String(slotId))}
                                                className={`p-3 rounded-xl border text-sm text-left transition ${
                                                    String(selectedSlotId) === String(slotId)
                                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                        : 'border-slate-200 hover:border-blue-300 text-slate-700'
                                                }`}
                                            >
                                                <span className="block font-semibold">
                                                    {formatDate(slotTime)}
                                                </span>

                                                {String(selectedSlotId) === String(slotId) && (
                                                    <span className="block text-xs mt-1">
                                                        Selected
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                            <button
                                type="button"
                                onClick={() => setSelectedAppointment(null)}
                                disabled={rescheduling}
                                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                            >
                                Close
                            </button>

                            <button
                                type="button"
                                onClick={handleReschedule}
                                disabled={!selectedSlotId || slotsLoading || rescheduling}
                                className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-lg"
                            >
                                {rescheduling ? 'Rescheduling...' : 'Confirm Reschedule'}
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
}
