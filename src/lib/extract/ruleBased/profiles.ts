import type { DocType } from "../../detect/detectDocType";

export type FieldRule = {
  key: string;
  labels: RegExp[];
  type: "string" | "money" | "date" | "month";
  required: boolean;
};

export const profiles: Record<DocType, FieldRule[]> = {
  bukti_setoran: [
    { key: "no_referensi", labels: [/^No\. Referensi$/i], type: "string", required: true },
    { key: "tanggal", labels: [/^Tanggal(?: Transaksi)?$/i], type: "date", required: true },
    { key: "no_anggota", labels: [/^No\. Anggota$/i], type: "string", required: true },
    { key: "nama_anggota", labels: [/^Nama Anggota$/i], type: "string", required: true },
    { key: "jenis_simpanan", labels: [/^Jenis Simpanan$/i], type: "string", required: true },
    { key: "nominal", labels: [/^Nominal Setoran$/i], type: "money", required: true },
    { key: "metode_pembayaran", labels: [/^Metode Pembayaran$/i], type: "string", required: false },
    { key: "bank_pengirim", labels: [/^Bank Pengirim$/i], type: "string", required: false },
    { key: "status", labels: [/^Status$/i], type: "string", required: true },
  ],
  rekap_mutasi: [
    { key: "no_anggota", labels: [/^No\. Anggota$/i], type: "string", required: true },
    { key: "nama_anggota", labels: [/^Nama Anggota$/i], type: "string", required: true },
  ],
  slip_potongan: [
    { key: "nik", labels: [/^NIK$/i], type: "string", required: true },
    { key: "nama", labels: [/^Nama$/i], type: "string", required: true },
    { key: "departemen", labels: [/^Departemen$/i], type: "string", required: true },
    { key: "periode_gaji", labels: [/^Periode Gaji$/i], type: "month", required: true },
    { key: "no_anggota", labels: [/^No\. Anggota(?: Koperasi)?$/i], type: "string", required: true },
  ],
};
