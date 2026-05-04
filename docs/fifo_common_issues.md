# Common FIFO Issues for Negative Testing

Use these only in a copied EDA Playground design or a separate buggy RTL copy.
Do not leave these changes in the final clean design.

The purpose is to prove that the scoreboard/assertions can catch real FIFO
mistakes. For each issue, run the clean design first, then apply one issue at a
time and rerun.

## Issue 1: Write Accepted While FIFO Is Full

Unsafe change in `sync_fifo_ram`:

```systemverilog
assign do_write = wr_en;
```

Correct line:

```systemverilog
assign do_write = wr_en && !full;
```

Why this is a problem:

- A write request can update RAM and `wr_ptr` even when the FIFO is already full.
- This can overwrite unread data.
- AMD FIFO documentation describes overflow as a write request rejected because the FIFO is full.
- Intel documentation also describes almost-full/full mechanisms as protection against overflow.

Expected result:

- `WRITE_FULL` should fail.
- `COUNT_RANGE` may fail if `fifo_count` goes beyond `DEPTH`.
- Waveform should show `full=1`, `wr_en=1`, and unsafe write activity.

## Issue 2: Read Accepted While FIFO Is Empty

Unsafe change in `sync_fifo_ram`:

```systemverilog
assign do_read = rd_en;
```

Correct line:

```systemverilog
assign do_read = rd_en && !empty;
```

Why this is a problem:

- A read request can advance `rd_ptr` even when there is no valid data.
- This can create underflow and return invalid/stale data.
- AMD FIFO documentation describes underflow as a read request rejected because the FIFO is empty.
- Intel documentation describes underflow protection as ignoring read requests when empty.

Expected result:

- `READ_EMPTY` should fail.
- `READ_ONLY` or `COUNT_RANGE` may fail if the count underflows.
- Scoreboard may later report a data mismatch.

## Issue 3: Full Flag Asserted At Wrong Count

Unsafe change in `sync_fifo_ram`:

```systemverilog
assign full = (fifo_count == DEPTH-1);
```

Correct line:

```systemverilog
assign full = (fifo_count == DEPTH);
```

Why this is a problem:

- The FIFO reports full one entry too early.
- A legal write can be blocked even though one RAM location is still available.
- FIFO data-count behavior should match the number of stored words.

Expected result:

- `FULL_FLAG` should fail.
- Directed fill test may show full after only 15 writes for `AW=4`.
- Waveform should show `fifo_count=15` and `full=1`.

## Issue 4: Empty Flag Asserted At Wrong Count

Unsafe change in `sync_fifo_ram`:

```systemverilog
assign empty = (fifo_count == 1);
```

Correct line:

```systemverilog
assign empty = (fifo_count == 0);
```

Why this is a problem:

- The FIFO reports empty while one valid word is still stored.
- A legal read can be blocked too early.
- This can leave unread data stuck in the FIFO.

Expected result:

- `EMPTY_FLAG` should fail.
- Directed drain test may show `empty=1` while `fifo_count=1`.
- Scoreboard may still have expected data left.

## Issue 5: Read Pointer Does Not Advance

Unsafe change in `sync_fifo_ram`:

```systemverilog
rd_ptr <= rd_ptr;
```

Correct line:

```systemverilog
rd_ptr <= rd_ptr + 1'b1;
```

Why this is a problem:

- Repeated reads access the same RAM address.
- FIFO ordering is broken because the read pointer does not move to the next entry.
- The scoreboard should catch this because read data will not match the expected queue order.

Expected result:

- `READ_ONLY` should fail.
- Scoreboard should eventually report `DATA MISMATCH`.
- Waveform should show `rd_en=1` but `rd_ptr` not changing.

## Recommended Report Wording

Use wording like this:

> To verify that the checking environment is meaningful, intentional bugs were
> inserted one at a time into a copied FIFO design. The clean RTL passed with
> zero scoreboard errors. The buggy versions produced assertion or scoreboard
> failures, proving that the verification environment detects overflow,
> underflow, flag, pointer, and data-order errors.

## References

- AMD FIFO Generator documentation describes FIFO data count behavior and shows
  that successful writes increment count while successful reads decrement count:
  https://docs.amd.com/r/en-US/pg327-emb-fifo-gen/Data-Counts
- AMD FIFO Generator native interface documentation describes overflow as a
  rejected write while full and underflow as a rejected read while empty:
  https://docs.amd.com/r/en-US/pg327-emb-fifo-gen/Native-FIFO-Interface-Signals
- Intel Platform Designer documentation describes almost-full/almost-empty
  thresholds as mechanisms to prevent FIFO overflow and underflow:
  https://www.intel.com/content/www/us/en/docs/programmable/683609/23-1/almost-full-and-almost-empty-thresholds.html
