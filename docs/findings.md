# FIFO Verification Findings

This file discusses the completed negative-test issues. Each issue uses two
main pieces of evidence: the EPWave waveform screenshot and the simulation log
screenshot.

## Issue 1: Reset Count Not Cleared

Evidence files:

- Waveform: `images/issue1/Screenshot 2026-05-04 125730.png`
- Log: `images/issue1/Screenshot 2026-05-04 130009.png`
- Buggy design used: `eda_playground/buggy_designs/design_issue1_reset_count_not_cleared.sv`

Bug inserted in `sync_fifo_ram` reset block:

```systemverilog
fifo_count <= 1;
```

Correct behavior:

```systemverilog
fifo_count <= {(AW+1){1'b0}};
```

### Expected Behavior

During reset, the FIFO should return to a known empty state:

- `fifo_count = 0`
- `wr_ptr = 0`
- `rd_ptr = 0`
- `empty = 1`
- `full = 0`

This is important because the FIFO status flags are generated from `fifo_count`.
If the count is wrong after reset, the FIFO can incorrectly allow reads or block
writes.

### Waveform Discussion

In the Issue 1 EPWave screenshot, the reset period is visible near the start of
simulation. EPWave is showing time in picoseconds, so `30000 ps` means `30 ns`.

The main time window to check is approximately:

```text
0 ps to 120000 ps
```

This is the reset part of the simulation. The log reports assertion failures at:

```text
30000 ps, 50000 ps, 70000 ps, 90000 ps, 110000 ps
```

These correspond to:

```text
30 ns, 50 ns, 70 ns, 90 ns, 110 ns
```

The waveform shows that while `rst` is active, `fifo_count[4:0]` becomes `1`
instead of `0`. Because the design calculates:

```systemverilog
assign empty = (fifo_count == 0);
```

the `empty` signal stays low. This is incorrect because a reset FIFO should be
empty. The waveform therefore shows the actual design problem clearly:

- reset is active
- `fifo_count` is not cleared
- `empty` is incorrect
- `wr_ptr` and `rd_ptr` are still reset correctly

So the bug is specifically in the count reset behavior, not in the pointer reset
behavior.

### Time-Period Explanation

The important reset behavior can be explained as follows:

- Around `0 ps` to `90000 ps`, reset is active.
- During this time, `wr_ptr` and `rd_ptr` are reset to `0`.
- However, `fifo_count` is incorrectly forced to `1`.
- Since `empty` depends on `fifo_count == 0`, `empty` becomes `0`.
- This is why the FIFO looks non-empty immediately after reset.
- The assertion reports the reset failure on multiple clock edges because reset
  is held active for multiple cycles.

In the waveform, the reason to look at this early time window is that reset
bugs must be checked before normal write/read traffic starts. If the FIFO starts
from the wrong state, later data mismatches can happen even if the write and
read pointer logic appears correct.

### Assertion Result

The assertion module was active because the compile log shows:

```text
-- Compiling module assert_fifo_ram
-- Loading module assert_fifo_ram
```

The failing assertion was:

```text
[ASSERT FAIL] Reset state incorrect
```

It failed at:

- `30 ns`
- `50 ns`
- `70 ns`
- `90 ns`
- `110 ns`

Multiple failures are expected here because reset is held high for several clock
cycles. The assertion checks the reset state on each clock cycle, so it reports
the same reset bug more than once.

### Log Discussion

The log first reports the reset assertion failures. Later, the scoreboard also
reports:

```text
[SCO] : SCOREBOARD QUEUE EMPTY
[SCO] : DATA MISMATCH expected:7 actual:8
```

This happens because the incorrect reset count makes the FIFO appear non-empty
when it should be empty. As a result, the testbench can observe read behavior
from an invalid FIFO state. That leads to invalid read data and later data order
problems.

### Conclusion for Report

Issue 1 proves that the reset logic is critical for FIFO correctness. A single
incorrect reset assignment for `fifo_count` causes the `empty` flag to be wrong,
which then affects read behavior and data checking. The `RST_STATE` assertion
detects the bug immediately during reset, and the scoreboard later confirms that
the wrong reset state can create functional data errors.

## Issue 2: Read Accepted While FIFO Is Empty

Evidence files:

- Waveform: `images/issue2/Screenshot 2026-05-04 130622.png`
- Log part 1: `images/issue2/Screenshot 2026-05-04 130312.png`
- Log part 2: `images/issue2/Screenshot 2026-05-04 130318.png`
- Buggy design used: `eda_playground/buggy_designs/design_issue2_read_while_empty.sv`

Bug inserted in `sync_fifo_ram` read control:

```systemverilog
assign do_read = rd_en;
```

Correct behavior:

```systemverilog
assign do_read = rd_en && !empty;
```

### Expected Behavior

When the FIFO is empty, a read request must not be accepted. The correct design
should block the internal read operation:

- if `empty = 1` and `rd_en = 1`, then `do_read` should remain `0`
- `rd_ptr` should not advance
- `fifo_count` should remain `0`
- `rd_data` should not be treated as valid FIFO data

This protects the FIFO from underflow.

### Waveform Discussion

The main time window to check is approximately:

```text
380000 ps to 500000 ps
```

This corresponds to:

```text
380 ns to 500 ns
```

In this region, the FIFO has already been drained. The waveform shows:

- `fifo_count[4:0] = 0`
- `empty = 1`
- `rd_en = 1`
- `do_read = 1`

The last point is the bug. Since the FIFO is empty, `do_read` should not become
active. Because the buggy design uses only `rd_en`, it accepts the read even
though no valid data is available.

After this invalid read, the waveform shows `fifo_count[4:0]` changing from:

```text
0 to 31
```

This is counter underflow. Because `fifo_count` is 5 bits wide, subtracting 1
from `0` wraps around to `31`. The waveform also shows `rd_ptr` advancing even
though the FIFO was empty. This proves that the design performed a read when it
should have ignored the read request.

### Time-Period Explanation

The important read-empty behavior can be explained as follows:

- Before `400000 ps`, the FIFO count decreases because valid reads are happening.
- Around `400000 ps`, `fifo_count` reaches `0`, so `empty` becomes `1`.
- A read request is then applied while the FIFO is empty.
- In the correct design, `do_read` should stay `0`.
- In the buggy design, `do_read` becomes `1`.
- This causes `rd_ptr` to increment and `fifo_count` to wrap from `0` to `31`.

This is the reason to focus the waveform screenshot around `380000 ps` to
`500000 ps`: it captures the exact transition from valid FIFO operation into
the underflow condition.

### Assertion Result

The log screenshot shows that the assertion module detected the issue:

```text
[ASSERT FAIL] Read accepted while empty at 470000
```

This means the assertion caught the exact condition where `empty = 1`,
`rd_en = 1`, and the design still allowed `do_read = 1`.

The log also reports:

```text
[ASSERT FAIL] rd_data unknown after read at 471000
```

This follows from the same bug. The FIFO attempted to read when no valid data
was available, so the output data became unknown/invalid.

After that, the log reports:

```text
[ASSERT FAIL] fifo_count out of range at 490000
[ASSERT FAIL] fifo_count out of range at 510000
[ASSERT FAIL] fifo_count out of range at 530000
```

This happens because `fifo_count` underflowed to `31`, which is outside the
valid FIFO count range of `0` to `16` for `AW = 4`.

### Log Discussion

The scoreboard initially reports successful data matches for valid reads. The
failure starts only when a read happens after the FIFO becomes empty. Later, the
scoreboard reports:

```text
[SCO] : DATA MISMATCH expected:7 actual:8
```

This is a secondary effect. Once an invalid read is accepted, the read pointer
and FIFO count are no longer aligned with the actual stored data. Because the
internal state is corrupted, later reads can return data in the wrong order.

### Conclusion for Report

Issue 2 proves that read enable must be gated with the empty flag. The waveform
shows `do_read` becoming active while `empty` is high, followed by `fifo_count`
underflow from `0` to `31`. The `READ_EMPTY` assertion catches the first invalid
read, while the `COUNT_RANGE` assertion catches the later counter underflow.
The scoreboard mismatch confirms that accepting a read while empty can corrupt
the FIFO read sequence.

## Issue 3: Full Flag Asserted Too Early

Evidence files:

- Waveform: `images/issue3/Screenshot 2026-05-04 131017.png`
- Log part 1: `images/issue3/Screenshot 2026-05-04 130851.png`
- Log part 2: `images/issue3/Screenshot 2026-05-04 130859.png`
- Buggy design used: `eda_playground/buggy_designs/design_issue3_full_flag_early.sv`

Bug inserted in `sync_fifo_ram` full flag logic:

```systemverilog
assign full = (fifo_count == 1);
```

Correct behavior:

```systemverilog
assign full = (fifo_count == DEPTH);
```

For `AW = 4`, the FIFO depth is:

```text
DEPTH = 16
```

So the FIFO should become full only when `fifo_count = 16`, not when
`fifo_count = 1`.

### Expected Behavior

The `full` flag should indicate that all FIFO locations are occupied. In this
project, there are 16 FIFO locations, so the correct behavior is:

- `full = 0` when `fifo_count` is less than `16`
- `full = 1` only when `fifo_count = 16`
- if `full = 1`, the FIFO should block further writes by making `do_write = 0`

This prevents overflow, but it should not block writes too early.

### Waveform Discussion

The main time window to check is approximately:

```text
100000 ps to 170000 ps
```

This corresponds to:

```text
100 ns to 170 ns
```

In this region, the first write operation has happened and the waveform shows:

- `fifo_count[4:0] = 1`
- `full = 1`
- `empty = 0`

This is incorrect because a FIFO with depth 16 is not full after only one word.
The `full` signal should still be `0` when `fifo_count = 1`.

The waveform also shows the practical effect of this wrong flag. Since `full`
is already high, the FIFO can block later write operations even though there is
still free space in memory. This makes the FIFO behave as if its capacity is
only one entry instead of sixteen entries.

### Time-Period Explanation

The important full-flag behavior can be explained as follows:

- At the start, reset clears the FIFO and `fifo_count` is `0`.
- Around `100000 ps`, a write operation is accepted and `fifo_count` becomes `1`.
- Immediately after this, the buggy full flag becomes `1`.
- The FIFO is not actually full, because the expected full condition is
  `fifo_count == 16`.
- Later in the log, the scoreboard prints `FIFO is full` even during early write
  attempts, showing that the wrong full flag changes the testbench-observed
  behavior.

This is why the waveform screenshot should focus on the first time `full`
becomes high. The issue is not a data ordering problem at first; it is a status
flag problem where the FIFO reports full too early.

### Assertion Result

The assertion module detects the mismatch between `full` and `fifo_count`.
The log reports:

```text
[ASSERT FAIL] Full flag/count mismatch at 130000
[ASSERT FAIL] Full flag/count mismatch at 150000
[ASSERT FAIL] Full flag/count mismatch at 170000
```

The same assertion continues failing later, for example:

```text
[ASSERT FAIL] Full flag/count mismatch at 550000
[ASSERT FAIL] Full flag/count mismatch at 570000
[ASSERT FAIL] Full flag/count mismatch at 590000
```

These failures are expected because the assertion checks:

```systemverilog
full == (fifo_count == DEPTH)
```

In the buggy design, `full` is high when `fifo_count` is `1`, so this condition
is false.

### Log Discussion

The log shows repeated `FULL_FLAG` assertion failures. It also shows scoreboard
messages such as:

```text
[SCO] : FIFO is full
```

This message appears even though the FIFO is not truly full. The scoreboard is
reacting to the `full` signal it observes from the DUT. Since the DUT is
reporting `full` too early, the scoreboard treats valid writes as blocked.

Unlike Issue 2, this bug may not immediately create a data mismatch. Instead,
it causes loss of usable FIFO capacity. The FIFO behaves as if it has much less
storage space than designed.

### Conclusion for Report

Issue 3 proves that FIFO status flags must match the internal count exactly.
The waveform shows `full = 1` when `fifo_count = 1`, even though the FIFO depth
is 16. The `FULL_FLAG` assertion catches this immediately by comparing `full`
against `fifo_count == DEPTH`. This issue shows how an incorrect flag can make
a FIFO functionally inefficient or block valid write operations, even if the
data path itself is not directly corrupted.

## Issue 4: Empty Flag Asserted At Wrong Count

Evidence files:

- Waveform: `images/issue4/Screenshot 2026-05-04 131259.png`
- Log part 1: `images/issue4/Screenshot 2026-05-04 131207.png`
- Log part 2: `images/issue4/Screenshot 2026-05-04 131214.png`
- Buggy design used: `eda_playground/buggy_designs/design_issue4_empty_flag_early.sv`

Bug inserted in `sync_fifo_ram` empty flag logic:

```systemverilog
assign empty = (fifo_count == 1);
```

Correct behavior:

```systemverilog
assign empty = (fifo_count == 0);
```

The empty flag should be high only when there are no words stored in the FIFO.
If `fifo_count` is `1`, the FIFO still contains one valid word, so `empty`
should be low.

### Expected Behavior

The correct FIFO behavior is:

- `empty = 1` only when `fifo_count = 0`
- `empty = 0` when `fifo_count` is greater than `0`
- valid reads should be allowed while data is still present

This is important because `empty` controls whether the FIFO accepts read
operations. If `empty` is asserted too early, valid reads can be blocked.

### Waveform Discussion

The main time window to check is approximately:

```text
300000 ps to 430000 ps
```

This corresponds to:

```text
300 ns to 430 ns
```

In this region, the waveform shows the FIFO being read down from several stored
items. The important mismatch is:

- `fifo_count[4:0] = 1`
- `empty = 1`

This is incorrect. A count value of `1` means one word is still stored in the
FIFO, so the empty flag should not be asserted.

The waveform also shows that when `empty` is high too early, the FIFO reports
itself as empty before all stored data has been read. This can stop a valid read
from being accepted even though data remains in the FIFO.

### Time-Period Explanation

The empty-flag behavior can be explained as follows:

- Earlier in the simulation, write operations increase `fifo_count`.
- Read operations then reduce `fifo_count`.
- Around the `300000 ps` to `430000 ps` region, `fifo_count` reaches `1`.
- In the correct design, `empty` should still be `0` at this point.
- In the buggy design, `empty` becomes `1` because it is incorrectly tied to
  `fifo_count == 1`.
- The monitor and scoreboard therefore see the FIFO as empty even though one
  data item remains.

This is why this time period is important for the report: it captures the exact
case where the FIFO falsely reports empty while data is still available.

### Assertion Result

The log reports reset-related failures at the beginning because the wrong empty
condition also affects reset behavior. During reset, `fifo_count` is `0`, but
the buggy empty logic checks for `1`, so `empty` is not asserted correctly.

The log shows:

```text
[ASSERT FAIL] Reset state incorrect at 30000
[ASSERT FAIL] Reset state incorrect at 50000
[ASSERT FAIL] Reset state incorrect at 70000
```

After normal operation begins, the direct empty flag assertion also fails:

```text
[ASSERT FAIL] Empty flag/count mismatch at 90000
[ASSERT FAIL] Empty flag/count mismatch at 110000
[ASSERT FAIL] Empty flag/count mismatch at 130000
```

Later, during read operations, the same assertion continues to fail:

```text
[ASSERT FAIL] Empty flag/count mismatch at 370000
[ASSERT FAIL] Empty flag/count mismatch at 390000
[ASSERT FAIL] Empty flag/count mismatch at 410000
```

These failures are expected because the assertion checks:

```systemverilog
empty == (fifo_count == 0)
```

In the buggy design, `empty` is based on `fifo_count == 1`, so the assertion
fails whenever the empty flag does not match the true count-zero condition.

### Log Discussion

The scoreboard log shows messages such as:

```text
[SCO] : FIFO IS EMPTY
```

This message appears during read attempts because the DUT reports `empty = 1`.
However, the waveform shows that this empty indication can happen while
`fifo_count = 1`. Therefore, the scoreboard is reacting correctly to the DUT
output, but the DUT output itself is wrong.

Unlike a read-underflow bug, this issue mainly causes premature blocking of
valid reads. The FIFO may still contain data, but the wrong empty flag prevents
normal read behavior.

### Conclusion for Report

Issue 4 proves that the empty flag must be generated from the exact zero-count
condition. The waveform shows `empty = 1` while `fifo_count = 1`, which means
the FIFO falsely reports empty even though one data word is still stored. The
`EMPTY_FLAG` assertion catches this mismatch, and the scoreboard messages show
how the wrong flag affects read behavior. This issue demonstrates that status
flag correctness is as important as pointer and RAM data-path correctness.

## Issue 5: Read Pointer Does Not Advance

Evidence files:

- Waveform: `images/issue5/Screenshot 2026-05-04 131456.png`
- Log: `images/issue5/Screenshot 2026-05-04 131432.png`
- Buggy design used: `eda_playground/buggy_designs/design_issue5_read_pointer_stuck.sv`

Bug inserted in `sync_fifo_ram` read pointer update:

```systemverilog
rd_ptr <= rd_ptr;
```

Correct behavior:

```systemverilog
rd_ptr <= rd_ptr + 1'b1;
```

### Expected Behavior

When a valid read is accepted, the FIFO should move to the next memory address.
The correct behavior is:

- if `rd_en = 1`, `empty = 0`, and `do_read = 1`, then `rd_ptr` should increment
- `fifo_count` should decrement by one
- `rd_data` should follow the FIFO order of stored write data

If the read pointer does not advance, the FIFO repeatedly reads the same RAM
address instead of moving through the stored data.

### Waveform Discussion

The main time window to check is approximately:

```text
250000 ps to 430000 ps
```

This corresponds to:

```text
250 ns to 430 ns
```

Before this time window, the FIFO receives write operations. The waveform shows
`wr_ptr` increasing and `fifo_count` reaching `3`, meaning multiple data values
have been stored.

During the read window, the important signals are:

- `rd_en = 1`
- `do_read = 1`
- `empty = 0`
- `fifo_count` decreases from `3` to `2`, then to `1`, then to `0`
- `rd_ptr[3:0]` stays at `0`
- `rd_data[7:0]` keeps showing the same value, `2`

This is incorrect. Since valid reads are being accepted, `rd_ptr` should move
from address `0` to address `1`, then to address `2`, and so on. Instead, it
remains stuck at address `0`, so the FIFO reads the first stored location again.

### Time-Period Explanation

The read-pointer behavior can be explained as follows:

- Around `100000 ps` to `220000 ps`, three writes store data into the FIFO.
- `wr_ptr` advances normally, showing that write-side behavior is working.
- Around `290000 ps`, the first read is accepted.
- Since `do_read = 1`, the read pointer should increment on the next clock.
- At approximately `310000 ps`, the assertion checks the update and finds that
  `rd_ptr` did not advance.
- Later reads show the same problem again: `fifo_count` changes, but `rd_ptr`
  stays at `0`.

This is why the `250000 ps` to `430000 ps` window is the best waveform area for
the report. It shows that the FIFO accepts reads, but the read pointer remains
stuck.

### Assertion Result

The log reports:

```text
[ASSERT FAIL] Read-only pointer/count update wrong at 310000
```

The same assertion fails again later:

```text
[ASSERT FAIL] Read-only pointer/count update wrong at 370000
[ASSERT FAIL] Read-only pointer/count update wrong at 430000
```

This assertion is checking that during a read-only operation:

- `wr_ptr` remains stable
- `rd_ptr` increments
- `fifo_count` decrements

In the buggy design, `fifo_count` still decrements, but `rd_ptr` does not
increment. Therefore, the assertion correctly identifies the pointer update
failure.

### Log Discussion

The scoreboard also reports data mismatches:

```text
[SCO] : DATA MISMATCH expected:6 actual:2
[SCO] : DATA MISMATCH expected:4 actual:2
```

This happens because the scoreboard expects FIFO order. After reading the first
stored value `2`, the next values should be `6` and `4`. But because `rd_ptr`
is stuck, the DUT keeps returning data from the same address, so the actual
read value remains `2`.

The scoreboard mismatch is therefore a direct functional effect of the pointer
bug. The assertion catches the internal pointer-update problem, and the
scoreboard confirms that the bug changes the output data sequence.

### Conclusion for Report

Issue 5 proves that correct pointer movement is necessary for FIFO ordering.
The waveform shows valid read operations while `rd_ptr` remains stuck at `0`.
The `READ_ONLY` assertion detects that the pointer did not update correctly,
and the scoreboard reports data mismatches because the same RAM location is read
repeatedly. This issue demonstrates how a small pointer update bug can directly
break FIFO data ordering.
