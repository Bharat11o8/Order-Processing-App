'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Calendar, MapPin, Phone, Edit, Send, CheckCircle, AlertCircle } from 'lucide-react';

interface OrderItem {
    id: string;
    design: { designNumber: string; imageUrl: string };
    color: string;
    quantity: number;
    unitType: string;
}

interface Order {
    id: string;
    orderNumber: string;
    createdAt: string;
    status: string;
    totalQuantity: number;
    dealer: {
        name: string;
        location: string;
        mobile: string;
    };
    items: OrderItem[];
}

export default function OrderDetail() {
    const router = useRouter();
    const params = useParams();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const fetchOrder = useCallback(async () => {
        try {
            const res = await fetch(`/api/orders/${params.id}`);
            if (!res.ok) throw new Error('Failed to fetch order');
            const order = await res.json();
            setOrder(order);
        } catch (err) {
            setError('Failed to load order details');
        } finally {
            setLoading(false);
        }
    }, [params.id]);

    useEffect(() => {
        if (params.id) fetchOrder();
    }, [fetchOrder, params.id]);

    const handleSubmitOrder = async () => {
        if (!confirm('Are you sure you want to submit this order? This action cannot be undone.')) return;

        setSubmitting(true);
        try {
            const res = await fetch(`/api/orders/${params.id}/submit`, {
                method: 'POST',
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to submit order');
            }

            // Refresh order data
            fetchOrder();
            alert('Order submitted successfully!');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'DRAFT': return 'bg-gray-100 text-gray-800';
            case 'SUBMITTED': return 'bg-blue-100 text-blue-800';
            case 'VERIFIED': return 'bg-purple-100 text-purple-800';
            case 'PROCESSING': return 'bg-yellow-100 text-yellow-800';
            case 'DISPATCHED': return 'bg-orange-100 text-orange-800';
            case 'COMPLETED': return 'bg-green-100 text-green-800';
            case 'CANCELLED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50">Loading...</div>;
    if (error || !order) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-red-600">{error || 'Order not found'}</div>;

    return (
        <div className="min-h-screen bg-slate-50 pb-12">
            {/* Navbar */}
            <nav className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto flex items-center gap-4">
                    <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-800 transition-colors">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="font-bold text-slate-800 text-lg">Order Details</h1>
                </div>
            </nav>

            <main className="max-w-5xl mx-auto px-6 py-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-bold text-slate-800">{order.orderNumber}</h2>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(order.status)}`}>
                                {order.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 text-slate-500 text-sm">
                            <span className="flex items-center gap-1">
                                <Calendar size={14} /> {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>

                    {/* Actions */}
                    {order.status === 'DRAFT' && (
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => router.push(`/asm/orders/${order.id}/edit`)}
                                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
                            >
                                <Edit size={16} /> Edit Order
                            </button>
                            <button
                                onClick={handleSubmitOrder}
                                disabled={submitting}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {submitting ? 'Submitting...' : <><Send size={16} /> Submit Order</>}
                            </button>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Left Column: Order Items */}
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100">
                                <h3 className="font-semibold text-slate-800">Order Items</h3>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {order.items.map((item) => (
                                    <div key={item.id} className="p-4 flex items-center gap-4">
                                        <div className="w-16 h-16 bg-slate-100 rounded-lg flex-shrink-0 overflow-hidden border border-slate-200">
                                            {item.design.imageUrl ? (
                                                <img src={item.design.imageUrl} alt={item.design.designNumber} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">No Img</div>
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-medium text-slate-800">{item.design.designNumber}</h4>
                                            <p className="text-sm text-slate-500">Color: {item.color}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-slate-800 text-lg">{item.quantity}</p>
                                            <p className="text-xs text-slate-500 uppercase">{item.unitType}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                                <span className="font-medium text-slate-600">Total Quantity</span>
                                <span className="text-xl font-bold text-slate-800">{order.totalQuantity}</span>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Dealer Info */}
                    <div className="space-y-6">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
                            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                                <MapPin size={18} className="text-slate-400" /> Dealer Information
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-medium">Dealer Name</p>
                                    <p className="font-medium text-slate-800">{order.dealer.name}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-medium">Location</p>
                                    <p className="text-slate-600">{order.dealer.location}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase font-medium">Contact</p>
                                    <div className="flex items-center gap-2 text-slate-600 mt-1">
                                        <Phone size={14} />
                                        <a href={`tel:${order.dealer.mobile}`} className="hover:text-blue-600 transition-colors">
                                            {order.dealer.mobile}
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {order.status === 'DRAFT' && (
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                                <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                                <div>
                                    <h4 className="font-medium text-blue-800 text-sm">Draft Order</h4>
                                    <p className="text-blue-600 text-xs mt-1">
                                        This order is currently a draft. Review the details and click "Submit Order" to send it for processing.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
