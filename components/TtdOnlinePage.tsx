import React, { useState, useRef, useCallback } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { PDFDocument, rgb } from 'pdf-lib';

type JabatanType = 'Area Supervisor' | 'Area Manager' | 'EDP Manager' | 'Office Manager' | 'DBM ADM / BM';

interface Props {
    user: { nama: string; jabatan: JabatanType };
    onBack: () => void;
}

// Signature position mapping (x, y from bottom-left of page)
// A4 PDF size: 595 x 842 points
// Grid layout: 3 columns x 2 rows
// Row 1 (y ~170): Tim Toko | Area Supervisor | Area Manager
// Row 2 (y ~80): DBM ADM/BM | EDP Manager | Office Manager
const signaturePositions: Record<JabatanType, { x: number; y: number; width: number; height: number }> = {
    'Area Supervisor': { x: 235, y: 165, width: 120, height: 60 },
    'Area Manager': { x: 410, y: 165, width: 120, height: 60 },
    'DBM ADM / BM': { x: 60, y: 75, width: 120, height: 60 },
    'EDP Manager': { x: 235, y: 75, width: 120, height: 60 },
    'Office Manager': { x: 410, y: 75, width: 120, height: 60 },
};

const TtdOnlinePage: React.FC<Props> = ({ user, onBack }) => {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
    const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const signatureRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
            setPdfPreviewUrl(URL.createObjectURL(file));
            setSignedPdfUrl(null);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
            setPdfPreviewUrl(URL.createObjectURL(file));
            setSignedPdfUrl(null);
        }
    }, []);

    const clearSignature = () => {
        signatureRef.current?.clear();
    };

    const processSignature = async () => {
        if (!signatureRef.current || signatureRef.current.isEmpty() || !pdfFile) {
            return;
        }

        setIsProcessing(true);

        try {
            // Get signature as PNG data URL
            const signatureDataUrl = signatureRef.current.toDataURL('image/png');

            // Load the PDF
            const pdfBytes = await pdfFile.arrayBuffer();
            const pdfDoc = await PDFDocument.load(pdfBytes);

            // Get the FIRST page where signatures are located in BA PDF
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];  // Signature grid is on page 1
            const { width: pageWidth, height: pageHeight } = firstPage.getSize();

            // Embed the signature image
            const signatureImageBytes = await fetch(signatureDataUrl).then(res => res.arrayBuffer());
            const signatureImage = await pdfDoc.embedPng(signatureImageBytes);

            // Signature dimensions
            const sigWidth = 100;
            const sigHeight = 45;

            // Exact coordinates from PDF Coordinate Finder tool
            // These are the center points of each signature box
            const jabatanPositions: Record<JabatanType, { x: number; y: number }> = {
                'Area Supervisor': { x: 249, y: 321 },
                'Area Manager': { x: 431, y: 321 },
                'DBM ADM / BM': { x: 68, y: 171 },
                'EDP Manager': { x: 249, y: 173 },
                'Office Manager': { x: 429, y: 173 },
            };

            const position = jabatanPositions[user.jabatan];

            // Draw the signature on the PDF
            firstPage.drawImage(signatureImage, {
                x: position.x,
                y: position.y,
                width: sigWidth,
                height: sigHeight,
            });

            // Draw the name below the signature (centered)
            const nameText = `(${user.nama})`;
            firstPage.drawText(nameText, {
                x: position.x + 10,
                y: position.y - 12,
                size: 8,
                color: rgb(0, 0, 0),
            });

            // Save the modified PDF
            const modifiedPdfBytes = await pdfDoc.save();
            const blob = new Blob([new Uint8Array(modifiedPdfBytes)], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            setSignedPdfUrl(url);
            setShowSignatureModal(false);
        } catch (error) {
            console.error('Error processing signature:', error);
            alert('Gagal memproses tanda tangan. Silakan coba lagi.');
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadPdf = () => {
        if (signedPdfUrl) {
            const link = document.createElement('a');
            link.href = signedPdfUrl;
            link.download = `BA_Signed_${user.jabatan.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
            link.click();
        }
    };

    const shareViaWhatsApp = () => {
        if (signedPdfUrl) {
            // For mobile, we can use Web Share API if available
            if (navigator.share) {
                fetch(signedPdfUrl)
                    .then(res => res.blob())
                    .then(blob => {
                        const file = new File([blob], `BA_Signed_${user.jabatan.replace(/\s+/g, '_')}.pdf`, { type: 'application/pdf' });
                        navigator.share({
                            title: 'Berita Acara - Signed',
                            text: `BA sudah ditandatangani oleh ${user.nama} (${user.jabatan})`,
                            files: [file],
                        }).catch(console.error);
                    });
            } else {
                // Fallback: just open WhatsApp with text
                const text = encodeURIComponent(`BA sudah ditandatangani oleh ${user.nama} (${user.jabatan}). Silakan download dari link yang dikirim.`);
                window.open(`https://wa.me/?text=${text}`, '_blank');
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <button
                        onClick={onBack}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span>Keluar</span>
                    </button>

                    <div className="text-right">
                        <p className="text-sm text-gray-500">Login sebagai</p>
                        <p className="font-bold text-gray-800">{user.nama}</p>
                        <p className="text-xs text-green-600">{user.jabatan}</p>
                    </div>
                </div>

                {/* Main Content */}
                <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
                    <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">TTD Online - Berita Acara</h1>

                    {/* Upload Section */}
                    {!pdfFile && (
                        <div
                            onDrop={handleDrop}
                            onDragOver={(e) => e.preventDefault()}
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 hover:border-green-400 rounded-2xl p-10 text-center cursor-pointer transition-colors bg-gray-50 hover:bg-green-50"
                        >
                            <input
                                type="file"
                                ref={fileInputRef}
                                accept="application/pdf"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            <p className="text-lg font-medium text-gray-700 mb-1">Upload PDF Berita Acara</p>
                            <p className="text-sm text-gray-500">Drag & drop atau klik untuk memilih file</p>
                        </div>
                    )}

                    {/* PDF Preview */}
                    {pdfFile && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
                                <div className="flex items-center gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    <div>
                                        <p className="font-medium text-gray-800">{pdfFile.name}</p>
                                        <p className="text-xs text-gray-500">{(pdfFile.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setPdfFile(null);
                                        setPdfPreviewUrl(null);
                                        setSignedPdfUrl(null);
                                    }}
                                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                                >
                                    Hapus
                                </button>
                            </div>

                            {/* PDF Embed Preview - Works on all devices */}
                            {pdfPreviewUrl && !signedPdfUrl && (
                                <div className="border rounded-xl overflow-hidden bg-white">
                                    <object
                                        data={pdfPreviewUrl}
                                        type="application/pdf"
                                        className="w-full h-80 md:h-96"
                                    >
                                        {/* Fallback for browsers that don't support object embed */}
                                        <div className="p-4 bg-gray-50 text-center">
                                            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                            <p className="font-medium text-gray-800 mb-2">PDF siap untuk ditandatangani</p>
                                            <a
                                                href={pdfPreviewUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
                                            >
                                                Buka PDF
                                            </a>
                                        </div>
                                    </object>
                                </div>
                            )}

                            {/* Signed PDF Preview */}
                            {signedPdfUrl && (
                                <div className="border-2 border-green-300 rounded-xl overflow-hidden bg-green-50">
                                    <div className="bg-green-100 px-4 py-2 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                        <span className="font-medium text-green-800">PDF sudah ditandatangani oleh {user.nama}!</span>
                                    </div>
                                    <object
                                        data={signedPdfUrl}
                                        type="application/pdf"
                                        className="w-full h-80 md:h-96 bg-white"
                                    >
                                        {/* Fallback */}
                                        <div className="p-4 text-center">
                                            <p className="text-sm text-green-700 mb-3">PDF berhasil ditandatangani!</p>
                                            <a
                                                href={signedPdfUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg font-medium"
                                            >
                                                Lihat Hasil PDF
                                            </a>
                                        </div>
                                    </object>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-3">
                                {!signedPdfUrl ? (
                                    <button
                                        onClick={() => setShowSignatureModal(true)}
                                        className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                        Tanda Tangani
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={downloadPdf}
                                            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                            Download PDF
                                        </button>
                                        {isMobile && (
                                            <button
                                                onClick={shareViaWhatsApp}
                                                className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                                            >
                                                <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                                                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                                </svg>
                                                Bagikan via WA
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setSignedPdfUrl(null);
                                                clearSignature();
                                            }}
                                            className="py-3 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-medium transition-colors"
                                        >
                                            TTD Ulang
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Signature Modal */}
            {showSignatureModal && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-bold text-gray-800">Tanda Tangan - {user.jabatan}</h3>
                            <button
                                onClick={() => setShowSignatureModal(false)}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 bg-gray-50">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden">
                                <SignatureCanvas
                                    ref={signatureRef}
                                    penColor="black"
                                    canvasProps={{
                                        width: 320,
                                        height: 200,
                                        className: 'sigCanvas w-full touch-none',
                                        style: { width: '100%', height: '200px' }
                                    }}
                                />
                            </div>
                            <p className="text-center text-gray-400 text-xs mt-2">Gambar tanda tangan Anda di atas</p>
                        </div>

                        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-gray-200">
                            <button
                                onClick={clearSignature}
                                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold transition-all hover:bg-red-200 border border-red-200"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                Hapus
                            </button>
                            <button
                                onClick={processSignature}
                                disabled={isProcessing}
                                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all shadow-md active:scale-95 disabled:opacity-50"
                            >
                                {isProcessing ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Memproses...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                        </svg>
                                        Terapkan TTD
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TtdOnlinePage;
