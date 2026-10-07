import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MyAppointments from './pages/MyAppointments';
import StaffDashboard from './pages/StaffDashboard';

function App() {
    const [user, setUser] = useState(null);
    const [activeTab, setActiveTab] = useState('book');

    useEffect(() => {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
            setUser(JSON.parse(savedUser));
        }
    }, []);

    const handleLoginSuccess = (loggedInUser) => {
        setUser(loggedInUser);
        localStorage.setItem('user', JSON.stringify(loggedInUser));
    };

    const handleLogout = () => {
        localStorage.clear();
        setUser(null);
    };

    if (!user) {
        return <Login onLoginSuccess={handleLoginSuccess} />;
    }

    // Swapped strictly to match your database role key entry: 'staff'
    const isStaff = user.role && user.role.toLowerCase() === 'staff';

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
            {/* Header Block Navbar */}
            <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-8">
                        <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">B</div>
                            <span className="font-bold text-slate-800 tracking-tight">BookingPanel</span>
                        </div>
                        
                        {/* Dynamic Navigation Tabs based on Role context */}
                        {!isStaff ? (
                            <nav className="hidden md:flex space-x-1">
                                <button
                                    onClick={() => setActiveTab('book')}
                                    className={`px-3 py-2 text-sm font-semibold rounded-xl transition ${activeTab === 'book' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    Book Appointment
                                </button>
                                <button
                                    onClick={() => setActiveTab('list')}
                                    className={`px-3 py-2 text-sm font-semibold rounded-xl transition ${activeTab === 'list' ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    My Appointments
                                </button>
                            </nav>
                        ) : (
                            <nav className="hidden md:flex space-x-1">
                                <span className="px-3 py-2 text-sm font-semibold text-slate-800 bg-slate-100 rounded-xl border border-slate-200">
                                    🛡️ Staff Administrative Workspace
                                </span>
                            </nav>
                        )}
                    </div>
                    
                    <div className="flex items-center space-x-4">
                        <div className="text-right">
                            <span className="block text-sm font-semibold text-slate-700">{user.name}</span>
                            <span className="block text-xs text-blue-600 capitalize font-medium">
                                {isStaff ? 'Staff Account' : 'Client Account'}
                            </span>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="text-xs font-semibold px-3 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg transition text-slate-600"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* Container Body Rendering logic */}
            <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
                {isStaff ? (
                    <StaffDashboard />
                ) : activeTab === 'book' ? (
                    <Dashboard />
                ) : (
                    <MyAppointments />
                )}
            </main>
        </div>
    );
}

// Global window container reference blocks hot-reload render duplication crashes completely
const rootElement = document.getElementById('app');
if (rootElement) {
    if (!globalThis.reactRoot) {
        globalThis.reactRoot = createRoot(rootElement);
    }
    globalThis.reactRoot.render(<App />);
}
