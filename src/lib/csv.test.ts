import assert from "node:assert/strict";
import { test } from "node:test";

import { parseCsv, toCsv } from "./csv";

test("csv: neutralizes spreadsheet formula prefixes", () => {
  const csv = toCsv(
    [
      { name: "=SUM(A1:A2)" },
      { name: "+39 333 1234567" },
      { name: "-not-a-number" },
      { name: "@user" },
    ],
    ["name"]
  );
  const rows = parseCsv(csv);
  assert.equal(rows[0].name, "'=SUM(A1:A2)");
  assert.equal(rows[1].name, "'+39 333 1234567");
  assert.equal(rows[2].name, "'-not-a-number");
  assert.equal(rows[3].name, "'@user");
});

test("csv: quotes commas, quotes and newlines without losing the value", () => {
  const value = 'Via Roma, 1 "centro"\nseconda riga';
  const csv = toCsv([{ address: value }], ["address"]);
  assert.match(csv, /^address\n"/);
  const rows = parseCsv(csv);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].address, value);
});

test("csv: ignores empty trailing rows and trims headers", () => {
  const rows = parseCsv(" name , city \r\nMario, Milano\r\n\r\n");
  assert.deepEqual(rows, [{ name: "Mario", city: "Milano" }]);
});
