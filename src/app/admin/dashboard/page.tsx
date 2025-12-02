export default function AdminDashboard() {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Navbar */}
            <nav className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold">
                        S
                    </div>
                    <span className="font-bold text-white text-lg">System Admin</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-300">Administrator</span>
                    <a href="/login" className="text-sm text-red-400 hover:text-red-300 font-medium">
                        Logout
                    </a>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <header className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-800">Admin Overview</h1>
                    <p className="text-slate-500 mt-1">Monitor all orders across all zones.</p>
                </header>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="text-slate-500 text-sm font-medium uppercase">Total Orders</h3>
                        <p className="text-3xl font-bold text-slate-800 mt-2">0</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="text-slate-500 text-sm font-medium uppercase">Pending Verify</h3>
                        <p className="text-3xl font-bold text-amber-600 mt-2">0</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="text-slate-500 text-sm font-medium uppercase">Ready to Dispatch</h3>
                        <p className="text-3xl font-bold text-blue-600 mt-2">0</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="text-slate-500 text-sm font-medium uppercase">Completed</h3>
                        <p className="text-3xl font-bold text-green-600 mt-2">0</p>
                    </div>
                </div>

                {/* Global Orders List Placeholder */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100">
                        <h2 className="font-semibold text-slate-800">Global Order Feed</h2>
                    </div>
                    <div className="p-12 text-center text-slate-400">
                        <p>No orders found in the system.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
