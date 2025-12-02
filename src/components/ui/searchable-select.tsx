'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, X } from 'lucide-react';

interface Option {
    id: string;
    label: string;
    subLabel?: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Select...',
    disabled = false,
    className = '',
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Find selected option label
    const selectedOption = options.find((opt) => opt.id === value);

    // Filter options
    const filteredOptions = options.filter((opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
    );

    // Handle outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                // Reset search if no selection made or keep it? Better to reset to show selected label
                if (!isOpen) setSearch('');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Update search when value changes externally
    useEffect(() => {
        if (selectedOption) {
            setSearch(selectedOption.label);
        } else {
            setSearch('');
        }
    }, [value, selectedOption]);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <div className="relative">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setIsOpen(true);
                        if (e.target.value === '') {
                            onChange(''); // Clear selection if input cleared
                        }
                    }}
                    onFocus={() => {
                        setIsOpen(true);
                        // If we have a value, we might want to select the text so user can type over it easily
                        // But for now, just opening is fine.
                    }}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={`w-full px-3 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-800 placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-400 ${disabled ? 'cursor-not-allowed' : ''}`}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-slate-400 pointer-events-none">
                    <ChevronDown size={16} />
                </div>
            </div>

            {isOpen && !disabled && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option) => (
                            <button
                                key={option.id}
                                type="button"
                                onClick={() => {
                                    onChange(option.id);
                                    setSearch(option.label);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors flex flex-col ${option.id === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                                    }`}
                            >
                                <span>{option.label}</span>
                                {option.subLabel && (
                                    <span className="text-xs text-slate-400">{option.subLabel}</span>
                                )}
                            </button>
                        ))
                    ) : (
                        <div className="px-4 py-3 text-sm text-slate-400 text-center">No results found</div>
                    )}
                </div>
            )}
        </div>
    );
}
