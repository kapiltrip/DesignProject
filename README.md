# Assertion-Based Verification of a Synchronous FIFO

This project verifies a parameterized synchronous FIFO in SystemVerilog. It
contains clean RTL, a class-based verification environment, bind-based
SystemVerilog Assertions, EDA Playground-ready files, and documented negative
tests that show the checkers catching real FIFO bugs.

## What Is Verified

The main DUT is `sync_fifo_ram`, a FIFO controller connected to a separate
synchronous RAM. The testbench drives randomized read/write traffic and checks
FIFO ordering with a scoreboard. The assertion module is bound into the DUT and
checks internal state directly.

The assertions cover:

- reset state: pointers clear, count clears, `empty` is high, `full` is low
- flag correctness: `full == (fifo_count == DEPTH)`, `empty == (fifo_count == 0)`
- count range: `fifo_count` never exceeds the FIFO depth
- accepted-operation gating: no read while empty, no write while full
- pointer/count updates for write-only, read-only, read/write, and idle cycles
- unknown-value checks on control, state, and read data after accepted reads

## Repository Layout

| Path | Purpose |
| --- | --- |
| `rtl/sync_fifo.sv` | Simple FIFO with internal memory. |
| `rtl/sync_ram.sv` | Separate synchronous RAM. |
| `rtl/sync_fifo_ram.sv` | Main FIFO DUT using `sync_ram`. |
| `tb/fifo_tb.sv` | Top-level local testbench. |
| `tb/*.svh` | Interface and class-based generator, driver, monitor, scoreboard, and environment. |
| `tb/assert_fifo_ram.sv` | Assertions bound to `sync_fifo_ram`. |
| `sim/files.f` | Questa/ModelSim compile file list. |
| `sim/run_questa.do` | Questa/ModelSim script for `sync_fifo_ram`. |
| `sim/run_questa_simple_fifo.do` | Questa/ModelSim script for the simple FIFO. |
| `eda_playground/design.sv` | Combined RTL file for EDA Playground. |
| `eda_playground/testbench.sv` | Combined verification file for EDA Playground. |
| `eda_playground/assert_fifo_ram.sv` | Third EDA Playground file containing assertions. |
| `eda_playground/buggy_designs/` | Intentional faulty RTL variants for negative testing. |
| `docs/findings.md` | Detailed write-up of the negative-test results. |
| `docs/fifo_common_issues.md` | Common FIFO bugs and expected checker failures. |
| `images/` | Waveform and transcript screenshots used as evidence. |

## Run Locally

Use a simulator with full SystemVerilog verification support, such as
Questa/ModelSim, VCS, or Xcelium. The testbench uses classes, mailboxes,
randomization, virtual interfaces, assertions, and `bind`.

For Questa/ModelSim:

```tcl
cd sim
vsim -do run_questa.do
```

To run the simple internal-memory FIFO instead:

```tcl
cd sim
vsim -do run_questa_simple_fifo.do
```

A clean run should compile the RTL, testbench, and assertion module, then finish
with a scoreboard error count of zero. The simulation also writes `dump.vcd`.

## Run on EDA Playground

Create three files in EDA Playground:

1. `design.sv`: paste `eda_playground/design.sv`
2. `testbench.sv`: paste `eda_playground/testbench.sv`
3. `assert_fifo_ram.sv`: create a third file with the `+` button and paste
   `eda_playground/assert_fifo_ram.sv`

Use a simulator that supports SystemVerilog assertions and bind statements. Run
the clean design first and confirm that the scoreboard reports zero errors.

## Negative Testing

The folder `eda_playground/buggy_designs/` contains five intentionally broken
versions of `design.sv`. Use them one at a time:

1. Run the clean EDA Playground setup.
2. Replace only the `design.sv` tab with one buggy design file.
3. Keep `testbench.sv` and `assert_fifo_ram.sv` unchanged.
4. Rerun the simulation and capture the transcript and EPWave evidence.
5. Restore the clean `design.sv` before trying the next bug.

The documented issues include reset count not cleared, read accepted while
empty, full flag asserted too early, empty flag asserted at the wrong count, and
read pointer stuck. The expected assertion and scoreboard failures are explained
in `docs/findings.md`.

## Pass Criteria

The final clean project is considered passing when:

- the RTL and testbench compile without errors
- no assertion failures are reported
- the scoreboard completes with `Error Count :0`
- the negative-test designs produce the expected assertion or scoreboard
  failures
