import React, { useState, useRef, useCallback, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { PDFDocument, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Configure worker - use local worker from node_modules
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
).toString();

type JabatanType = 'Area Supervisor' | 'Area Manager' | 'EDP Manager' | 'Office Manager' | 'DBM ADM / BM';

interface Props {
    user: { nama: string; jabatan: JabatanType };
    onBack: () => void;
}

const TtdOnlinePage: React.FC<Props> = ({ user, onBack }) => {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [pdfArrayBuffer, setPdfArrayBuffer] = useState<ArrayBuffer | null>(null);
    const [pdfPageInfo, setPdfPageInfo] = useState<{ width: number; height: number } | null>(null);
    const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);
    const [signedPdfBytes, setSignedPdfBytes] = useState<Uint8Array | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const [renderError, setRenderError] = useState<string | null>(null);

    // Signature states for drag & drop
    const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
    const [signaturePosition, setSignaturePosition] = useState({ x: 200, y: 400 }); // pixel position on canvas
    const [signatureSize, setSignatureSize] = useState({ width: 100, height: 45 });
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [canvasScale, setCanvasScale] = useState(1);

    const signatureRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const resultCanvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const resultContainerRef = useRef<HTMLDivElement>(null);

    const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Render PDF to canvas
    const renderPdfToCanvas = useCallback(async (arrayBuffer: ArrayBuffer) => {
        if (!canvasRef.current || !containerRef.current) return;

        setRenderError(null);

        try {
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);

            // Calculate scale to fit container width
            const containerWidth = containerRef.current.clientWidth - 32; // minus padding
            const viewport = page.getViewport({ scale: 1 });
            const scale = containerWidth / viewport.width;
            const scaledViewport = page.getViewport({ scale });

            setCanvasScale(scale);
            setPdfPageInfo({ width: viewport.width, height: viewport.height });

            const canvas = canvasRef.current;
            const context = canvas.getContext('2d');
            if (!context) return;

            canvas.width = scaledViewport.width;
            canvas.height = scaledViewport.height;

            const renderContext = {
                canvasContext: context,
                viewport: scaledViewport,
                canvas: canvas
            };

            await page.render(renderContext).promise;

            // Set default signature position based on jabatan
            const defaultPositions: Record<JabatanType, { x: number; y: number }> = {
                'Area Supervisor': { x: scaledViewport.width * 0.35, y: scaledViewport.height * 0.75 },
                'Area Manager': { x: scaledViewport.width * 0.65, y: scaledViewport.height * 0.75 },
                'DBM ADM / BM': { x: scaledViewport.width * 0.10, y: scaledViewport.height * 0.85 },
                'EDP Manager': { x: scaledViewport.width * 0.35, y: scaledViewport.height * 0.85 },
                'Office Manager': { x: scaledViewport.width * 0.65, y: scaledViewport.height * 0.85 },
            };
            setSignaturePosition(defaultPositions[user.jabatan] || { x: scaledViewport.width * 0.5, y: scaledViewport.height * 0.8 });

        } catch (error) {
            console.error('Error rendering PDF:', error);
            setRenderError('Gagal memuat preview PDF. Silakan coba lagi.');
        }
    }, [user.jabatan]);

    // Handle file upload
    const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
            setSignedPdfUrl(null);
            setSignatureDataUrl(null);
            setRenderError(null);

            const arrayBuffer = await file.arrayBuffer();
            setPdfArrayBuffer(arrayBuffer);
        }
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            setPdfFile(file);
            setSignedPdfUrl(null);
            setSignatureDataUrl(null);
            setRenderError(null);

            const arrayBuffer = await file.arrayBuffer();
            setPdfArrayBuffer(arrayBuffer);
        }
    }, []);

    // Render PDF when arrayBuffer changes
    useEffect(() => {
        if (pdfArrayBuffer) {
            renderPdfToCanvas(pdfArrayBuffer);
        }
    }, [pdfArrayBuffer, renderPdfToCanvas]);

    // Render PDF for result preview
    useEffect(() => {
        const renderResult = async () => {
            if (signedPdfBytes && resultCanvasRef.current && resultContainerRef.current) {
                try {
                    const loadingTask = pdfjsLib.getDocument({ data: signedPdfBytes });
                    const pdf = await loadingTask.promise;
                    const page = await pdf.getPage(1);

                    const containerWidth = resultContainerRef.current.clientWidth;
                    const viewport = page.getViewport({ scale: 1 });
                    const scale = containerWidth / viewport.width;
                    const scaledViewport = page.getViewport({ scale });

                    const canvas = resultCanvasRef.current;
                    const context = canvas.getContext('2d');
                    if (context) {
                        canvas.width = scaledViewport.width;
                        canvas.height = scaledViewport.height;
                        await page.render({
                            canvasContext: context,
                            viewport: scaledViewport,
                            canvas: canvas
                        }).promise;
                    }
                } catch (err) {
                    console.error('Error rendering result PDF:', err);
                }
            }
        };
        renderResult();
    }, [signedPdfBytes]);

    const clearSignature = () => {
        signatureRef.current?.clear();
    };

    // Save signature from modal
    const saveSignature = () => {
        if (!signatureRef.current || signatureRef.current.isEmpty()) {
            alert('Silakan buat tanda tangan terlebih dahulu');
            return;
        }

        const dataUrl = signatureRef.current.toDataURL('image/png');
        setSignatureDataUrl(dataUrl);
        setShowSignatureModal(false);
    };

    // Resize handler
    const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
    };

    // Drag handlers - pixel based on canvas
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!containerRef.current || !signatureDataUrl || isResizing) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Check if click is on signature (not on resize handle)
        if (
            x >= signaturePosition.x &&
            x <= signaturePosition.x + signatureSize.width &&
            y >= signaturePosition.y &&
            y <= signaturePosition.y + signatureSize.height
        ) {
            e.preventDefault();
            setIsDragging(true);
            setDragOffset({
                x: x - signaturePosition.x,
                y: y - signaturePosition.y
            });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current || !canvasRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (isResizing) {
            // Calculate new size based on mouse position
            const newWidth = Math.max(50, Math.min(200, x - signaturePosition.x));
            const aspectRatio = 45 / 100; // original aspect ratio
            const newHeight = newWidth * aspectRatio;

            setSignatureSize({ width: newWidth, height: newHeight });
        } else if (isDragging) {
            const newX = x - dragOffset.x;
            const newY = y - dragOffset.y;

            // Clamp to canvas bounds
            const maxX = canvasRef.current.width - signatureSize.width;
            const maxY = canvasRef.current.height - signatureSize.height;

            setSignaturePosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setIsResizing(false);
    };

    // Touch handlers for mobile
    const handleTouchStart = (e: React.TouchEvent) => {
        if (!containerRef.current || !signatureDataUrl) return;

        const touch = e.touches[0];
        const rect = containerRef.current.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        if (
            x >= signaturePosition.x &&
            x <= signaturePosition.x + signatureSize.width &&
            y >= signaturePosition.y &&
            y <= signaturePosition.y + signatureSize.height
        ) {
            e.preventDefault();
            setIsDragging(true);
            setDragOffset({
                x: x - signaturePosition.x,
                y: y - signaturePosition.y
            });
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!containerRef.current || !canvasRef.current) return;

        const touch = e.touches[0];
        const rect = containerRef.current.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;

        if (isResizing) {
            const newWidth = Math.max(50, Math.min(200, x - signaturePosition.x));
            const aspectRatio = 45 / 100;
            const newHeight = newWidth * aspectRatio;

            setSignatureSize({ width: newWidth, height: newHeight });
        } else if (isDragging) {
            const newX = x - dragOffset.x;
            const newY = y - dragOffset.y;

            const maxX = canvasRef.current.width - signatureSize.width;
            const maxY = canvasRef.current.height - signatureSize.height;

            setSignaturePosition({
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
            });
        }
    };

    const handleTouchEnd = () => {
        setIsDragging(false);
        setIsResizing(false);
    };

    // Apply signature to PDF
    const applySignatureToPdf = async () => {
        if (!pdfFile || !signatureDataUrl || !pdfPageInfo) {
            return;
        }

        setIsProcessing(true);

        try {
            // Read fresh bytes from file (ArrayBuffer may be detached after pdfjs usage)
            const freshPdfBytes = await pdfFile.arrayBuffer();
            const pdfDoc = await PDFDocument.load(freshPdfBytes);
            const pages = pdfDoc.getPages();
            const firstPage = pages[0];
            const { height: pageHeight } = firstPage.getSize();

            // Convert base64 data URL to Uint8Array
            const base64Data = signatureDataUrl.split(',')[1];
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }

            // Embed signature image
            const signatureImage = await pdfDoc.embedPng(bytes);

            // Convert canvas position to PDF coordinates
            const pdfX = signaturePosition.x / canvasScale;
            // PDF Y is from bottom, canvas Y is from top
            const pdfY = pageHeight - (signaturePosition.y / canvasScale) - (signatureSize.height / canvasScale);

            const sigWidth = signatureSize.width / canvasScale;
            const sigHeight = signatureSize.height / canvasScale;

            // Draw signature
            firstPage.drawImage(signatureImage, {
                x: pdfX,
                y: pdfY,
                width: sigWidth,
                height: sigHeight,
            });

            // Draw name for AS and AM
            if (user.jabatan === 'Area Supervisor' || user.jabatan === 'Area Manager') {
                const nameText = `(${user.nama})`;
                firstPage.drawText(nameText, {
                    x: pdfX + 10,
                    y: pdfY - 12,
                    size: 8,
                    color: rgb(0, 0, 0),
                });
            }

            // Save PDF
            const modifiedPdfBytes = await pdfDoc.save();
            const blob = new Blob([new Uint8Array(modifiedPdfBytes)], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);

            setSignedPdfBytes(modifiedPdfBytes);
            setSignedPdfUrl(url);
        } catch (error: unknown) {
            console.error('Error applying signature:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            alert(`Gagal memproses tanda tangan: ${errorMessage}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadPdf = () => {
        if (signedPdfUrl && pdfFile) {
            const originalName = pdfFile.name.replace('.pdf', '');
            const kodeTokoMatch = originalName.match(/[A-Z]\d{2}[A-Z]/);
            const kodeToko = kodeTokoMatch ? kodeTokoMatch[0] : 'TOKO';

            const now = new Date();
            const dd = String(now.getDate()).padStart(2, '0');
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const yy = String(now.getFullYear()).slice(-2);
            const tanggal = `${dd}${mm}${yy}`;

            const jabatanCodes: Record<string, string> = {
                'Area Supervisor': 'AS',
                'Area Manager': 'AM',
                'DBM ADM / BM': 'DBM',
                'EDP Manager': 'EDP',
                'Office Manager': 'OM',
            };
            const jabatanCode = jabatanCodes[user.jabatan] || user.jabatan;

            const filename = `BA VARIANCE ${kodeToko} ${tanggal} TTD ${jabatanCode}.pdf`;

            const link = document.createElement('a');
            link.href = signedPdfUrl;
            link.download = filename;
            link.click();
        }
    };

    const shareViaWhatsApp = async () => {
        if (signedPdfUrl && pdfFile) {
            const originalName = pdfFile.name.replace('.pdf', '');
            const kodeTokoMatch = originalName.match(/[A-Z]\d{2}[A-Z]/);
            const kodeToko = kodeTokoMatch ? kodeTokoMatch[0] : 'TOKO';

            const now = new Date();
            const dd = String(now.getDate()).padStart(2, '0');
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const yy = String(now.getFullYear()).slice(-2);
            const tanggal = `${dd}${mm}${yy}`;

            const jabatanCodes: Record<string, string> = {
                'Area Supervisor': 'AS',
                'Area Manager': 'AM',
                'DBM ADM / BM': 'DBM',
                'EDP Manager': 'EDP',
                'Office Manager': 'OM',
            };
            const jabatanCode = jabatanCodes[user.jabatan] || user.jabatan;
            const filename = `BA VARIANCE ${kodeToko} ${tanggal} TTD ${jabatanCode}.pdf`;

            try {
                const response = await fetch(signedPdfUrl);
                const blob = await response.blob();
                const file = new File([blob], filename, { type: 'application/pdf' });

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'Berita Acara - Ditandatangani',
                        text: `BA VARIANCE ${kodeToko} sudah ditandatangani oleh ${user.jabatan}`,
                    });
                } else {
                    const link = document.createElement('a');
                    link.href = signedPdfUrl;
                    link.download = filename;
                    link.click();
                }
            } catch (error) {
                console.error('Error sharing:', error);
            }
        }
    };

    const resetAll = () => {
        setPdfFile(null);
        setPdfArrayBuffer(null);
        setSignedPdfUrl(null);
        setSignatureDataUrl(null);
        setPdfPageInfo(null);
        setRenderError(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 p-4 pb-20">
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

                    {/* PDF with Signature Editor */}
                    {pdfFile && !signedPdfUrl && (
                        <div className="space-y-4">
                            {/* File info bar */}
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
                                    onClick={resetAll}
                                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                                >
                                    Hapus
                                </button>
                            </div>

                            {/* Error message */}
                            {renderError && (
                                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                                    {renderError}
                                </div>
                            )}

                            {/* PDF Canvas with Draggable Signature */}
                            <div
                                ref={containerRef}
                                className="relative border rounded-xl overflow-hidden bg-gray-200 p-4"
                                onMouseMove={handleMouseMove}
                                onMouseUp={handleMouseUp}
                                onMouseLeave={handleMouseUp}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                            >
                                <div className="relative inline-block">
                                    <canvas
                                        ref={canvasRef}
                                        className="block shadow-lg rounded bg-white"
                                        onMouseDown={handleMouseDown}
                                        onTouchStart={handleTouchStart}
                                    />

                                    {/* Draggable & Resizable Signature Overlay */}
                                    {signatureDataUrl && canvasRef.current && (
                                        <div
                                            className={`absolute cursor-move rounded border-2 ${isDragging || isResizing ? 'border-green-600 shadow-xl' : 'border-dashed border-green-500 hover:border-green-600'} bg-white/95 transition-shadow select-none`}
                                            style={{
                                                left: signaturePosition.x,
                                                top: signaturePosition.y,
                                                width: signatureSize.width,
                                                height: signatureSize.height,
                                                touchAction: 'none',
                                                zIndex: 10
                                            }}
                                            onMouseDown={handleMouseDown}
                                            onTouchStart={handleTouchStart}
                                        >
                                            <img
                                                src={signatureDataUrl}
                                                alt="Signature"
                                                className="w-full h-full object-contain pointer-events-none p-1"
                                                draggable={false}
                                            />
                                            {/* Name preview for AS and AM */}
                                            {(user.jabatan === 'Area Supervisor' || user.jabatan === 'Area Manager') && (
                                                <div
                                                    className="absolute left-0 right-0 text-center pointer-events-none"
                                                    style={{
                                                        bottom: '-16px',
                                                        fontSize: '8px',
                                                        color: '#000',
                                                        backgroundColor: 'rgba(255,255,255,0.9)',
                                                        padding: '1px 4px',
                                                        borderRadius: '2px',
                                                        whiteSpace: 'nowrap'
                                                    }}
                                                >
                                                    ({user.nama})
                                                </div>
                                            )}
                                            {/* Checkmark indicator */}
                                            <div className="absolute -top-2 -left-2 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow">
                                                ✓
                                            </div>
                                            {/* Resize handle - bottom right corner */}
                                            <div
                                                className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-600 rounded-sm cursor-se-resize shadow-md hover:bg-green-700 flex items-center justify-center"
                                                onMouseDown={handleResizeStart}
                                                onTouchStart={handleResizeStart}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 20l8-8m4-4l4-4" />
                                                </svg>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Instructions */}
                            {signatureDataUrl && (
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                    <div>
                                        <p className="text-sm font-medium text-amber-800">Geser tanda tangan ke posisi yang diinginkan</p>
                                        <p className="text-xs text-amber-600 mt-1">Klik dan drag tanda tangan, lalu klik "Simpan PDF".</p>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex flex-col gap-3">
                                {!signatureDataUrl ? (
                                    <button
                                        onClick={() => setShowSignatureModal(true)}
                                        className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-3 shadow-lg"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                        Buat Tanda Tangan
                                    </button>
                                ) : (
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        <button
                                            onClick={() => setShowSignatureModal(true)}
                                            className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors border border-gray-200"
                                        >
                                            Ganti TTD
                                        </button>
                                        <button
                                            onClick={applySignatureToPdf}
                                            disabled={isProcessing}
                                            className="flex-1 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-3 shadow-lg disabled:opacity-50"
                                        >
                                            {isProcessing ? (
                                                <>
                                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                                    </svg>
                                                    Memproses...
                                                </>
                                            ) : (
                                                <>
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                    Simpan PDF
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Signed PDF Result Preview */}
                    {signedPdfUrl && (
                        <div className="space-y-4">
                            <div className="border-2 border-green-300 rounded-xl overflow-hidden bg-white">
                                <div className="bg-green-100 px-4 py-2 flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="font-medium text-green-800">PDF sudah ditandatangani!</span>
                                </div>
                                <div ref={resultContainerRef} className="p-4 flex justify-center bg-gray-100 min-h-[200px]">
                                    <canvas
                                        ref={resultCanvasRef}
                                        className="shadow-md rounded bg-white max-w-full h-auto"
                                    />
                                </div>
                            </div>

                            {/* Download Buttons */}
                            <div className="flex flex-col gap-3">
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <button
                                        onClick={downloadPdf}
                                        className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-3 shadow-lg"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Unduh PDF
                                    </button>
                                    {isMobile && (
                                        <button
                                            onClick={shareViaWhatsApp}
                                            className="flex-1 py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-3 shadow-lg"
                                        >
                                            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                            </svg>
                                            Bagikan via WhatsApp
                                        </button>
                                    )}
                                </div>
                                <button
                                    onClick={async () => {
                                        setSignedPdfUrl(null);
                                        setSignatureDataUrl(null);
                                        // Re-read file and re-render canvas (ArrayBuffer is detached)
                                        if (pdfFile) {
                                            const newBuffer = await pdfFile.arrayBuffer();
                                            setPdfArrayBuffer(newBuffer);
                                        }
                                    }}
                                    className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-colors border border-gray-200"
                                >
                                    Tanda Tangan Ulang
                                </button>
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
                                onClick={saveSignature}
                                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all shadow-md active:scale-95"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Simpan TTD
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="mt-8 text-center text-gray-400 text-xs">
                <a href="https://instagram.com/markusprap" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 transition-colors">
                    Made with ☕ by Programmer Gen Z
                </a>
            </div>
        </div>
    );
};

export default TtdOnlinePage;
