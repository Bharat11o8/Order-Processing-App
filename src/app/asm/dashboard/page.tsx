export default function ASMDashboard() {
    return (
        <div className="min-h-screen bg-slate-50">
            {/* Navbar */}
            <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                        A
                    </div>
                    <span className="font-bold text-slate-800 text-lg">ASM Portal</span>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-600">Welcome, ASM User</span>
                    <a href="/login" className="text-sm text-red-600 hover:text-red-700 font-medium">
                        Logout
                    </a>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <header className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
                        <p className="text-slate-500 mt-1">Manage your zone's orders and dealers.</p>
                    </div>
                    <button className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2">
                        <span>+</span> Create New Order
                    </button>
                </header>

                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="text-slate-500 text-sm font-medium uppercase">Pending Orders</h3>
                        <p className="text-3xl font-bold text-slate-800 mt-2">0</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="text-slate-500 text-sm font-medium uppercase">Processed</h3>
                        <p className="text-3xl font-bold text-slate-800 mt-2">0</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="text-slate-500 text-sm font-medium uppercase">This Month</h3>
                        <p className="text-3xl font-bold text-slate-800 mt-2">₹0</p>
                    </div>
                </div>

                {/* Orders List Placeholder */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="font-semibold text-slate-800">Recent Orders</h2>
                        <button className="text-blue-600 text-sm font-medium hover:underline">View All</button>
                    </div>
                    <div className="p-12 text-center text-slate-400">
                        <p>No orders created yet.</p>
                        <p className="text-sm mt-2">Click "Create New Order" to start.</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
