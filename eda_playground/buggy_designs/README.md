# Buggy Design Files for EDA Playground

These files are intentionally incorrect. Use them one at a time to prove that
the testbench, scoreboard, and assertions can catch common FIFO mistakes.

## How To Use

1. First run the clean files:
   - `eda_playground/design.sv`
   - `eda_playground/testbench.sv`
   - `eda_playground/assert_fifo_ram.sv`
2. Confirm clean result has zero errors.
3. Pick one buggy file from this folder.
4. Copy the whole buggy file into EDA Playground's `design.sv` tab.
5. Keep `testbench.sv` and `assert_fifo_ram.sv` the same.
6. Run simulation.
7. Capture the transcript failure and EPWave waveform.
8. Restore the clean `design.sv` before trying the next issue.

## Files

- `design_issue1_reset_count_not_cleared.sv`
  - Bug: reset loads `fifo_count` with `1` instead of `0`.
  - Expected: reset-state assertion failure.

- `design_issue2_read_while_empty.sv`
  - Bug: `do_read` ignores `empty`.
  - Expected: read while empty / underflow failure.

- `design_issue3_full_flag_early.sv`
  - Bug: `full` asserts when `fifo_count == 1`.
  - Expected: full flag/count mismatch.

- `design_issue4_empty_flag_early.sv`
  - Bug: `empty` asserts at count `1`.
  - Expected: empty flag/count mismatch.

- `design_issue5_read_pointer_stuck.sv`
  - Bug: `rd_ptr` does not increment.
  - Expected: read pointer assertion failure and possible scoreboard mismatch.

Use this wording in your report:

> Intentional faults were inserted one at a time into copied FIFO RTL files.
> The clean design passed, while each faulty design produced assertion or
> scoreboard failures. This demonstrates that the verification environment can
> detect overflow, underflow, flag, pointer, and data-order issues.
