
import React, { useState, useRef, useEffect } from 'react';
import { BeritaAcaraData } from '../types';
import SignatureCanvas from 'react-signature-canvas';

interface Props {
  data: BeritaAcaraData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  signatureRef: React.RefObject<any>;
  signatureDataUrl: string | null;
  setSignatureDataUrl: (url: string | null) => void;
}

const BeritaAcaraForm: React.FC<Props> = ({ data, onChange, signatureRef, signatureDataUrl, setSignatureDataUrl }) => {
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const modalSignatureRef = useRef<any>(null);

  const clearSignature = () => {
    signatureRef.current?.clear();
    setSignatureDataUrl(null);
  };

  const clearModalSignature = () => {
    modalSignatureRef.current?.clear();
  };

  const openSignatureModal = () => {
    setShowSignatureModal(true);
  };

  const closeSignatureModal = () => {
    setShowSignatureModal(false);
  };

  const saveSignature = () => {
    if (modalSignatureRef.current && !modalSignatureRef.current.isEmpty()) {
      const dataUrl = modalSignatureRef.current.toDataURL('image/png');
      setSignatureDataUrl(dataUrl);

      // Also update the main small canvas
      if (signatureRef.current) {
        signatureRef.current.clear();
        const img = new Image();
        img.onload = () => {
          const canvas = signatureRef.current.getCanvas();
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = dataUrl;
      }
    }
    setShowSignatureModal(false);
  };

  // Helper to format nominal with dots as thousands separator
  const handleNominalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '');
    const formattedValue = rawValue.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    // Create a synthetic event to maintain compatibility with the parent's onChange
    const syntheticEvent = {
      ...e,
      target: {
        ...e.target,
        name: 'nominal',
        value: formattedValue
      }
    } as React.ChangeEvent<HTMLInputElement>;

    onChange(syntheticEvent);
  };

  // Helper to display date as dd-mm-yyyy
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    return `${day}-${month}-${year}`;
  };

  return (
    <div className="text-black bg-white w-full">
      <h1 className="text-center text-xl md:text-2xl font-bold tracking-widest mb-6 border-b-2 border-black pb-2">BERITA ACARA</h1>

      <div className="grid grid-cols-1 md:grid-cols-[150px_1fr] gap-y-2 md:gap-y-2 mb-6 items-start md:items-center">
        <label className="font-semibold uppercase text-xs md:text-sm">Kode / Nama Toko</label>
        <div className="flex items-center gap-2 w-full">
          <span className="hidden md:inline">:</span>
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              name="kodeToko"
              value={data.kodeToko}
              onChange={onChange}
              placeholder="Kode"
              className="w-16 md:w-20 border-b border-black outline-none bg-transparent placeholder-gray-300 uppercase font-medium text-sm md:text-base"
            />
            <span className="text-gray-400">/</span>
            <input
              type="text"
              name="namaToko"
              value={data.namaToko}
              onChange={onChange}
              placeholder="Nama Toko"
              className="flex-1 border-b border-black outline-none bg-transparent placeholder-gray-300 font-medium text-sm md:text-base"
            />
          </div>
        </div>

        <label className="font-semibold uppercase text-xs md:text-sm mt-2 md:mt-0">Nama Personil</label>
        <div className="flex items-center gap-2 w-full">
          <span className="hidden md:inline">:</span>
          <input
            type="text"
            name="namaPersonil"
            value={data.namaPersonil}
            onChange={onChange}
            placeholder="........................................"
            className="flex-1 border-b border-black outline-none bg-transparent font-medium text-sm md:text-base"
          />
        </div>

        <label className="font-semibold uppercase text-xs md:text-sm mt-2 md:mt-0">NIK</label>
        <div className="flex items-center gap-2 w-full">
          <span className="hidden md:inline">:</span>
          <input
            type="text"
            name="nik"
            value={data.nik}
            onChange={onChange}
            placeholder="........................................"
            className="flex-1 border-b border-black outline-none bg-transparent font-medium text-sm md:text-base"
          />
        </div>

        <label className="font-semibold uppercase text-xs md:text-sm mt-2 md:mt-0">Jabatan</label>
        <div className="flex items-center gap-2 w-full">
          <span className="hidden md:inline">:</span>
          <select
            name="jabatan"
            value={data.jabatan}
            onChange={onChange}
            className="flex-1 border-b border-black outline-none bg-transparent cursor-pointer appearance-none font-medium text-sm md:text-base"
          >
            <option value="">-- Pilih Jabatan --</option>
            <option value="Chief of Store">Chief of Store</option>
            <option value="Store Senior Leader">Store Senior Leader</option>
            <option value="Store Junior Leader">Store Junior Leader</option>
          </select>
        </div>
      </div>

      <div className="mb-4 leading-relaxed text-sm md:text-base">
        <div className="flex flex-col md:flex-row md:items-center gap-2 mb-3">
          <span>Menerangkan pengajuan potong sales Variance Plus senilai : Rp.</span>
          <input
            type="text"
            name="nominal"
            value={data.nominal}
            onChange={handleNominalChange}
            placeholder="................................."
            className="border-b border-black outline-none w-full md:w-64 bg-transparent font-bold text-lg"
          />
        </div>

        <div className="flex items-center gap-2 mb-4">
          <span>tanggal varian:</span>
          <div className="relative group border-b border-black">
            <input
              type="date"
              name="tanggalVarian"
              value={data.tanggalVarian}
              onChange={onChange}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
            />
            <span className="inline-block py-1 min-w-[100px] font-medium">
              {formatDateDisplay(data.tanggalVarian) || 'dd-mm-yyyy'}
            </span>
          </div>
        </div>

        <p className="mb-1 font-semibold italic">Dengan kronologi sbb :</p>
        <textarea
          name="kronologi"
          value={data.kronologi}
          onChange={onChange}
          rows={5}
          placeholder="Tuliskan kronologi..."
          className="w-full p-3 border border-black outline-none resize-none bg-gray-50/50 mb-4 font-medium leading-relaxed"
        />

        <p className="italic">Demikian berita acara ini saya buat dengan sebenar benarnya, Terima kasih</p>
      </div>

      <div className="mt-8">
        {/* Lokasi, Tanggal dan Waktu */}
        <div className="mb-6 flex flex-wrap items-center gap-1 w-fit ml-auto md:ml-0 overflow-visible">
          <input
            type="text"
            name="lokasi"
            value={data.lokasi}
            onChange={onChange}
            className="w-32 outline-none border-none bg-transparent text-right font-medium leading-loose"
            placeholder="Lokasi"
          />
          <span className="font-medium">,</span>

          {/* Display Tanggal */}
          <div className="relative group flex items-center">
            <input
              type="date"
              name="tanggalDibuat"
              value={data.tanggalDibuat}
              onChange={onChange}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10"
            />
            <span className="inline-block px-2 min-w-[100px] font-medium leading-loose">
              {formatDateDisplay(data.tanggalDibuat) || 'dd-mm-yyyy'}
            </span>
          </div>
        </div>

        {/* Signature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-10 gap-x-4 text-center text-xs font-bold">
          {/* Row 1 */}
          <div className="flex flex-col items-center">
            <span className="mb-2">Dibuat</span>
            <div
              className="relative w-40 h-24 border border-black flex items-center justify-center bg-white shadow-inner cursor-pointer hover:bg-gray-50 transition-colors signature-box"
              onClick={openSignatureModal}
            >
              {signatureDataUrl ? (
                <img src={signatureDataUrl} alt="Signature" className="w-full h-full object-contain" />
              ) : (
                <>
                  <SignatureCanvas
                    ref={signatureRef}
                    penColor="black"
                    canvasProps={{ width: 160, height: 96, className: 'sigCanvas pointer-events-none' }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-[10px] pointer-events-none">
                    Ketuk untuk TTD
                  </div>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={clearSignature}
              data-html2canvas-ignore="true"
              className="no-print mt-2 bg-red-100 text-red-700 px-3 py-1 rounded text-[10px] hover:bg-red-200 transition-colors whitespace-nowrap font-semibold border border-red-200"
            >
              Hapus TTD
            </button>
            <div className="mt-4 flex flex-col items-center">
              <span className="uppercase text-[10px] underline decoration-dotted underline-offset-4 font-bold">
                ({data.namaPersonil || '................................'})
              </span>
              <span className="text-[9px] font-normal uppercase mt-1 text-gray-600 italic">
                {data.jabatan || 'Jabatan'}
              </span>
            </div>
          </div>

          <div className="hidden md:flex flex-col items-center">
            <span className="mb-2">Disetujui</span>
            <div className="w-40 h-24 flex items-end">
              <div className="w-full border-t border-black pb-1"></div>
            </div>
            <span className="mt-1 uppercase">(Area Supervisor)</span>
          </div>

          <div className="hidden md:flex flex-col items-center">
            <span className="mb-2">Disetujui</span>
            <div className="w-40 h-24 flex items-end">
              <div className="w-full border-t border-black pb-1"></div>
            </div>
            <span className="mt-1 uppercase">(Area Manager)</span>
          </div>

          {/* Row 2 */}
          <div className="hidden md:flex flex-col items-center">
            <span className="mb-2">Diketahui</span>
            <div className="w-40 h-24 flex items-end">
              <div className="w-full border-t border-black pb-1"></div>
            </div>
            <span className="mt-1 uppercase">(DBM ADM / BM)</span>
          </div>

          <div className="hidden md:flex flex-col items-center">
            <span className="mb-2">Diketahui</span>
            <div className="w-40 h-24 flex items-end">
              <div className="w-full border-t border-black pb-1"></div>
            </div>
            <span className="mt-1 uppercase">(EDP MANAGER)</span>
          </div>

          <div className="hidden md:flex flex-col items-center">
            <span className="mb-2">Diketahui</span>
            <div className="w-40 h-24 flex items-end">
              <div className="w-full border-t border-black pb-1"></div>
            </div>
            <span className="mt-1 uppercase">(OFFICE MANAGER)</span>
          </div>
        </div>
      </div>

      <div className="mt-20 text-center md:text-right opacity-30 text-[8px] no-print italic" data-html2canvas-ignore="true">
        <a href="https://instagram.com/markusprap" target="_blank" rel="noopener noreferrer" className="hover:opacity-100 transition-opacity">
          Made with ☕ by Programmer Gen Z
        </a>
      </div>

      {/* Signature Modal */}
      {showSignatureModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">Tanda Tangan</h3>
              <button
                onClick={closeSignatureModal}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            {/* Signature Canvas */}
            <div className="p-6 bg-gray-50">
              <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden">
                <SignatureCanvas
                  ref={modalSignatureRef}
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

            {/* Modal Footer */}
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-gray-200">
              <button
                onClick={clearModalSignature}
                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-semibold transition-all hover:bg-red-200 border border-red-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Hapus
              </button>
              <button
                onClick={saveSignature}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all shadow-md active:scale-95"
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
    </div>
  );
};

export default BeritaAcaraForm;

