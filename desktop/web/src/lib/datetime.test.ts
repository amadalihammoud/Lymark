import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clockFromDate } from "./datetime.ts";

describe("clockFromDate", () => {
  it("usa as tabelas do calendário, não o Intl", () => {
    const clock = clockFromDate(new Date("2026-03-18T07:42:00"), "pt");
    assert.equal(clock.time, "07:42");
    assert.equal(clock.date, "18 mar. 2026");
    assert.equal(clock.weekday, "Qua");
  });

  it("troca mês e dia da semana com o idioma", () => {
    const en = clockFromDate(new Date("2026-03-18T07:42:00"), "en");
    assert.equal(en.date, "18 Mar 2026");
    assert.equal(en.weekday, "Wed");

    const de = clockFromDate(new Date("2026-03-18T07:42:00"), "de");
    assert.equal(de.date, "18. März 2026");
    assert.equal(de.weekday, "Mi");
  });
});
