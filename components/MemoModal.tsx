import React from 'react';

interface Props {
    onClose: () => void;
}

const MemoModal: React.FC<Props> = ({ onClose }) => {
    return (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="bg-blue-600 px-6 py-4 flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white tracking-tight">MEKANISME POTONG SALES VARIANCE</h2>
                        <p className="text-blue-100 text-xs">Ref: Memo Internal 433/FAD-HO/XII/2025</p>
                    </div>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto text-gray-700 space-y-4">
                    <ol className="list-decimal list-outside pl-5 space-y-4 text-sm md:text-base">
                        <li>
                            <span className="font-bold text-gray-900 block mb-1">Syarat Dokumen Lengkap</span>
                            Wajib mengajukan BA ke kantor cabang dilengkapi <strong>Tutup Harian/Shift</strong>.
                        </li>
                        <li>
                            <span className="font-bold text-gray-900 block mb-1">Approval BA (PDF)</span>
                            <ul className="list-disc list-outside pl-4 mt-1 space-y-1 text-gray-600">
                                <li><strong>Tim Toko, Area SPV, dan Area MGR</strong></li>
                                <li>Jika Variance &lt; 300.000: <span className="text-blue-600 font-medium">Approval Ttd AM</span></li>
                                <li>Jika Variance &gt; 300.000: <span className="text-blue-600 font-medium">Approval Ttd DBM OPR / DBM ADM</span></li>
                            </ul>
                        </li>
                        <li>
                            <span className="font-bold text-gray-900 block mb-1">Pengiriman BA</span>
                            AS mengirimkan file BA (PDF) ke <strong>Finance Cabang</strong>.
                        </li>
                        <li>
                            <span className="font-bold text-gray-900 block mb-1">Approval Pemeriksa BA</span>
                            Dilakukan oleh <strong>OM (Office Manager)</strong>.
                        </li>
                        <li>
                            <span className="font-bold text-gray-900 block mb-1">Konfirmasi Finance</span>
                            Finance akan mengirimkan email untuk variance yang sudah di-ACC.
                        </li>
                        <li>
                            <span className="font-bold text-gray-900 block mb-1">Link Potong Sales</span>
                            Lakukan pelaporan di link: <br />
                            <a href="https://bit.ly/SETORAN_SALES_JOMBANG" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all font-medium">
                                bit.ly/SETORAN_SALES_JOMBANG
                            </a>
                            <p className="mt-1 text-xs text-gray-500 italic">
                                *Wajib melampirkan screenshot email variance yang sudah di-ACC.
                            </p>
                        </li>
                    </ol>

                    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-r-lg mt-4 text-sm">
                        <span className="font-bold text-yellow-800 block">📝 Note:</span>
                        Apabila <strong>H+5</strong> belum mendapatkan email dari Finance, harap segera konfirmasi ke <strong>AS atau Finance</strong>.
                    </div>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex justify-end border-t border-gray-200">
                    <button
                        onClick={onClose}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg active:scale-95 transition-all w-full md:w-auto flex items-center justify-center gap-2"
                    >
                        <span>SAYA MENGERTI DAN AKAN PATUH</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MemoModal;
