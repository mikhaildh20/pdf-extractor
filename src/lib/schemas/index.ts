import { z } from "zod";
import type { DocType } from "../detect/detectDocType";

const text = z.string().min(1);
const date = text.regex(/^\d{4}-\d{2}-\d{2}$/);
const amount = z.number().int().safe().nonnegative();
const row = z.object({ tanggal: date, no_ref: text, keterangan: text, debit: amount, kredit: amount, saldo: amount.optional() });

export const schemas: Record<DocType, z.ZodTypeAny> = {
  bukti_setoran: z.object({
    no_referensi: text, tanggal: date, no_anggota: text, nama_anggota: text, jenis_simpanan: text,
    nominal: amount.positive(), metode_pembayaran: text.optional(), bank_pengirim: text.optional(), status: text,
  }),
  rekap_mutasi: z.object({
    no_anggota: text, nama_anggota: text, periode_awal: date, periode_akhir: date, saldo_awal: amount,
    mutasi: z.array(row).min(1), total_debit: amount, total_kredit: amount, saldo_akhir_tertulis: amount,
  }),
  slip_potongan: z.object({
    nik: text, nama: text, departemen: text, periode_gaji: text.regex(/^\d{4}-(0[1-9]|1[0-2])$/),
    no_anggota: text, potongan: z.array(z.object({ komponen: text, jumlah: amount })).min(1), total_potongan: amount,
  }),
};
