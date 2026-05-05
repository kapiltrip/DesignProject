`timescale 1ns/1ps

// Real file name: tb/assert_fifo_ram.sv
//
// Purpose:
//   Bind-based assertions for sync_fifo_ram. The checks are kept outside RTL so
//   the design remains synthesizable and the verification intent stays explicit.
//
// EDA Playground note:
//   If using EDA Playground, create a third file named assert_fifo_ram.sv and
//   paste the matching file from eda_playground/assert_fifo_ram.sv.

module assert_fifo_ram
  #(parameter DW = 8,
    parameter AW = 4)
(
    input  wire               clk,
    input  wire               rst,
    input  wire               wr_en,
    input  wire               rd_en,
    input  wire [DW-1:0]      wr_data,
    input  wire [DW-1:0]      rd_data,
    input  wire               full,
    input  wire               empty,
    input  wire [AW-1:0]      wr_ptr,
    input  wire [AW-1:0]      rd_ptr,
    input  wire [AW:0]        fifo_count,
    input  wire               do_write,
    input  wire               do_read
);

    localparam [AW-1:0] PTR_ZERO   = {AW{1'b0}};
    localparam [AW:0]   COUNT_ZERO = {(AW+1){1'b0}};
    localparam [AW:0]   FIFO_DEPTH = (1 << AW);

    property p_reset_state;
        rst |=> (!full &&
                 empty &&
                 wr_ptr == PTR_ZERO &&
                 rd_ptr == PTR_ZERO &&
                 fifo_count == COUNT_ZERO);
    endproperty

    property p_known_control_and_state;
        disable iff (rst)
        !$isunknown({wr_en, rd_en, wr_data, full, empty,
                     wr_ptr, rd_ptr, fifo_count, do_write, do_read});
    endproperty

    property p_full_matches_count;
        disable iff (rst)
        full == (fifo_count == FIFO_DEPTH);
    endproperty

    property p_empty_matches_count;
        disable iff (rst)
        empty == (fifo_count == COUNT_ZERO);
    endproperty

    property p_count_in_range;
        disable iff (rst)
        fifo_count <= FIFO_DEPTH;
    endproperty

    property p_flags_exclusive;
        disable iff (rst)
        !(full && empty);
    endproperty

    property p_write_accept_gating;
        disable iff (rst)
        do_write == (wr_en && !full);
    endproperty

    property p_read_accept_gating;
        disable iff (rst)
        do_read == (rd_en && !empty);
    endproperty

    property p_write_only_update;
        disable iff (rst)
        (do_write && !do_read) |=>
        (wr_ptr == $past(wr_ptr) + 1'b1 &&
         rd_ptr == $past(rd_ptr) &&
         fifo_count == $past(fifo_count) + 1'b1);
    endproperty

    property p_read_only_update;
        disable iff (rst)
        (!do_write && do_read) |=>
        (wr_ptr == $past(wr_ptr) &&
         rd_ptr == $past(rd_ptr) + 1'b1 &&
         fifo_count == $past(fifo_count) - 1'b1);
    endproperty

    property p_read_write_update;
        disable iff (rst)
        (do_write && do_read) |=>
        (wr_ptr == $past(wr_ptr) + 1'b1 &&
         rd_ptr == $past(rd_ptr) + 1'b1 &&
         fifo_count == $past(fifo_count));
    endproperty

    property p_idle_state_stable;
        disable iff (rst)
        (!do_write && !do_read) |=>
        (wr_ptr == $past(wr_ptr) &&
         rd_ptr == $past(rd_ptr) &&
         fifo_count == $past(fifo_count));
    endproperty

    RST_STATE:
        assert property (@(posedge clk) p_reset_state)
        else
            $error("[ASSERT FAIL] Reset state incorrect at %0t: full=%0b empty=%0b wr_ptr=%0d rd_ptr=%0d count=%0d",
                   $time, full, empty, wr_ptr, rd_ptr, fifo_count);

    KNOWN_CONTROL_AND_STATE:
        assert property (@(posedge clk) p_known_control_and_state)
        else
            $error("[ASSERT FAIL] Unknown control/state value at %0t", $time);

    FULL_FLAG:
        assert property (@(posedge clk) p_full_matches_count)
        else
            $error("[ASSERT FAIL] Full flag/count mismatch at %0t: full=%0b count=%0d depth=%0d",
                   $time, full, fifo_count, FIFO_DEPTH);

    EMPTY_FLAG:
        assert property (@(posedge clk) p_empty_matches_count)
        else
            $error("[ASSERT FAIL] Empty flag/count mismatch at %0t: empty=%0b count=%0d",
                   $time, empty, fifo_count);

    COUNT_RANGE:
        assert property (@(posedge clk) p_count_in_range)
        else
            $error("[ASSERT FAIL] fifo_count out of range at %0t: count=%0d depth=%0d",
                   $time, fifo_count, FIFO_DEPTH);

    FULL_EMPTY_EXCLUSIVE:
        assert property (@(posedge clk) p_flags_exclusive)
        else
            $error("[ASSERT FAIL] full and empty high together at %0t", $time);

    WRITE_ACCEPT_GATING:
        assert property (@(posedge clk) p_write_accept_gating)
        else
            $error("[ASSERT FAIL] Write accept gating wrong at %0t: wr_en=%0b full=%0b do_write=%0b",
                   $time, wr_en, full, do_write);

    READ_ACCEPT_GATING:
        assert property (@(posedge clk) p_read_accept_gating)
        else
            $error("[ASSERT FAIL] Read accept gating wrong at %0t: rd_en=%0b empty=%0b do_read=%0b",
                   $time, rd_en, empty, do_read);

    WRITE_ONLY:
        assert property (@(posedge clk) p_write_only_update)
        else
            $error("[ASSERT FAIL] Write-only pointer/count update wrong at %0t: wr_ptr=%0d rd_ptr=%0d count=%0d",
                   $time, wr_ptr, rd_ptr, fifo_count);

    READ_ONLY:
        assert property (@(posedge clk) p_read_only_update)
        else
            $error("[ASSERT FAIL] Read-only pointer/count update wrong at %0t: wr_ptr=%0d rd_ptr=%0d count=%0d",
                   $time, wr_ptr, rd_ptr, fifo_count);

    READ_WRITE:
        assert property (@(posedge clk) p_read_write_update)
        else
            $error("[ASSERT FAIL] Read/write pointer/count update wrong at %0t: wr_ptr=%0d rd_ptr=%0d count=%0d",
                   $time, wr_ptr, rd_ptr, fifo_count);

    NO_OPERATION:
        assert property (@(posedge clk) p_idle_state_stable)
        else
            $error("[ASSERT FAIL] FIFO state changed without accepted operation at %0t: wr_ptr=%0d rd_ptr=%0d count=%0d",
                   $time, wr_ptr, rd_ptr, fifo_count);

    READ_EMPTY:
        assert property (@(posedge clk) disable iff (rst) (empty && rd_en) |-> !do_read)
        else
            $error("[ASSERT FAIL] Read accepted while empty at %0t", $time);

    WRITE_FULL:
        assert property (@(posedge clk) disable iff (rst) (full && wr_en) |-> !do_write)
        else
            $error("[ASSERT FAIL] Write accepted while full at %0t", $time);

    // rd_data is produced by the synchronous RAM after the clock edge, so this
    // immediate assertion samples it one time unit after an accepted read.
    always @(posedge clk) begin
        if (!rst && do_read) begin
            #1;
            assert (!$isunknown(rd_data))
            else
                $error("[ASSERT FAIL] rd_data unknown after read at %0t", $time);
        end
    end

endmodule

// Bind the assertion module to the DUT.
// These internal names come from rtl/sync_fifo_ram.sv.
bind sync_fifo_ram assert_fifo_ram #(
    .DW(DW),
    .AW(AW)
) assert_fifo_ram_i (
    .clk(clk),
    .rst(rst),
    .wr_en(wr_en),
    .rd_en(rd_en),
    .wr_data(wr_data),
    .rd_data(rd_data),
    .full(full),
    .empty(empty),
    .wr_ptr(wr_ptr),
    .rd_ptr(rd_ptr),
    .fifo_count(fifo_count),
    .do_write(do_write),
    .do_read(do_read)
);
