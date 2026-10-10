import React, { useState, useEffect } from 'react';

export default function Dashboard() {
    const [sector, setSector] = useState('clinic'); // 'clinic' or 'salon'
    const [specialty, setSpecialty] = useState('GP');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [slots, setSlots] = useState([]);
    const [loading, setLoading] = useState(false);
    const [bookingNote, setBookingNote] = useState('');
    const [message, setMessage] = useState({ type: '', text: '' });

    // Specialist arrays corresponding to sector vectors
    const specialtiesMap = {
        clinic: ['GP', 'Neurologist', 'Dermatologist', 'Pediatrician', 'Cardiologist'],
        salon: ['Barber', 'Hairstylist', 'Nail Technician', 'Esthetician']
    };

    // Reset default specialty option whenever the high level sector switches
    useEffect(() => {
        setSpecialty(specialtiesMap[sector][0]);
    }, [sector]);

    useEffect(() => {
        fetchMarketplaceSlots();
    }, [sector, specialty, selectedDate]);

    const fetchMarketplaceSlots = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/marketplace/explore?date=${selectedDate}&sector=${sector}&specialty=${specialty}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/json'
                }
            });
            const data = await response.json();
            setSlots(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Marketplace sync exception:', err);
        } finally {
            setLoading(false);
        }
    };

    const bookAppointment = async (slotId) => {
        setMessage({ type: '', text: '' });
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    time_slot_id: slotId,
                    service_id: 1, // Default associated relation link mapped dynamically
                    notes: bookingNote
                })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Booking validation error.');

            setMessage({ type: 'success', text: 'Appointment securely booked! 🎉 Check My Appointments tab to view.' });
            setBookingNote('');
            fetchMarketplaceSlots(); 
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6 font-sans">
            {/* Exploration Filter Section Control Desk */}
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">1. Select Sector Category</label>
                    <div className="flex bg-slate-100 p-1 rounded-xl">
                        <button type="button" onClick={() => setSector('clinic')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${sector === 'clinic' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>🏥 Clinics</button>
                        <button type="button" onClick={() => setSector('salon')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${sector === 'salon' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>💇 Salons</button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">2. Choose Specialist Role</label>
                    <select value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                        {specialtiesMap[sector].map((spec) => (
                            <option key={spec} value={spec}>{spec}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">3. Selection Target Date</label>
                    <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>
            </div>

            {message.text && (
                <div className={`p-4 rounded-xl text-sm font-medium border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-600'}`}>{message.text}</div>
            )}

            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6">
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Appointment Notes (Optional)</label>
                    <input type="text" value={bookingNote} onChange={(e) => setBookingNote(e.target.value)} placeholder="Provide any custom context details or requirements for the provider..." className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                </div>

                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Recommended Open Availability Windows</h3>
                
                {loading ? (
                    <p className="text-sm text-slate-400 py-4 animate-pulse">Computing Haversine distance vectors...</p>
                ) : slots.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-sm text-slate-500">No scheduled provider openings match these criteria matrices currently.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {slots.map((slot) => (
                            <div key={slot.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-blue-500 transition shadow-sm">
                                <div>
                                    <span className="block text-sm font-bold text-slate-800">{slot.provider_name}</span>
                                    <span className="inline-block text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 mb-2 mt-0.5">📍 {slot.distance_km} km away</span>
                                    <span className="block text-xs text-slate-500 font-medium">Time: {new Date(slot.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <button onClick={() => bookAppointment(slot.id)} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow transition">Book Now</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
