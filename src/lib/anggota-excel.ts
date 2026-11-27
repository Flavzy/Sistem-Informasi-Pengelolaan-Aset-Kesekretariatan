import { z } from "zod";
import type { AnggotaRow } from "../types/database";

export const anggotaSchema = z.object({
  npm: z.string().trim().min(3, "NPM minimal 3 karakter"),
  nama_lengkap: z.string().trim().min(2, "Nama lengkap minimal 2 karakter"),
  angkatan: z.string().trim().min(2, "Angkatan wajib diisi"),
  divisi: z.string().trim().min(2, "Divisi wajib diisi"),
  jabatan: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => v || null),
  no_hp: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => v || null),
  status: z.enum(["aktif", "nonaktif"] as const, {
    errorMap: () => ({ message: "Status harus 'aktif' atau 'nonaktif'" }),
  }),
});

export type AnggotaImportInput = z.infer<typeof anggotaSchema>;

type AnggotaExportSource = Pick<
  AnggotaRow,
  "npm" | "nama_lengkap" | "angkatan" | "divisi" | "jabatan" | "no_hp" | "status"
>;

const HEADER_ALIASES: Record<string, keyof AnggotaImportInput> = {
  npm: "npm",
  nim: "npm",
  nama_lengkap: "nama_lengkap",
  nama: "nama_lengkap",
  nama_anggota: "nama_lengkap",
  angkatan: "angkatan",
  tahun_angkatan: "angkatan",
  tahun: "angkatan",
  divisi: "divisi",
  bidang: "divisi",
  departemen: "divisi",
  jabatan: "jabatan",
  posisi: "jabatan",
  no_hp: "no_hp",
  no_wa: "no_hp",
  whatsapp: "no_hp",
  hp: "no_hp",
  telepon: "no_hp",
  no_telepon: "no_hp",
  telp: "no_hp",
  kontak: "no_hp",
  status: "status",
};

const REQUIRED_FIELDS: (keyof AnggotaImportInput)[] = [
  "npm",
  "nama_lengkap",
  "angkatan",
  "divisi",
];

function normalizeHeader(cell: unknown): string {
  return String(cell ?? "")
    .replace(/\(.*?\)/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s._-]+/g, "_")
    .replace(/^_|_$/g, "");
}

/**
 * Mengubah baris mentah hasil bacaan sheet Excel menjadi array data anggota tervalidasi.
 */
export function parseAnggotaSheetRows(rawRows: unknown[][]): {
  rows: AnggotaImportInput[];
  errors: string[];
} {
  const headerIndex = rawRows.findIndex(
    (row) => Array.isArray(row) && row.some((cell) => String(cell ?? "").trim() !== "")
  );

  if (headerIndex === -1) {
    return { rows: [], errors: ["File Excel kosong atau tidak memiliki data."] };
  }

  const colIndex: Partial<Record<keyof AnggotaImportInput, number>> = {};
  rawRows[headerIndex].forEach((cell, idx) => {
    const field = HEADER_ALIASES[normalizeHeader(cell)];
    if (field && colIndex[field] === undefined) {
      colIndex[field] = idx;
    }
  });

  const missing = REQUIRED_FIELDS.filter((f) => colIndex[f] === undefined);
  if (missing.length > 0) {
    return {
      rows: [],
      errors: [
        `Kolom wajib tidak ditemukan: ${missing.join(", ")}. Pastikan baris header berisi: NPM, Nama Lengkap, Angkatan, Divisi.`,
      ],
    };
  }

  const rows: AnggotaImportInput[] = [];
  const errors: string[] = [];
  const seenNpms = new Set<string>();

  for (let i = headerIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!Array.isArray(row)) continue;
    const isEmpty = row.every((c) => c === null || c === undefined || String(c).trim() === "");
    if (isEmpty) continue;

    const getCell = (field: keyof AnggotaImportInput) => {
      const idx = colIndex[field];
      const val = idx !== undefined ? row[idx] : undefined;
      return val === null || val === undefined ? "" : String(val).trim();
    };

    const rawStatus = getCell("status").toLowerCase();
    const status =
      rawStatus === ""
        ? "aktif"
        : rawStatus === "non-aktif" || rawStatus === "non aktif"
          ? "nonaktif"
          : rawStatus;

    const parsed = anggotaSchema.safeParse({
      npm: getCell("npm"),
      nama_lengkap: getCell("nama_lengkap"),
      angkatan: getCell("angkatan"),
      divisi: getCell("divisi"),
      jabatan: getCell("jabatan") || null,
      no_hp: getCell("no_hp") || null,
      status,
    });

    const excelRowNum = i + 1;
    if (!parsed.success) {
      errors.push(`Baris ${excelRowNum}: ${parsed.error.errors[0]?.message || "Data tidak valid"}`);
      continue;
    }

    if (seenNpms.has(parsed.data.npm)) {
      errors.push(`Baris ${excelRowNum}: NPM ${parsed.data.npm} duplikat di dalam file.`);
      continue;
    }

    seenNpms.add(parsed.data.npm);
    rows.push(parsed.data);
  }

  if (rows.length === 0 && errors.length === 0) {
    errors.push("Tidak ada baris data anggota di bawah header.");
  }

  return { rows, errors };
}

const ANGGOTA_COLUMNS = [
  { header: "NPM", width: 18, get: (a: AnggotaExportSource) => a.npm },
  { header: "Nama Lengkap", width: 28, get: (a: AnggotaExportSource) => a.nama_lengkap },
  { header: "Angkatan", width: 12, get: (a: AnggotaExportSource) => a.angkatan },
  { header: "Divisi", width: 20, get: (a: AnggotaExportSource) => a.divisi },
  { header: "Jabatan", width: 18, get: (a: AnggotaExportSource) => a.jabatan ?? "" },
  { header: "No HP", width: 18, get: (a: AnggotaExportSource) => a.no_hp ?? "" },
  { header: "Status", width: 12, get: (a: AnggotaExportSource) => a.status },
] as const;

export function buildAnggotaSheetData(rows: AnggotaExportSource[]) {
  const headerRow = ANGGOTA_COLUMNS.map((col) => ({
    value: col.header,
    fontWeight: "bold" as const,
    backgroundColor: "#f3f4f6",
  }));
  // Tipe String dipaksa agar NPM & No HP tidak diubah Excel menjadi notasi ilmiah atau angka tanpa 0 di depan.
  const dataRows = rows.map((item) =>
    ANGGOTA_COLUMNS.map((col) => ({
      type: String,
      value: col.get(item),
    }))
  );

  return {
    sheetData: [headerRow, ...dataRows],
    columns: ANGGOTA_COLUMNS.map((col) => ({ width: col.width })),
  };
}

async function saveAnggotaWorkbook(rows: AnggotaExportSource[], fileName: string) {
  const writeXlsxFile = (await import("write-excel-file/browser")).default;
  const { sheetData, columns } = buildAnggotaSheetData(rows);

  await writeXlsxFile(sheetData, {
    sheet: "Data Anggota",
    columns,
  }).toFile(fileName);
}

export async function exportAnggotaToExcel(anggotaList: AnggotaRow[]) {
  const today = new Date().toISOString().split("T")[0];
  await saveAnggotaWorkbook(anggotaList, `Data_Anggota_HIMA_${today}.xlsx`);
}

export async function downloadAnggotaTemplateExcel() {
  const sample: AnggotaExportSource[] = [
    {
      npm: "211001001",
      nama_lengkap: "Budi Santoso",
      angkatan: "2023",
      divisi: "PSDM",
      jabatan: "Anggota",
      no_hp: "081234567890",
      status: "aktif",
    },
  ];
  await saveAnggotaWorkbook(sample, "Template_Import_Anggota_HIMA.xlsx");
}
