'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { createOrderSchema, type CreateOrderRequest } from '@/lib/validators/order';
import { Trash2, Plus, Loader2, ShoppingCart, User, CreditCard } from 'lucide-react';
import { SearchableSelect } from '@/components/ui/searchable-select';

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

    // Watchers
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

    async function onSubmit(data: CreateOrderRequest) {
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
    }

    // Transform options for SearchableSelect
    const dealerOptions = dealers.map(d => ({ id: d.id, label: d.name, subLabel: d.location }));

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 font-sans">
            <div className="max-w-6xl mx-auto">
                <header className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create New Order</h1>
                    <p className="text-slate-500 mt-1">Fill in the details below to generate a new order.</p>
                </header>

                {submitError && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-xl mb-8 border border-red-200 shadow-sm flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                        {submitError}
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    {/* Dealer Section */}
                    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-600" />
                            <h2 className="text-lg font-bold text-slate-800">Dealer Details</h2>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select Dealer</label>
                                <Controller
                                    control={control}
                                    name="dealerId"
                                    render={({ field }) => (
                                        <SearchableSelect
                                            options={dealerOptions}
                                            value={field.value}
                                            onChange={(val) => {
                                                field.onChange(val);
                                                setValue('subDealerId', '');
                                            }}
                                            placeholder="Search Dealer..."
                                        />
                                    )}
                                />
                                {errors.dealerId && <p className="text-red-600 text-xs mt-1 font-medium">{errors.dealerId.message}</p>}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Location</label>
                                <input
                                    type="text"
                                    value={selectedDealer?.location || ''}
                                    readOnly
                                    className="w-full px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed font-medium"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Dealer Mobile</label>
                                <input
                                    type="text"
                                    {...register('dealerMobile')}
                                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-800 placeholder:text-slate-400"
                                    placeholder="10-digit mobile"
                                    maxLength={10}
                                />
                                {errors.dealerMobile && <p className="text-red-600 text-xs mt-1 font-medium">{errors.dealerMobile.message}</p>}
                            </div>

                            {selectedDealer && selectedDealer.subDealers.length > 0 && (
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Sub-Dealer</label>
                                    <Controller
                                        control={control}
                                        name="subDealerId"
                                        render={({ field }) => (
                                            <SearchableSelect
                                                options={selectedDealer.subDealers.map(sd => ({ id: sd.id, label: sd.name }))}
                                                value={field.value || ''}
                                                onChange={field.onChange}
                                                placeholder="Search Sub-Dealer..."
                                            />
                                        )}
                                    />
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Items Section */}
                    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-blue-600" />
                                <h2 className="text-lg font-bold text-slate-800">Order Items</h2>
                            </div>
                            <span className="text-sm font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full border border-blue-200">
                                Total Qty: {totalQuantity}
                            </span>
                        </div>

                        <div className="p-6 space-y-6">
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
                                    watch={watch}
                                />
                            ))}

                            <button
                                type="button"
                                onClick={() => append({ quantity: 1, unitType: 'PCS', designId: '', productCode: '' })}
                                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 font-semibold hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={20} /> Add Another Item
                            </button>
                            {errors.items && <p className="text-red-600 text-sm font-medium text-center">{errors.items.message}</p>}
                        </div>
                    </section>

                    {/* Payment Section */}
                    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                            <h2 className="text-lg font-bold text-slate-800">Payment & Remarks</h2>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Payment Type</label>
                                <select {...register('paymentType')} className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-800">
                                    <option value="ADVANCE">Advance</option>
                                    <option value="CREDIT">Credit</option>
                                </select>
                            </div>

                            {paymentType === 'CREDIT' && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Credit Days</label>
                                    <input
                                        type="number"
                                        {...register('creditDays', { valueAsNumber: true })}
                                        className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-800"
                                        placeholder="e.g. 30"
                                    />
                                    {errors.creditDays && <p className="text-red-600 text-xs mt-1 font-medium">{errors.creditDays.message}</p>}
                                </div>
                            )}

                            <div className="md:col-span-3">
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Remarks (Optional)</label>
                                <textarea
                                    {...register('remarks')}
                                    className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-800 placeholder:text-slate-400"
                                    rows={2}
                                    placeholder="Any additional notes..."
                                />
                            </div>
                        </div>
                    </section>

                    {/* Submit */}
                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-slate-900 text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:bg-slate-800 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {loading && <Loader2 className="animate-spin" size={20} />}
                            {loading ? 'Processing Order...' : 'Submit Order'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Sub-component for Item Row
function OrderItemRow({ index, control, register, remove, oems, setValue, errors, watch }: any) {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [types, setTypes] = useState<VehicleType[]>([]);
    const [designs, setDesigns] = useState<Design[]>([]);

    // Local state
    const [selectedOem, setSelectedOem] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [selectedType, setSelectedType] = useState('');

    // Watched fields
    const itemDesignId = watch(`items.${index}.designId`);
    const currentDesign = designs.find(d => d.id === itemDesignId);

    // Fetch Logic
    useEffect(() => {
        if (selectedOem) {
            fetch(`/api/catalog/vehicles?oemId=${selectedOem}`).then(r => r.json()).then(setVehicles);
        } else { setVehicles([]); }
    }, [selectedOem]);

    useEffect(() => {
        if (selectedVehicle) {
            fetch(`/api/catalog/vehicle-types?vehicleId=${selectedVehicle}`).then(r => r.json()).then(setTypes);
        } else { setTypes([]); }
    }, [selectedVehicle]);

    useEffect(() => {
        if (selectedType) {
            fetch(`/api/catalog/designs?vehicleTypeId=${selectedType}`).then(r => r.json()).then(setDesigns);
        } else { setDesigns([]); }
    }, [selectedType]);

    return (
        <div className="p-5 border border-slate-200 rounded-xl bg-slate-50/30 relative grid grid-cols-1 md:grid-cols-12 gap-5 items-start hover:border-blue-200 transition-colors">
            {/* OEM */}
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">OEM</label>
                <SearchableSelect
                    options={oems.map((o: any) => ({ id: o.id, label: o.name }))}
                    value={selectedOem}
                    onChange={(val) => { setSelectedOem(val); setSelectedVehicle(''); setSelectedType(''); }}
                    placeholder="Select OEM"
                />
            </div>

            {/* Vehicle */}
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Vehicle</label>
                <SearchableSelect
                    options={vehicles.map((v: any) => ({ id: v.id, label: v.name }))}
                    value={selectedVehicle}
                    onChange={(val) => { setSelectedVehicle(val); setSelectedType(''); }}
                    placeholder="Select Vehicle"
                    disabled={!selectedOem}
                />
            </div>

            {/* Type */}
            <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Type</label>
                <SearchableSelect
                    options={types.map((t: any) => ({ id: t.id, label: t.name }))}
                    value={selectedType}
                    onChange={(val) => setSelectedType(val)}
                    placeholder="Select Type"
                    disabled={!selectedVehicle}
                />
            </div>

            {/* Design */}
            <div className="md:col-span-3">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Design</label>
                <Controller
                    control={control}
                    name={`items.${index}.designId`}
                    render={({ field }) => (
                        <SearchableSelect
                            options={designs.map((d: any) => ({ id: d.id, label: d.productCode }))}
                            value={field.value}
                            onChange={(val) => {
                                field.onChange(val);
                                const design = designs.find(d => d.id === val);
                                if (design) {
                                    setValue(`items.${index}.productCode`, design.productCode);
                                    setValue(`items.${index}.unitType`, design.unitType);

                                    // Auto-select color
                                    const genericColor = design.colors.find(c => c.name.toLowerCase() === 'generic');
                                    if (design.colors.length === 1) {
                                        setValue(`items.${index}.colorId`, design.colors[0].id);
                                    } else if (genericColor) {
                                        setValue(`items.${index}.colorId`, genericColor.id);
                                    } else {
                                        setValue(`items.${index}.colorId`, '');
                                    }

                                    // Auto-select Seat Type
                                    if (design.seatOption === 'SINGLE') setValue(`items.${index}.seatType`, 'SINGLE');
                                    else if (design.seatOption === 'DOUBLE') setValue(`items.${index}.seatType`, 'DOUBLE');
                                    else setValue(`items.${index}.seatType`, '');
                                }
                            }}
                            placeholder="Select Design"
                            disabled={!selectedType}
                        />
                    )}
                />
                {errors.items?.[index]?.designId && <p className="text-red-600 text-[10px] mt-1 font-medium">{errors.items[index].designId.message}</p>}
                {currentDesign && <span className="text-[10px] text-blue-600 font-medium mt-1 block">Code: {currentDesign.productCode}</span>}
            </div>

            {/* Seat Type */}
            <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Seat</label>
                <select
                    {...register(`items.${index}.seatType`)}
                    className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                    disabled={!currentDesign || currentDesign.seatOption !== 'BOTH'}
                >
                    <option value="">-</option>
                    <option value="SINGLE">Sgl</option>
                    <option value="DOUBLE">Dbl</option>
                </select>
                {errors.items?.[index]?.seatType && <p className="text-red-600 text-[10px] mt-1 font-medium">{errors.items[index].seatType.message}</p>}
            </div>

            {/* Color */}
            <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Color</label>
                {currentDesign && currentDesign.colors.length > 1 && !currentDesign.colors.some(c => c.name.toLowerCase() === 'generic') ? (
                    <select {...register(`items.${index}.colorId`)} className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800">
                        <option value="">-</option>
                        {currentDesign.colors.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                ) : (
                    <div className="h-[38px] w-full bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs">-</div>
                )}
            </div>

            {/* Quantity */}
            <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Qty</label>
                <div className="relative">
                    <input
                        type="number"
                        {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                        className="w-full px-2.5 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-slate-800"
                        min="1"
                    />
                    <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-medium">{currentDesign?.unitType || ''}</span>
                </div>
                {errors.items?.[index]?.quantity && <p className="text-red-600 text-[10px] mt-1 font-medium">{errors.items[index].quantity.message}</p>}
            </div>

            {/* Remove */}
            <div className="md:col-span-12 absolute -top-3 -right-3">
                <button type="button" onClick={() => remove(index)} className="p-1.5 bg-white text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full shadow-sm border border-slate-200 transition-all">
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
}
