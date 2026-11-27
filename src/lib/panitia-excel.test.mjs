import test from "node:test";
import assert from "node:assert/strict";
import writeXlsxFile from "write-excel-file/node";
import { readSheet } from "read-excel-file/node";
import { buildPanitiaSheetData, parsePanitiaSheetRows } from "./panitia-excel.ts";

test("parsePanitiaSheetRows handles header aliases, numbers, and blank rows", () => {
  const raw = [
    [null, null],
    ["No.", "NIM", "Nama", "Jabatan", "Bidang"],
    [1, 211001001, "Budi Santoso", "Ketua Pelaksana", "Inti"],
    [2, "0211001002", "Siti Aminah", "CO Acara", "Acara"],
    [null, null, null, null, null],
  ];

  const { rows, errors } = parsePanitiaSheetRows(raw);
  assert.deepEqual(errors, []);
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    npm: "211001001",
    nama_lengkap: "Budi Santoso",
    jabatan: "Ketua Pelaksana",
    divisi: "Inti",
  });
  assert.equal(rows[1].npm, "0211001002");
});

test("parsePanitiaSheetRows rejects missing columns, empty role/divisi, and duplicate NPM", () => {
  const missingCols = parsePanitiaSheetRows([
    ["NPM", "Nama"],
    ["211001001", "Budi"],
  ]);
  assert.equal(missingCols.rows.length, 0);
  assert.match(missingCols.errors[0], /Kolom wajib tidak ditemukan/);

  const badRows = parsePanitiaSheetRows([
    ["NPM", "Nama", "Jabatan", "Divisi"],
    ["211001001", "Ani", "CO Acara", "Acara"],
    ["211001001", "Ani Duplikat", "Anggota", "Keamanan"],
    ["211001003", "Cici", "", "Keamanan"],
  ]);
  assert.equal(badRows.rows.length, 1);
  assert.equal(badRows.errors.length, 2);
  assert.match(badRows.errors[0], /Baris 3: NPM 211001001 duplikat/);
  assert.match(badRows.errors[1], /Baris 4: Jabatan panitia wajib diisi/);
});

test("round-trip export and import .xlsx preserves NPM, jabatan, and divisi", async () => {
  const sample = [
    {
      npm: "0812001001",
      nama_lengkap: "Rizky Pratama",
      jabatan: "CO Keamanan",
      divisi: "Keamanan",
    },
  ];

  const { sheetData, columns } = buildPanitiaSheetData(sample);
  const buffer = await writeXlsxFile(sheetData, {
    sheet: "Panitia Kegiatan",
    columns,
  }).toBuffer();
  const sheetRows = await readSheet(buffer);
  const { rows, errors } = parsePanitiaSheetRows(sheetRows);

  assert.deepEqual(errors, []);
  assert.deepEqual(rows, sample);
});
