import React, { useState } from 'react';
import { findByNik, NikEntry } from '../data/nikList';

type JabatanType = 'Area Supervisor' | 'Area Manager' | 'EDP Manager' | 'Office Manager' | 'DBM ADM / DBM OPR';

interface Props {
    onAuthenticated: (user: { nama: string; jabatan: JabatanType }) => void;
    onBack: () => void;
}

const JabatanSelector: React.FC<Props> = ({ onAuthenticated, onBack }) => {
    const [selectedJabatan, setSelectedJabatan] = useState<JabatanType | ''>('');
    const [showNikInput, setShowNikInput] = useState(false);
    const [nik, setNik] = useState('');
    const [error, setError] = useState('');

    const jabatanList: JabatanType[] = [
        'Area Supervisor',
        'Area Manager',
        'EDP Manager',
        'Office Manager',
        'DBM ADM / DBM OPR',
    ];

    const requiresNikAuth = (jabatan: JabatanType): boolean => {
        return jabatan === 'Area Supervisor' || jabatan === 'Area Manager';
    };

    const handleJabatanSelect = (jabatan: JabatanType) => {
        setSelectedJabatan(jabatan);
        setError('');

        if (requiresNikAuth(jabatan)) {
            setShowNikInput(true);
        } else {
            // No auth needed, proceed directly
            onAuthenticated({ nama: jabatan, jabatan });
        }
    };

    const handleNikSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const user = findByNik(nik.trim());

        if (!user) {
            setError('NIK tidak terdaftar');
            return;
        }

        if (user.jabatan !== selectedJabatan) {
            setError(`NIK ini terdaftar sebagai ${user.jabatan}, bukan ${selectedJabatan}`);
            return;
        }

        onAuthenticated({ nama: user.nama, jabatan: user.jabatan });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Back Button */}
                <button
                    onClick={onBack}
                    className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Kembali</span>
                </button>

                <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                    {/* Header */}
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">TTD Online</h2>
                        <p className="text-gray-500 text-sm mt-1">
                            {showNikInput ? 'Masukkan NIK untuk verifikasi' : 'Pilih jabatan Anda'}
                        </p>
                    </div>

                    {!showNikInput ? (
                        /* Jabatan Selection */
                        <div className="space-y-3">
                            {jabatanList.map((jabatan) => (
                                <button
                                    key={jabatan}
                                    onClick={() => handleJabatanSelect(jabatan)}
                                    className="w-full p-4 bg-gray-50 hover:bg-green-50 border border-gray-200 hover:border-green-300 rounded-xl text-left transition-all flex items-center justify-between group"
                                >
                                    <div>
                                        <span className="font-medium text-gray-800 group-hover:text-green-700">{jabatan}</span>
                                        {requiresNikAuth(jabatan) && (
                                            <span className="ml-2 text-xs text-gray-400">(Perlu NIK)</span>
                                        )}
                                    </div>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 group-hover:text-green-600 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </button>
                            ))}
                        </div>
                    ) : (
                        /* NIK Input Form */
                        <form onSubmit={handleNikSubmit} className="space-y-4">
                            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-800">
                                <strong>Jabatan:</strong> {selectedJabatan}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    NIK (Nomor Induk Karyawan)
                                </label>
                                <input
                                    type="text"
                                    value={nik}
                                    onChange={(e) => setNik(e.target.value)}
                                    placeholder="Masukkan NIK..."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                                    ⚠️ {error}
                                </div>
                            )}

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowNikInput(false);
                                        setNik('');
                                        setError('');
                                    }}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
                                >
                                    Verifikasi
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JabatanSelector;
