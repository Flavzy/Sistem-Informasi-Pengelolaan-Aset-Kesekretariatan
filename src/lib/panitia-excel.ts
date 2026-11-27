import { z } from "zod";

export const panitiaSchema = z.object({
  npm: z.string().trim().min(3, "NPM minimal 3 karakter"),
  nama_lengkap: z.string().trim().min(2, "Nama minimal 2 karakter"),
  jabatan: z.string().trim().min(2, "Jabatan panitia wajib diisi"),
  divisi: z.string().trim().min(2, "Divisi panitia wajib diisi"),
});

export type PanitiaImportInput = z.infer<typeof panitiaSchema>;

const HEADER_ALIASES: Record<string, keyof PanitiaImportInput> = {
  npm: "npm",
  nim: "npm",
  no_pokok: "npm",
  nomor_pokok_mahasiswa: "npm",
  nama: "nama_lengkap",
  nama_lengkap: "nama_lengkap",
  nama_panitia: "nama_lengkap",
  nama_anggota: "nama_lengkap",
  jabatan: "jabatan",
  posisi: "jabatan",
  peran: "jabatan",
  role: "jabatan",
  jabatan_panitia: "jabatan",
  divisi: "divisi",
  bidang: "divisi",
  sie: "divisi",
  seksi: "divisi",
  departemen: "divisi",
  divisi_panitia: "divisi",
};

const REQUIRED_FIELDS: (keyof PanitiaImportInput)[] = [
  "npm",
  "nama_lengkap",
  "jabatan",
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
 * Mengubah baris mentah hasil bacaan sheet Excel menjadi daftar panitia kegiatan tervalidasi.
 */
export function parsePanitiaSheetRows(rawRows: unknown[][]): {
  rows: PanitiaImportInput[];
  errors: string[];
} {
  const headerIndex = rawRows.findIndex(
    (row) => Array.isArray(row) && row.some((cell) => String(cell ?? "").trim() !== "")
  );

  if (headerIndex === -1) {
    return { rows: [], errors: ["File Excel kosong atau tidak memiliki data."] };
  }

  const colIndex: Partial<Record<keyof PanitiaImportInput, number>> = {};
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
        `Kolom wajib tidak ditemukan: ${missing.join(", ")}. Pastikan header berisi: NPM, Nama, Jabatan, Divisi.`,
      ],
    };
  }

  const rows: PanitiaImportInput[] = [];
  const errors: string[] = [];
  const seenNpms = new Set<string>();

  for (let i = headerIndex + 1; i < rawRows.length; i++) {
    const row = rawRows[i];
    if (!Array.isArray(row)) continue;
    const isEmpty = row.every((c) => c === null || c === undefined || String(c).trim() === "");
    if (isEmpty) continue;

    const getCell = (field: keyof PanitiaImportInput) => {
      const idx = colIndex[field];
      const val = idx !== undefined ? row[idx] : undefined;
      return val === null || val === undefined ? "" : String(val).trim();
    };

    const parsed = panitiaSchema.safeParse({
      npm: getCell("npm"),
      nama_lengkap: getCell("nama_lengkap"),
      jabatan: getCell("jabatan"),
      divisi: getCell("divisi"),
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
    errors.push("Tidak ada baris data panitia di bawah header.");
  }

  return { rows, errors };
}

const PANITIA_COLUMNS = [
  { header: "NPM", width: 18, get: (p: PanitiaImportInput) => p.npm },
  { header: "Nama", width: 28, get: (p: PanitiaImportInput) => p.nama_lengkap },
  { header: "Jabatan", width: 24, get: (p: PanitiaImportInput) => p.jabatan },
  { header: "Divisi", width: 22, get: (p: PanitiaImportInput) => p.divisi },
] as const;

export function buildPanitiaSheetData(rows: PanitiaImportInput[]) {
  const headerRow = PANITIA_COLUMNS.map((col) => ({
    value: col.header,
    fontWeight: "bold" as const,
    backgroundColor: "#f3f4f6",
  }));

  // Tipe String dipaksa agar NPM tidak diubah Excel menjadi notasi ilmiah atau kehilangan 0 di depan.
  const dataRows = rows.map((item) =>
    PANITIA_COLUMNS.map((col) => ({
      type: String,
      value: col.get(item),
    }))
  );

  return {
    sheetData: [headerRow, ...dataRows],
    columns: PANITIA_COLUMNS.map((col) => ({ width: col.width })),
  };
}

export async function downloadPanitiaTemplateExcel() {
  const writeXlsxFile = (await import("write-excel-file/browser")).default;
  const sample: PanitiaImportInput[] = [
    {
      npm: "211001001",
      nama_lengkap: "Budi Santoso",
      jabatan: "Ketua Pelaksana",
      divisi: "Inti",
    },
    {
      npm: "211001002",
      nama_lengkap: "Siti Aminah",
      jabatan: "Sekretaris Pelaksana",
      divisi: "Inti",
    },
    {
      npm: "211001003",
      nama_lengkap: "Andi Wijaya",
      jabatan: "CO Acara",
      divisi: "Acara",
    },
    {
      npm: "211001004",
      nama_lengkap: "Rina Kusuma",
      jabatan: "Anggota Acara",
      divisi: "Acara",
    },
    {
      npm: "211001005",
      nama_lengkap: "Dedi Pratama",
      jabatan: "CO Keamanan",
      divisi: "Keamanan",
    },
  ];

  const { sheetData, columns } = buildPanitiaSheetData(sample);
  await writeXlsxFile(sheetData, {
    sheet: "Panitia Kegiatan",
    columns,
  }).toFile("Template_Import_Panitia_Kegiatan.xlsx");
}
