import React, { useState } from 'react';

export default function Register({ onRegisterSuccess, onBackToLogin }) {
    const [role, setRole] = useState('client'); // 'client' or 'staff'
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        phone_number: '',
        address: '',
        age: '',
        business_type: 'clinic'
    });
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });
        setLoading(true);

        const payload = {
            name: formData.name,
            email: formData.email,
            password: formData.password,
            phone_number: formData.phone_number,
            address: formData.address,
            role: role,
            age: role === 'client' ? formData.age : null,
            business_type: role === 'staff' ? formData.business_type : 'none',
            status: role === 'staff' ? 'pending_review' : 'approved' 
        };

        try {
            // Uses relative routing paths to seamlessly connect frontend and backend ports
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration verification problem encountered.');
            }

            if (role === 'staff') {
                setMessage({ 
                    type: 'success', 
                    text: 'Account created successfully! 🛡️ Your registration is UNDER CONSIDERATION pending site inspection and final review approval.' 
                });
            } else {
                setMessage({ type: 'success', text: 'Registration successful! Redirecting...' });
                setTimeout(() => {
                    onRegisterSuccess(data.user, data.token);
                }, 1500);
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 font-sans">
            <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">B</div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Create your Account</h2>
                    <p className="text-sm text-slate-500 mt-1">Join the BookingPanel scheduler platform</p>
                </div>

                {/* Role Switch Toggles */}
                <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                    <button
                        type="button"
                        onClick={() => { setRole('client'); setMessage({ type: '', text: '' }); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${role === 'client' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        👤 Individual Client
                    </button>
                    <button
                        type="button"
                        onClick={() => { setRole('staff'); setMessage({ type: '', text: '' }); }}
                        className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${role === 'staff' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        🏢 Business Facility
                    </button>
                </div>

                {message.text && (
                    <div className={`mb-6 p-4 rounded-xl text-xs font-medium border ${
                        message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-600'
                    }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                            {role === 'client' ? 'Full Name' : 'Facility/Business Name'}
                        </label>
                        <input type="text" name="name" required value={formData.name} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Email Address</label>
                            <input type="email" name="email" required value={formData.email} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Password</label>
                            <input type="password" name="password" required value={formData.password} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Phone Number</label>
                            <input type="text" name="phone_number" required value={formData.phone_number} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" placeholder="e.g., 0803XXXXXXX" />
                        </div>
                        {role === 'client' ? (
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Age</label>
                                <input type="number" name="age" required value={formData.age} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" min="1" />
                            </div>
                        ) : (
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Sector Category</label>
                                <select name="business_type" value={formData.business_type} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition text-slate-700 font-medium">
                                    <option value="clinic">🏥 Health & Medical Clinic</option>
                                    <option value="salon">💇 Grooming & Beauty Salon</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Physical Contact Address</label>
                        <textarea name="address" required rows="2" value={formData.address} onChange={handleChange} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition resize-none" placeholder="Provide clear street address details..." />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition disabled:opacity-50 text-sm"
                    >
                        {loading ? 'Processing System Enrolment...' : role === 'staff' ? 'Submit Registration Application' : 'Complete Client Enrolment'}
                    </button>
                </form>

                <div className="border-t border-slate-100 mt-6 pt-4 text-center">
                    <button onClick={onBackToLogin} className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition">
                         Already possess an account? Sign In here
                    </button>
                </div>
            </div>
        </div>
    );
}
