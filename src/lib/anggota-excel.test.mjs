import test from "node:test";
import assert from "node:assert/strict";
import writeXlsxFile from "write-excel-file/node";
import { readSheet } from "read-excel-file/node";
import { buildAnggotaSheetData, parseAnggotaSheetRows } from "./anggota-excel.ts";

test("parseAnggotaSheetRows handles header aliases, numbers, and blank rows", () => {
  const raw = [
    [null, null],
    ["No.", "NIM", "Nama", "Tahun", "Bidang", "No. HP", "Status"],
    [1, 211001001, "Siti Aminah", 2023, "PSDM", "08123456789", "Non-Aktif"],
    [2, "211001002", "Budi", "2024", "Kominfo", null, null],
    [null, null, null, null, null, null, null],
  ];

  const { rows, errors } = parseAnggotaSheetRows(raw);
  assert.deepEqual(errors, []);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    npm: "211001001",
    nama_lengkap: "Siti Aminah",
    angkatan: "2023",
    divisi: "PSDM",
    jabatan: null,
    no_hp: "08123456789",
    status: "nonaktif",
  });
  assert.equal(rows[1].status, "aktif");
});

test("parseAnggotaSheetRows rejects missing columns, duplicates, and invalid rows", () => {
  const missingCols = parseAnggotaSheetRows([["NPM", "Nama"], ["123", "A"]]);
  assert.equal(missingCols.rows.length, 0);
  assert.match(missingCols.errors[0], /Kolom wajib tidak ditemukan/);

  const badRows = parseAnggotaSheetRows([
    ["NPM", "Nama Lengkap", "Angkatan", "Divisi", "Status"],
    ["211001001", "Ani", "2023", "PSDM", "aktif"],
    ["211001001", "Ani Duplikat", "2023", "PSDM", "aktif"],
    ["211001003", "Cici", "2023", "PSDM", "lulus"],
  ]);
  assert.equal(badRows.rows.length, 1);
  assert.equal(badRows.errors.length, 2);
  assert.match(badRows.errors[0], /Baris 3: NPM 211001001 duplikat/);
  assert.match(badRows.errors[1], /Baris 4: Status harus 'aktif' atau 'nonaktif'/);
});

test("round-trip export and import .xlsx preserves NPM and leading-zero No HP", async () => {
  const sample = [
    {
      npm: "211001099",
      nama_lengkap: "Rizky Pratama",
      angkatan: "2023",
      divisi: "Humas",
      jabatan: "Sekretaris",
      no_hp: "081298765432",
      status: "aktif",
    },
  ];

  const { sheetData, columns } = buildAnggotaSheetData(sample);
  const buffer = await writeXlsxFile(sheetData, { sheet: "Data Anggota", columns }).toBuffer();
  const sheetRows = await readSheet(buffer);
  const { rows, errors } = parseAnggotaSheetRows(sheetRows);

  assert.deepEqual(errors, []);
  assert.deepEqual(rows, sample);
});
