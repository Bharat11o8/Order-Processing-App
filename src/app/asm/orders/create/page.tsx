'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { createOrderSchema, type CreateOrderRequest } from '@/lib/validators/order';
import { Trash2, Plus, Loader2 } from 'lucide-react';

// Types for Catalog Data
type Dealer = { id: string; name: string; location: string; mobile: string | null; subDealers: { id: string; name: string }[] };
type OEM = { id: string; name: string };
type Vehicle = { id: string; name: string };
type VehicleType = { id: string; name: string };
type Design = { id: string; productCode: string; unitType: 'PCS' | 'SET'; seatOption: 'SINGLE' | 'DOUBLE' | 'BOTH'; colors: { id: string; name: string }[] };

export default function CreateOrderPage() {
    const router = useRouter();
    const [dealers, setDealers] = useState<Dealer[]>([]);
    const [oems, setOems] = useState<OEM[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateOrderRequest>({
        resolver: zodResolver(createOrderSchema),
        defaultValues: {
            items: [{ quantity: 1, unitType: 'PCS' }], // Initial item
            paymentType: 'ADVANCE',
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: 'items',
    });

    // Watchers for conditional logic
    const selectedDealerId = watch('dealerId');
    const paymentType = watch('paymentType');
    const items = watch('items');

    // Derived state
    const selectedDealer = dealers.find(d => d.id === selectedDealerId);
    const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [dealersRes, oemsRes] = await Promise.all([
                    fetch('/api/dealers'),
                    fetch('/api/catalog/oems')
                ]);
                if (dealersRes.ok) setDealers(await dealersRes.json());
                if (oemsRes.ok) setOems(await oemsRes.json());
            } catch (err) {
                console.error('Failed to load initial data', err);
            }
        };
        fetchData();
    }, []);

    // Auto-fill dealer mobile
    useEffect(() => {
        if (selectedDealer?.mobile) {
            setValue('dealerMobile', selectedDealer.mobile);
        }
    }, [selectedDealer, setValue]);

    const onSubmit = async (data: CreateOrderRequest) => {
        setLoading(true);
        setSubmitError('');
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || 'Failed to create order');
            }

            router.push('/asm/dashboard');
        } catch (err: any) {
            setSubmitError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <h1 className="text-2xl font-bold text-slate-800 mb-6">Create New Order</h1>

                {submitError && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6 border border-red-100">
                        {submitError}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    {/* Dealer Section */}
                    <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-slate-700 border-b pb-2">Dealer Details</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Select Dealer</label>
                                <select {...register('dealerId')} className="w-full p-2 border rounded-md">
                                    <option value="">-- Select Dealer --</option>
                                    {dealers.map(d => <option key={d.id} value={d.id}>{d.name} ({d.location})</option>)}
                                </select>
                                {errors.dealerId && <p className="text-red-500 text-xs mt-1">{errors.dealerId.message}</p>}
                            </div>

                            {selectedDealer && selectedDealer.subDealers.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Sub-Dealer (Optional)</label>
                                    <select {...register('subDealerId')} className="w-full p-2 border rounded-md">
                                        <option value="">-- None --</option>
                                        {selectedDealer.subDealers.map(sd => <option key={sd.id} value={sd.id}>{sd.name}</option>)}
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Dealer Mobile</label>
                                <input type="text" {...register('dealerMobile')} className="w-full p-2 border rounded-md" placeholder="10-digit mobile" />
                                {errors.dealerMobile && <p className="text-red-500 text-xs mt-1">{errors.dealerMobile.message}</p>}
                            </div>
                        </div>
                    </section>

                    {/* Items Section */}
                    <section className="space-y-4">
                        <div className="flex justify-between items-center border-b pb-2">
                            <h2 className="text-lg font-semibold text-slate-700">Order Items</h2>
                            <span className="text-sm font-medium bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                                Total Qty: {totalQuantity}
                            </span>
                        </div>

                        <div className="space-y-4">
                            {fields.map((field, index) => (
                                <OrderItemRow
                                    key={field.id}
                                    index={index}
                                    control={control}
                                    register={register}
                                    remove={remove}
                                    oems={oems}
                                    setValue={setValue}
                                    errors={errors}
                                />
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={() => append({ quantity: 1, unitType: 'PCS', designId: '', productCode: '' })}
                            className="flex items-center gap-2 text-blue-600 font-medium hover:text-blue-700 mt-2"
                        >
                            <Plus size={18} /> Add Item
                        </button>
                        {errors.items && <p className="text-red-500 text-xs mt-1">{errors.items.message}</p>}
                    </section>

                    {/* Payment Section */}
                    <section className="space-y-4">
                        <h2 className="text-lg font-semibold text-slate-700 border-b pb-2">Payment & Remarks</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Type</label>
                                <select {...register('paymentType')} className="w-full p-2 border rounded-md">
                                    <option value="ADVANCE">Advance</option>
                                    <option value="CREDIT">Credit</option>
                                </select>
                            </div>

                            {paymentType === 'CREDIT' && (
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Credit Days</label>
                                    <input
                                        type="number"
                                        {...register('creditDays', { valueAsNumber: true })}
                                        className="w-full p-2 border rounded-md"
                                    />
                                    {errors.creditDays && <p className="text-red-500 text-xs mt-1">{errors.creditDays.message}</p>}
                                </div>
                            )}

                            <div className="md:col-span-3">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Remarks (Optional)</label>
                                <textarea {...register('remarks')} className="w-full p-2 border rounded-md" rows={2} />
                            </div>
                        </div>
                    </section>

                    {/* Submit */}
                    <div className="pt-4 border-t flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-slate-900 text-white px-8 py-3 rounded-lg font-semibold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin" size={18} />}
                            {loading ? 'Submitting...' : 'Submit Order'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Sub-component for Item Row (Inline for simplicity as requested, but separated logic)
function OrderItemRow({ index, control, register, remove, oems, setValue, errors }: any) {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [types, setTypes] = useState<VehicleType[]>([]);
    const [designs, setDesigns] = useState<Design[]>([]);

    // Local state for selections to drive fetches
    const [selectedOem, setSelectedOem] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [selectedType, setSelectedType] = useState('');

    // Fetch Vehicles
    useEffect(() => {
        if (selectedOem) {
            fetch(`/api/catalog/vehicles?oemId=${selectedOem}`).then(r => r.json()).then(setVehicles);
        } else {
            setVehicles([]);
        }
    }, [selectedOem]);

    // Fetch Types
    useEffect(() => {
        if (selectedVehicle) {
            fetch(`/api/catalog/vehicle-types?vehicleId=${selectedVehicle}`).then(r => r.json()).then(setTypes);
        } else {
            setTypes([]);
        }
    }, [selectedVehicle]);

    // Fetch Designs
    useEffect(() => {
        if (selectedType) {
            fetch(`/api/catalog/designs?vehicleTypeId=${selectedType}`).then(r => r.json()).then(setDesigns);
        } else {
            setDesigns([]);
        }
    }, [selectedType]);

    return (
        <div className="p-4 border rounded-lg bg-slate-50 relative grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
            {/* OEM */}
            <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">OEM</label>
                <select
                    className="w-full p-2 border rounded text-sm"
                    value={selectedOem}
                    onChange={(e) => { setSelectedOem(e.target.value); setSelectedVehicle(''); setSelectedType(''); }}
                >
                    <option value="">Select OEM</option>
                    {oems.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
            </div>

            {/* Vehicle */}
            <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Vehicle</label>
                <select
                    className="w-full p-2 border rounded text-sm"
                    value={selectedVehicle}
                    disabled={!selectedOem}
                    onChange={(e) => { setSelectedVehicle(e.target.value); setSelectedType(''); }}
                >
                    <option value="">Select Vehicle</option>
                    {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
            </div>

            {/* Type */}
            <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
                <select
                    className="w-full p-2 border rounded text-sm"
                    value={selectedType}
                    disabled={!selectedVehicle}
                    onChange={(e) => setSelectedType(e.target.value)}
                >
                    <option value="">Select Type</option>
                    {types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
            </div>

            {/* Design (Main Product) */}
            <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Design / PNC</label>
                <Controller
                    control={control}
                    name={`items.${index}.designId`}
                    render={({ field }) => (
                        <select
                            {...field}
                            className="w-full p-2 border rounded text-sm"
                            disabled={!selectedType}
                            onChange={(e) => {
                                field.onChange(e);
                                const design = designs.find(d => d.id === e.target.value);
                                if (design) {
                                    setValue(`items.${index}.productCode`, design.productCode);
                                    setValue(`items.${index}.unitType`, design.unitType);
                                    // Auto-select color if only 1 or Generic
                                    if (design.colors.length === 1) {
                                        setValue(`items.${index}.colorId`, design.colors[0].id);
                                    }
                                }
                            }}
                        >
                            <option value="">Select Design</option>
                            {designs.map((d: any) => (
                                <option key={d.id} value={d.id}>{d.productCode} ({d.unitType})</option>
                            ))}
                        </select>
                    )}
                />
                {errors.items?.[index]?.designId && <p className="text-red-500 text-[10px]">{errors.items[index].designId.message}</p>}
            </div>

            {/* Color */}
            <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Color</label>
                <Controller
                    control={control}
                    name={`items.${index}.designId`} // Watch design to update colors
                    render={({ field }) => {
                        const currentDesignId = field.value;
                        const design = designs.find(d => d.id === currentDesignId);
                        const colors = design?.colors || [];

                        return (
                            <select {...register(`items.${index}.colorId`)} className="w-full p-2 border rounded text-sm" disabled={!currentDesignId || colors.length === 0}>
                                <option value="">Select Color</option>
                                {colors.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        )
                    }}
                />
            </div>

            {/* Quantity */}
            <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Qty</label>
                <input
                    type="number"
                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                    className="w-full p-2 border rounded text-sm"
                    min="1"
                />
                {errors.items?.[index]?.quantity && <p className="text-red-500 text-[10px]">{errors.items[index].quantity.message}</p>}
            </div>

            {/* Remove Button */}
            <button type="button" onClick={() => remove(index)} className="p-2 text-red-500 hover:bg-red-50 rounded mb-0.5">
                <Trash2 size={18} />
            </button>
        </div>
    );
}
