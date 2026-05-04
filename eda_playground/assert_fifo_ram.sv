`timescale 1ns/1ps

// EDA Playground file name: assert_fifo_ram.sv
//
// Real project file:
//   tb/assert_fifo_ram.sv
//
// Reason:
//   Assertions are verification code, so they are kept separate from design.sv.
//   In the local project this file lives under tb/. In EDA Playground, create
//   this third file using the + button and paste this content into it.

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

    localparam [AW:0] DEPTH = (1 << AW);

    RST_STATE:
        assert property (@(posedge clk)
            rst |=> (!full && empty &&
                     wr_ptr == {AW{1'b0}} &&
                     rd_ptr == {AW{1'b0}} &&
                     fifo_count == {(AW+1){1'b0}}))
        else
            $error("[ASSERT FAIL] Reset state incorrect at %0t", $time);

    // disable iff (rst) only pauses these normal-operation checks during reset.
    // The reset behavior itself is checked separately by RST_STATE above.

    FULL_FLAG:
        assert property (@(posedge clk) disable iff (rst)
            full == (fifo_count == DEPTH))
        else
            $error("[ASSERT FAIL] Full flag/count mismatch at %0t", $time);

    EMPTY_FLAG:
        assert property (@(posedge clk) disable iff (rst)
            empty == (fifo_count == 0))
        else
            $error("[ASSERT FAIL] Empty flag/count mismatch at %0t", $time);

    COUNT_RANGE:
        assert property (@(posedge clk) disable iff (rst)
            fifo_count <= DEPTH)
        else
            $error("[ASSERT FAIL] fifo_count out of range at %0t", $time);

    FULL_EMPTY_EXCLUSIVE:
        assert property (@(posedge clk) disable iff (rst)
            !(full && empty))
        else
            $error("[ASSERT FAIL] full and empty high together at %0t", $time);

    WRITE_ONLY:
        assert property (@(posedge clk) disable iff (rst)
            (do_write && !do_read) |=>
            (wr_ptr == $past(wr_ptr) + 1'b1 &&
             rd_ptr == $past(rd_ptr) &&
             fifo_count == $past(fifo_count) + 1'b1))
        else
            $error("[ASSERT FAIL] Write-only pointer/count update wrong at %0t", $time);

    READ_ONLY:
        assert property (@(posedge clk) disable iff (rst)
            (!do_write && do_read) |=>
            (wr_ptr == $past(wr_ptr) &&
             rd_ptr == $past(rd_ptr) + 1'b1 &&
             fifo_count == $past(fifo_count) - 1'b1))
        else
            $error("[ASSERT FAIL] Read-only pointer/count update wrong at %0t", $time);

    READ_WRITE:
        assert property (@(posedge clk) disable iff (rst)
            (do_write && do_read) |=>
            (wr_ptr == $past(wr_ptr) + 1'b1 &&
             rd_ptr == $past(rd_ptr) + 1'b1 &&
             fifo_count == $past(fifo_count)))
        else
            $error("[ASSERT FAIL] Read/write pointer/count update wrong at %0t", $time);

    NO_OPERATION:
        assert property (@(posedge clk) disable iff (rst)
            (!do_write && !do_read) |=>
            (wr_ptr == $past(wr_ptr) &&
             rd_ptr == $past(rd_ptr) &&
             fifo_count == $past(fifo_count)))
        else
            $error("[ASSERT FAIL] FIFO state changed without accepted operation at %0t", $time);

    READ_EMPTY:
        assert property (@(posedge clk) disable iff (rst)
            (empty && rd_en) |-> !do_read)
        else
            $error("[ASSERT FAIL] Read accepted while empty at %0t", $time);

    WRITE_FULL:
        assert property (@(posedge clk) disable iff (rst)
            (full && wr_en) |-> !do_write)
        else
            $error("[ASSERT FAIL] Write accepted while full at %0t", $time);

    always @(posedge clk) begin
        if (!rst) begin
            assert (!$isunknown({wr_en, rd_en, wr_data, full, empty,
                                 wr_ptr, rd_ptr, fifo_count}))
            else
                $error("[ASSERT FAIL] Unknown value detected at %0t", $time);

            if (do_read) begin
                #1;
                assert (!$isunknown(rd_data))
                else
                    $error("[ASSERT FAIL] rd_data unknown after read at %0t", $time);
            end
        end
    end

endmodule

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
