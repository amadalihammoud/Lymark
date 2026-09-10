import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { clockFromDate } from "./datetime.ts";

describe("clockFromDate", () => {
  it("formata a captura no locale pt-BR", () => {
    const clock = clockFromDate(new Date("2026-03-18T07:42:00"));
    assert.equal(clock.time, "07:42");
    assert.match(clock.date, /18/);
    assert.match(clock.date, /2026/);
    assert.ok(clock.weekday.length >= 3);
  });
});
