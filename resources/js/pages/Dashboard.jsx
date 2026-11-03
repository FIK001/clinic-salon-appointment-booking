import React, { useState, useEffect, useCallback } from 'react';

const getLocalDateString = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

export default function Dashboard() {
    const [sector, setSector] = useState('clinic');
    const [role, setRole] = useState('GP');
    const [providers, setProviders] = useState([]);
    const [selectedProviderId, setSelectedProviderId] = useState('');
    const [selectedProvider, setSelectedProvider] = useState(null);

    // Service selection states
    const [services, setServices] = useState([]);
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [servicesLoading, setServicesLoading] = useState(false);

    const [selectedDate, setSelectedDate] = useState(() => getLocalDateString());

    const [slotsData, setSlotsData] = useState({
        status: '',
        slots: [],
        message: ''
    });

    const [searchId, setSearchSearchId] = useState('');
    const [searchedAppointment, setSearchAppointment] = useState(null);
    const [allAppointments, setAllAppointments] = useState([]);
    const [bookingNote, setBookingNote] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);
    const [providersLoading, setProvidersLoading] = useState(false);

    const rolesMap = {
        clinic: [
            'GP',
            'Neurologist',
            'Dermatologist',
            'Pediatrician',
            'Cardiologist'
        ],
        salon: [
            'Barber',
            'Hairstylist',
            'Nail Technician',
            'Esthetician'
        ]
    };

    const getToken = () => localStorage.getItem('token');

    // Fetch providers based on selected specialty.
    const fetchProviders = useCallback(async (targetRole) => {
        setProvidersLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const token = getToken();

            const params = new URLSearchParams({
                specialty: targetRole
            });

            const response = await fetch(
                `/api/marketplace/specialists?${params.toString()}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Unable to load specialists.');
            }

            const data = await response.json();

            const providerArray = Array.isArray(data)
                ? data
                : Array.isArray(data.data)
                    ? data.data
                    : [];

            setProviders(providerArray);

            setSelectedProviderId((currentId) => {
                const stillExists = providerArray.some(
                    (provider) => String(provider.id) === String(currentId)
                );

                if (stillExists) return currentId;

                return providerArray.length
                    ? String(providerArray[0].id)
                    : '';
            });

            if (providerArray.length === 0) {
                setSlotsData({
                    status: '',
                    slots: [],
                    message: 'No specialists found for this role.'
                });
            }
        } catch (error) {
            console.error('Error fetching specialists:', error);

            setProviders([]);
            setSelectedProviderId('');

            setMessage({
                type: 'error',
                text: error.message || 'Failed to load specialists.'
            });
        } finally {
            setProvidersLoading(false);
        }
    }, []);

    // Fetch services belonging to the selected provider.
    const fetchProviderServices = useCallback(async () => {
        if (!selectedProviderId) {
            setServices([]);
            setSelectedServiceId('');
            return;
        }

        setServicesLoading(true);
        setServices([]);
        setSelectedServiceId('');

        try {
            const token = getToken();

            const response = await fetch(
                `/api/marketplace/providers/${selectedProviderId}/services`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json'
                    }
                }
            );

            if (!response.ok) {
                throw new Error('Unable to load provider services.');
            }

            const data = await response.json();

            const providerServices = Array.isArray(data.services)
                ? data.services
                : [];

            setServices(providerServices);

            if (providerServices.length > 0) {
                setSelectedServiceId(String(providerServices[0].id));
            }
        } catch (error) {
            console.error('Error fetching provider services:', error);

            setServices([]);
            setSelectedServiceId('');

            setMessage({
                type: 'error',
                text: error.message || 'Failed to load provider services.'
            });
        } finally {
            setServicesLoading(false);
        }
    }, [selectedProviderId]);

    // Fetch available appointment slots for the selected provider and service.
    const fetchSpecialistSlots = useCallback(async () => {
        if (
            !selectedProviderId ||
            !selectedServiceId ||
            !selectedDate ||
            servicesLoading
        ) {
            setSlotsData({
                status: '',
                slots: [],
                message: ''
            });
            return;
        }

        setLoading(true);

        try {
            const token = getToken();

            const params = new URLSearchParams({
                provider_id: selectedProviderId,
                service_id: selectedServiceId,
                date: selectedDate
            });

            const response = await fetch(
                `/api/marketplace/slots?${params.toString()}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        Accept: 'application/json'
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || 'Unable to load available appointment slots.'
                );
            }

            setSlotsData({
                ...data,
                slots: Array.isArray(data.slots) ? data.slots : []
            });
        } catch (error) {
            console.error('Error loading appointment slots:', error);

            setSlotsData({
                status: 'error',
                slots: [],
                message: error.message
            });
        } finally {
            setLoading(false);
        }
    }, [
        selectedProviderId,
        selectedServiceId,
        selectedDate,
        servicesLoading
    ]);

    // Fetch appointment history.
    const fetchAppointmentsHistory = useCallback(async () => {
        try {
            const token = getToken();

            const response = await fetch('/api/appointments', {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('Unable to load appointment history.');
            }

            const data = await response.json();

            setAllAppointments(
                Array.isArray(data)
                    ? data
                    : Array.isArray(data.data)
                        ? data.data
                        : []
            );
        } catch (error) {
            console.error('Failed fetching appointments:', error);
        }
    }, []);

    // Reset selections when sector changes.
    useEffect(() => {
        setRole(rolesMap[sector][0]);
        setProviders([]);
        setSelectedProviderId('');
        setSelectedProvider(null);
        setServices([]);
        setSelectedServiceId('');

        setSlotsData({
            status: '',
            slots: [],
            message: ''
        });
    }, [sector]);

    // Load providers when specialty changes.
    useEffect(() => {
        if (role) {
            fetchProviders(role);
        }
    }, [role, fetchProviders]);

    // Load services when provider changes.
    useEffect(() => {
        fetchProviderServices();
    }, [fetchProviderServices]);

    // Update selected provider and load appointment slots.
    useEffect(() => {
        const selected = providers.find(
            (provider) => String(provider.id) === String(selectedProviderId)
        );

        setSelectedProvider(selected || null);

        if (selectedProviderId) {
            fetchSpecialistSlots();
        } else {
            setSlotsData({
                status: '',
                slots: [],
                message: ''
            });
        }
    }, [
        selectedProviderId,
        selectedServiceId,
        selectedDate,
        providers,
        fetchSpecialistSlots
    ]);

    // Load appointment history on page opening.
    useEffect(() => {
        fetchAppointmentsHistory();
    }, [fetchAppointmentsHistory]);

    // Search appointment by ID.
    const handleSearchAppointment = (event) => {
        event.preventDefault();

        if (!searchId.trim()) {
            setSearchAppointment(null);
            return;
        }

        const found = allAppointments.find(
            (appointment) => String(appointment.id) === searchId.trim()
        );

        setSearchAppointment(found || 'not_found');
    };

    // Book appointment using the selected service.
    const bookAppointment = async (slotId) => {
        setMessage({ type: '', text: '' });

        if (!selectedServiceId) {
            setMessage({
                type: 'error',
                text: 'Please select a service before booking.'
            });
            return;
        }

        try {
            const token = getToken();

            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                },
                body: JSON.stringify({
                    time_slot_id: slotId,
                    service_id: Number(selectedServiceId),
                    notes: bookingNote
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Booking failed.');
            }

            setMessage({
                type: 'success',
                text: 'Appointment booked successfully.'
            });

            setBookingNote('');

            await Promise.all([
                fetchSpecialistSlots(),
                fetchAppointmentsHistory()
            ]);
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.message || 'Unable to book appointment.'
            });
        }
    };

    // Identify the next scheduled appointment.
    const upcomingAppointment = allAppointments
        .filter((appointment) => {
            const startTime = appointment.time_slot?.start_time;

            return (
                appointment.status === 'booked' &&
                startTime &&
                !Number.isNaN(new Date(startTime).getTime()) &&
                new Date(startTime) >= new Date()
            );
        })
        .sort(
            (a, b) =>
                new Date(a.time_slot.start_time) -
                new Date(b.time_slot.start_time)
        )[0] || null;

    // Format dates for display.
    const formatDate = (value) => {
        if (!value || Number.isNaN(new Date(value).getTime())) {
            return 'Pending';
        }

        return new Date(value).toLocaleString();
    };

    const availableSlots = slotsData.slots || [];

    const selectedService = services.find(
        (service) => String(service.id) === String(selectedServiceId)
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 font-sans pb-12">

            {upcomingAppointment && (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-4 text-white shadow-lg flex items-center justify-between gap-4">
                    <div>
                        <span className="text-xs uppercase tracking-wider font-bold opacity-80 block">
                            Next Scheduled Appointment
                        </span>

                        <p className="text-base font-bold mt-1">
                            With {upcomingAppointment.time_slot?.provider?.name || 'Your Specialist'} on{' '}
                            {formatDate(upcomingAppointment.time_slot?.start_time)}
                        </p>
                    </div>

                    <span className="text-xs font-mono font-bold bg-white/20 border border-white/20 px-3 py-1 rounded-xl">
                        ID: #{upcomingAppointment.id}
                    </span>
                </div>
            )}

            {/* Appointment search */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Search Appointment by ID
                </h3>

                <form onSubmit={handleSearchAppointment} className="flex flex-col sm:flex-row gap-3">
                    <input
                        type="number"
                        min="1"
                        value={searchId}
                        onChange={(event) => setSearchSearchId(event.target.value)}
                        placeholder="Enter appointment ID"
                        className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <button
                        type="submit"
                        className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-sm"
                    >
                        Search
                    </button>
                </form>

                {searchedAppointment === 'not_found' && (
                    <p className="text-xs font-semibold text-rose-600 mt-3">
                        No appointment matches that ID in the loaded records.
                    </p>
                )}

                {searchedAppointment && searchedAppointment !== 'not_found' && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                        <div className="flex justify-between gap-3 font-bold border-b pb-2 text-slate-700">
                            <span>Appointment #{searchedAppointment.id}</span>

                            <span className="uppercase text-blue-600">
                                {searchedAppointment.status}
                            </span>
                        </div>

                        <p>
                            <strong>Schedule:</strong>{' '}
                            {formatDate(searchedAppointment.time_slot?.start_time)}
                        </p>

                        <p>
                            <strong>Notes:</strong>{' '}
                            {searchedAppointment.notes || 'None provided.'}
                        </p>

                        {searchedAppointment.consultation_report && (
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-800">
                                <strong className="block mb-1">
                                    Consultation Report
                                </strong>

                                {searchedAppointment.consultation_report}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Appointment selection */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 grid grid-cols-1 md:grid-cols-5 gap-6 items-end">

                {/* Sector */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        1. Select Sector
                    </label>

                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setSector('clinic')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                                sector === 'clinic'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-500'
                            }`}
                        >
                            Clinics
                        </button>

                        <button
                            type="button"
                            onClick={() => setSector('salon')}
                            className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${
                                sector === 'salon'
                                    ? 'bg-white text-blue-600 shadow-sm'
                                    : 'text-slate-500'
                            }`}
                        >
                            Salon
                        </button>
                    </div>
                </div>

                {/* Specialist */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        2. Select Specialist
                    </label>

                    <select
                        value={role}
                        onChange={(event) => setRole(event.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    >
                        {rolesMap[sector].map((item) => (
                            <option key={item} value={item}>
                                {item}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Provider */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        3. Select Provider
                    </label>

                    <select
                        value={selectedProviderId}
                        onChange={(event) => setSelectedProviderId(event.target.value)}
                        disabled={providersLoading || providers.length === 0}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    >
                        {providers.length === 0 && (
                            <option value="">
                                {providersLoading ? 'Loading...' : 'No providers available'}
                            </option>
                        )}

                        {providers.map((provider) => (
                            <option key={provider.id} value={String(provider.id)}>
                                {provider.name || provider.user?.name || `Provider #${provider.id}`}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Service */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        4. Select Service
                    </label>

                    <select
                        value={selectedServiceId}
                        onChange={(event) => setSelectedServiceId(event.target.value)}
                        disabled={servicesLoading || services.length === 0}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    >
                        <option value="">
                            {servicesLoading
                                ? 'Loading services...'
                                : services.length === 0
                                    ? 'No services available'
                                    : 'Select a service'}
                        </option>

                        {services.map((service) => (
                            <option key={service.id} value={String(service.id)}>
                                {service.name} — {service.duration_minutes} mins — ₦{Number(service.price).toLocaleString()}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Date */}
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        5. Appointment Date
                    </label>

                    <input
                        type="date"
                        value={selectedDate}
                        min={getLocalDateString()}
                        onChange={(event) => setSelectedDate(event.target.value)}
                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                    />
                </div>
            </div>

            {/* Feedback messages */}
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

            {/* Available appointment slots */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
                <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
                    Available Appointment Slots
                </h2>

                {selectedProvider && (
                    <p className="text-sm text-slate-500 mb-2">
                        Provider: {selectedProvider.name || selectedProvider.user?.name || `#${selectedProvider.id}`}
                    </p>
                )}

                {selectedService && (
                    <p className="text-sm text-slate-500 mb-4">
                        Selected service: {selectedService.name} ({selectedService.duration_minutes} minutes)
                    </p>
                )}

                {!servicesLoading && selectedProviderId && services.length === 0 && (
                    <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                        This provider has no services configured yet.
                    </p>
                )}

                {loading ? (
                    <p className="text-sm text-slate-400 py-4">
                        Loading available slots...
                    </p>
                ) : availableSlots.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4">
                        {slotsData.message || 'No available slots for this date.'}
                    </p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {availableSlots.map((slot) => {
                            const slotId = slot.id ?? slot.time_slot_id;
                            const slotTime = slot.start_time || slot.starts_at;

                            const unavailable =
                                slot.is_available === false ||
                                slot.status === 'booked' ||
                                slot.status === 'unavailable';

                            return (
                                <div
                                    key={slotId ?? `${slotTime}-${slot.end_time}`}
                                    className="border border-slate-200 rounded-xl p-4 space-y-3"
                                >
                                    <p className="text-sm font-semibold text-slate-700">
                                        {formatDate(slotTime)}
                                    </p>

                                    {slot.end_time && (
                                        <p className="text-xs text-slate-500">
                                            Ends: {formatDate(slot.end_time)}
                                        </p>
                                    )}

                                    <button
                                        type="button"
                                        disabled={
                                            unavailable ||
                                            slotId == null ||
                                            !selectedServiceId ||
                                            servicesLoading
                                        }
                                        onClick={() => bookAppointment(slotId)}
                                        className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg"
                                    >
                                        {unavailable ? 'Unavailable' : 'Book Appointment'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Booking notes */}
                <div className="mt-6">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                        Booking Notes
                    </label>

                    <textarea
                        value={bookingNote}
                        onChange={(event) => setBookingNote(event.target.value)}
                        rows={3}
                        placeholder="Add any relevant information for your appointment..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>
        </div>
    );
}
