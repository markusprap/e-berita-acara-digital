import React from 'react';

interface Props {
    onSelectMenu: (menu: 'buat-ba' | 'ttd-online') => void;
}

const LandingPage: React.FC<Props> = ({ onSelectMenu }) => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl">
                {/* Header */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl shadow-lg mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">E-Berita Acara</h1>
                    <p className="text-gray-500">Sistem Digital Berita Acara Variance</p>
                </div>

                {/* Menu Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Menu 1: Buat Berita Acara */}
                    <button
                        onClick={() => onSelectMenu('buat-ba')}
                        className="group bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 text-left border border-gray-100 hover:border-blue-200 hover:-translate-y-1"
                    >
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-14 h-14 bg-blue-100 group-hover:bg-blue-600 rounded-xl flex items-center justify-center transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-blue-600 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">
                                    Buat Berita Acara
                                </h2>
                                <p className="text-gray-500 text-sm">
                                    Buat dokumen BA baru untuk pengajuan potong sales variance
                                </p>
                                <div className="mt-4 flex items-center text-blue-600 text-sm font-medium">
                                    <span>Mulai</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </button>

                    {/* Menu 2: TTD Online - DISABLED */}
                    <div
                        className="group bg-white rounded-2xl shadow-lg p-6 text-left border border-gray-200 opacity-60 cursor-not-allowed relative"
                    >
                        {/* Coming Soon Badge */}
                        <div className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                            Coming Soon
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="flex-shrink-0 w-14 h-14 bg-gray-100 rounded-xl flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-gray-400 mb-1">
                                    TTD Online
                                </h2>
                                <p className="text-gray-400 text-sm">
                                    Tanda tangani BA yang sudah diajukan (khusus Atasan)
                                </p>
                                <div className="mt-4 flex items-center text-gray-400 text-sm font-medium">
                                    <span>Segera Hadir</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-10 text-center text-gray-400 text-xs">
                    <a href="https://instagram.com/markusprap" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">
                        Made with ☕ by Programmer Gen Z
                    </a>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
