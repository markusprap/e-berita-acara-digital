
import React, { useState, useRef } from 'react';
import { BeritaAcaraData, Attachment } from './types';
import BeritaAcaraForm from './components/BeritaAcaraForm';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import MemoModal from './components/MemoModal';
import LandingPage from './components/LandingPage';
import JabatanSelector from './components/JabatanSelector';
import TtdOnlinePage from './components/TtdOnlinePage';

type PageType = 'landing' | 'buat-ba' | 'ttd-select' | 'ttd-online';
type JabatanType = 'Area Supervisor' | 'Area Manager' | 'EDP Manager' | 'Office Manager' | 'DBM ADM / BM';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageType>('landing');
  const [ttdUser, setTtdUser] = useState<{ nama: string; jabatan: JabatanType } | null>(null);
  const [showMemo, setShowMemo] = useState(true);
  const [data, setData] = useState<BeritaAcaraData>({
    kodeToko: '',
    namaToko: '',
    namaPersonil: '',
    nik: '',
    jabatan: '',
    nominal: '',
    tanggalVarian: '',
    kronologi: '',
    lokasi: 'Jombang',
    tanggalDibuat: new Date().toISOString().split('T')[0],
    waktuDibuat: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  });

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewImages, setPdfPreviewImages] = useState<string[]>([]);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);
  const signatureRef = useRef<any>(null);

  // Check if form is valid (all required fields filled + signature)
  const isFormValid = React.useMemo(() => {
    const requiredFields: (keyof BeritaAcaraData)[] = [
      'kodeToko', 'namaToko', 'namaPersonil', 'nik', 'jabatan',
      'nominal', 'tanggalVarian', 'kronologi', 'lokasi', 'tanggalDibuat'
    ];

    const allFieldsFilled = requiredFields.every(field => data[field] && data[field].toString().trim() !== '');
    const isSignatureFilled = !!signatureDataUrl;

    return allFieldsFilled && isSignatureFilled;
  }, [data, signatureDataUrl]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Force uppercase for Kode Toko
    let finalValue = value;
    if (name === 'kodeToko') {
      finalValue = value.toUpperCase();
    }

    // Restrict NIK to numbers only
    if (name === 'nik') {
      finalValue = value.replace(/[^0-9]/g, '');
    }

    setData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).slice(0, 3 - attachments.length) as File[];
      const newAttachments = newFiles.map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        url: URL.createObjectURL(file),
        file
      }));
      setAttachments(prev => [...prev, ...newAttachments]);
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const generatePDF = async (): Promise<{ blob: Blob; dataUrl: string; pages: string[] } | null> => {
    if (!formRef.current) return null;

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pages: string[] = [];

      // Force desktop width for capture to ensure A4 layout is preserved
      // even when generating from a mobile device
      const canvas = await html2canvas(formRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: 1280,
        onclone: (clonedDoc) => {
          // Remove borders and background from signature boxes for the PDF
          const signatureBoxes = clonedDoc.querySelectorAll('.signature-box');
          signatureBoxes.forEach((box) => {
            if (box instanceof HTMLElement) {
              box.style.border = 'none';
              box.style.boxShadow = 'none';
              box.style.backgroundColor = 'transparent';
            }
          });
        }
      });

      const imgData = canvas.toDataURL('image/png');
      pages.push(imgData); // Add first page (form) to pages array

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfPageHeight = pdf.internal.pageSize.getHeight();

      // Calculate the image height in PDF units
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const pdfImgHeight = (imgHeight * pdfWidth) / imgWidth;

      // If the content fits on one page, just add it
      if (pdfImgHeight <= pdfPageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfImgHeight);
      } else {
        // Split content across multiple pages
        let heightLeft = pdfImgHeight;
        let position = 0;

        // First page
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfImgHeight);
        heightLeft -= pdfPageHeight;

        // Additional pages
        while (heightLeft > 0) {
          position -= pdfPageHeight;
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfImgHeight);
          heightLeft -= pdfPageHeight;
        }
      }

      for (const attachment of attachments) {
        pdf.addPage();
        const img = await new Promise<HTMLImageElement>((resolve) => {
          const i = new Image();
          i.onload = () => resolve(i);
          i.src = attachment.url;
        });

        const attachmentCanvas = document.createElement('canvas');
        attachmentCanvas.width = img.width;
        attachmentCanvas.height = img.height;
        const ctx = attachmentCanvas.getContext('2d');
        ctx?.drawImage(img, 0, 0);

        const attachData = attachmentCanvas.toDataURL('image/jpeg', 0.8);
        pages.push(attachData); // Add attachment to pages array

        const attachProps = pdf.getImageProperties(attachData);
        const ratio = Math.min(pdfWidth / attachProps.width, pdf.internal.pageSize.getHeight() / attachProps.height);
        const w = attachProps.width * ratio;
        const h = attachProps.height * ratio;

        pdf.addImage(attachData, 'JPEG', (pdfWidth - w) / 2, (pdf.internal.pageSize.getHeight() - h) / 2, w, h);
      }

      const blob = pdf.output('blob');
      const dataUrl = URL.createObjectURL(blob);
      return { blob, dataUrl, pages };
    } catch (error) {
      console.error('PDF generation failed:', error);
      return null;
    }
  };

  const handlePreview = async () => {
    setIsExporting(true);
    const result = await generatePDF();
    setIsExporting(false);

    if (result) {
      setPdfBlob(result.blob);
      setPdfPreviewUrl(result.dataUrl);
      setPdfPreviewImages(result.pages);
      setShowPreview(true);
    } else {
      alert('Gagal membuat PDF. Silakan coba lagi.');
    }
  };

  const handleDownload = () => {
    if (!pdfBlob) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(pdfBlob);
    link.download = `Berita_Acara_${data.kodeToko || 'Document'}.pdf`;
    link.click();
  };

  const handleShareWhatsApp = async () => {
    if (!pdfBlob) return;

    const fileName = `Berita_Acara_${data.kodeToko || 'Document'}.pdf`;
    const message = encodeURIComponent(`Berita Acara - Kode Toko: ${data.kodeToko || '-'}, Nama Personil: ${data.namaPersonil || '-'}`);

    // Try Web Share API first
    if (navigator.share && navigator.canShare) {
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' });

      if (navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: 'Berita Acara',
            text: `Berita Acara - ${data.kodeToko || 'Document'}`,
          });
          return; // Success!
        } catch (err) {
          console.log('Share cancelled or failed:', err);
          // If user cancelled, don't do fallback. Only if failed.
          if ((err as Error).name === 'AbortError') return;
        }
      }
    }

    // Fallback: Download + Manual Share
    // This handles browsers that don't support file sharing or failed above
    const confirmFallback = window.confirm(
      "Fitur share langsung tidak didukung oleh browser ini.\n\nKlik OK untuk mengunduh PDF, lalu kirim manual via WhatsApp."
    );

    if (confirmFallback) {
      // Trigger download
      handleDownload();

      // Open WhatsApp with text, so user can attach the file they just downloaded
      // Small delay to ensure download starts first
      setTimeout(() => {
        window.open(`https://wa.me/?text=${message}`, '_blank');
      }, 1000);
    }
  };

  const closePreview = () => {
    setShowPreview(false);
    if (pdfPreviewUrl) {
      URL.revokeObjectURL(pdfPreviewUrl);
    }
    setPdfBlob(null);
    setPdfPreviewUrl(null);
    setPdfPreviewImages([]);
  };


  return (
    <>
      {/* Landing Page */}
      {currentPage === 'landing' && (
        <LandingPage
          onSelectMenu={(menu) => {
            if (menu === 'buat-ba') {
              setCurrentPage('buat-ba');
            } else {
              setCurrentPage('ttd-select');
            }
          }}
        />
      )}

      {/* TTD Jabatan Selector */}
      {currentPage === 'ttd-select' && (
        <JabatanSelector
          onAuthenticated={(user) => {
            setTtdUser(user);
            setCurrentPage('ttd-online');
          }}
          onBack={() => setCurrentPage('landing')}
        />
      )}

      {/* TTD Online Page */}
      {currentPage === 'ttd-online' && ttdUser && (
        <TtdOnlinePage
          user={ttdUser}
          onBack={() => {
            setTtdUser(null);
            setCurrentPage('landing');
          }}
        />
      )}

      {/* BA Form Page */}
      {currentPage === 'buat-ba' && (
        <div className="min-h-screen pb-24 md:pb-20 bg-gray-50">
          {/* Memo Modal on Start */}
          {showMemo && <MemoModal onClose={() => setShowMemo(false)} />}
          <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex justify-between items-center no-print shadow-sm">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage('landing')}
                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-gray-800 tracking-tight">E-Berita Acara</h1>
            </div>

            {/* Desktop Preview Button */}
            <button
              onClick={handlePreview}
              disabled={!isFormValid || isExporting}
              className="hidden md:flex bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-semibold transition-all shadow-md active:scale-95 items-center gap-2"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  Preview PDF
                </>
              )}
            </button>
          </div>

          <main className="w-full max-w-4xl mx-auto mt-4 md:mt-8 px-0 md:px-4">
            <div className="overflow-x-auto w-full">
              <div ref={formRef} className="bg-white shadow-xl rounded-none md:rounded-sm p-4 md:p-12 print-area ring-1 ring-gray-200 min-w-[320px] md:w-full mx-auto">
                <BeritaAcaraForm
                  data={data}
                  onChange={handleInputChange}
                  signatureRef={signatureRef}
                  signatureDataUrl={signatureDataUrl}
                  setSignatureDataUrl={setSignatureDataUrl}
                />
              </div>
            </div>

            <section className="mt-8 bg-white shadow-lg rounded-xl p-6 no-print mx-4 md:mx-0">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                UPLOAD LAMPIRAN (Maks 3 Gambar)
              </h2>
              <p className="text-sm text-gray-500 mb-4">Tiap gambar akan menjadi 1 halaman baru pada PDF.</p>

              <div className="flex flex-wrap gap-4 mb-6">
                {attachments.map((att) => (
                  <div key={att.id} className="relative group w-32 h-32 rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
                    <img src={att.url} alt="Attachment" className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
                {attachments.length < 3 && (
                  <div className="w-32 h-32 flex flex-col gap-2">
                    {/* Camera Button */}
                    <label className="flex-1 border-2 border-dashed border-blue-200 bg-blue-50/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-blue-100 transition-colors text-blue-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-[10px] font-bold uppercase mt-1">Kamera</span>
                      <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
                    </label>

                    {/* Gallery Button */}
                    <label className="flex-1 border-2 border-dashed border-green-200 bg-green-50/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-green-100 transition-colors text-green-600">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-[10px] font-bold uppercase mt-1">Galeri</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} multiple />
                    </label>
                  </div>
                )}
              </div>
            </section>
          </main>

          <footer className="mt-12 text-center text-gray-400 text-sm no-print mb-8">
            <a href="https://instagram.com/markusprap" target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 transition-colors">
              Made with ☕ by Programmer Gen Z
            </a>
          </footer>

          {/* Mobile Sticky Bottom Preview Button */}
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-200 md:hidden z-40 no-print safe-area-bottom">
            <button
              onClick={handlePreview}
              disabled={!isFormValid || isExporting}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-bold text-lg shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              {isExporting ? (
                <>
                  <svg className="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  Preview PDF
                </>
              )}
            </button>
          </div>

          {/* PDF Preview Modal */}
          {showPreview && (
            <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Modal Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-gray-800">Preview PDF</h3>
                  <button
                    onClick={closePreview}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                {/* PDF Preview */}
                <div className="flex-1 overflow-auto bg-gray-100 p-4">
                  {pdfPreviewImages.map((imgSrc, index) => (
                    <div key={index} className="mb-4 last:mb-0 shadow-lg">
                      <img
                        src={imgSrc}
                        alt={`Preview Page ${index + 1}`}
                        className="w-full h-auto bg-white"
                      />
                    </div>
                  ))}
                  {/* Fallback/Original Iframe removed in favor of image preview */}
                </div>

                {/* Modal Footer with Actions */}
                <div className="flex items-center justify-center gap-4 px-6 py-4 border-t border-gray-200 bg-gray-50 mobile:flex-col">
                  <button
                    onClick={handleDownload}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-md active:scale-95"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    Unduh PDF
                  </button>
                  <button
                    onClick={handleShareWhatsApp}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition-all shadow-md active:scale-95 md:hidden"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Bagikan via WA
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default App;