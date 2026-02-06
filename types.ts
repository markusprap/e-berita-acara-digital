
export interface BeritaAcaraData {
  kodeToko: string;
  namaToko: string;
  namaPersonil: string;
  nik: string;
  jabatan: string;
  nominal: string;
  tanggalVarian: string;
  kronologi: string;
  lokasi: string;
  tanggalDibuat: string;
  waktuDibuat: string;
}

export interface Attachment {
  id: string;
  url: string;
  file: File;
}