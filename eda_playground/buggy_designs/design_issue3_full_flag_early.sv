`timescale 1ns/1ps

// ---------------------------------------------------------------------------
// ISSUE 3: Full Flag Asserted Too Early
// This file is intentionally incorrect for negative testing only.
// Paste this whole file into EDA Playground's design.sv tab, run simulation,
// capture the assertion/scoreboard failure and waveform, then restore the
// clean eda_playground/design.sv before trying another issue.
// ---------------------------------------------------------------------------


// EDA Playground file name: design.sv
//
// Real project files combined in this file:
//   1. rtl/sync_ram.sv
//   2. rtl/sync_fifo.sv
//   3. rtl/sync_fifo_ram.sv
//
// Reason:
//   EDA Playground normally gives one default design file named design.sv.
//   That name is only for the online simulator editor. In the real local
//   project, these modules are kept as separate RTL files under rtl/ so the
//   project remains clean and easy to extend.

// ---------------------------------------------------------------------------
// Real file name: rtl/sync_ram.sv
// Purpose: Separate synchronous RAM used by sync_fifo_ram.
// ---------------------------------------------------------------------------
module sync_ram
  #(parameter DW = 8,
    parameter AW = 4)
(
    input  wire               clk,
    input  wire               we,
    input  wire [AW-1:0]      waddr,
    input  wire [AW-1:0]      raddr,
    input  wire [DW-1:0]      din,
    output reg  [DW-1:0]      dout
);

    localparam DEPTH = (1 << AW);

    reg [DW-1:0] mem [0:DEPTH-1];

    always @(posedge clk) begin
        if (we) begin
            mem[waddr] <= din;
        end

        dout <= mem[raddr];
    end

endmodule

// ---------------------------------------------------------------------------
// Real file name: rtl/sync_fifo.sv
// Purpose: Basic synchronous FIFO using an internal memory array.
// ---------------------------------------------------------------------------
module sync_fifo
  #(parameter DW = 8,
    parameter AW = 4)
(
    input  wire               clk,
    input  wire               rst,
    input  wire               wr_en,
    input  wire               rd_en,
    input  wire [DW-1:0]      wr_data,
    output reg  [DW-1:0]      rd_data,
    output wire               full,
    output wire               empty
);

    localparam [AW:0] DEPTH = (1 << AW);

    reg [DW-1:0] mem [0:DEPTH-1];
    reg [AW-1:0] wr_ptr;
    reg [AW-1:0] rd_ptr;
    reg [AW:0]   fifo_count;

    wire do_write;
    wire do_read;

    assign do_write = wr_en && !full;
    assign do_read  = rd_en && !empty;

    assign full  = (fifo_count == DEPTH);
    assign empty = (fifo_count == 0);

    always @(posedge clk) begin
        if (rst) begin
            wr_ptr     <= {AW{1'b0}};
            rd_ptr     <= {AW{1'b0}};
            fifo_count <= {(AW+1){1'b0}};
            rd_data    <= {DW{1'b0}};
        end else begin
            if (do_write) begin
                mem[wr_ptr] <= wr_data;
                wr_ptr      <= wr_ptr + 1'b1;
            end

            if (do_read) begin
                rd_data <= mem[rd_ptr];
                rd_ptr  <= rd_ptr + 1'b1;
            end

            case ({do_write, do_read})
                2'b10: fifo_count <= fifo_count + 1'b1;
                2'b01: fifo_count <= fifo_count - 1'b1;
                default: fifo_count <= fifo_count;
            endcase
        end
    end

endmodule

// ---------------------------------------------------------------------------
// Real file name: rtl/sync_fifo_ram.sv
// Purpose: FIFO controller integrated with the separate sync_ram module.
// This is the main DUT used by the EDA Playground testbench.
// ---------------------------------------------------------------------------
module sync_fifo_ram
  #(parameter DW = 8,
    parameter AW = 4)
(
    input  wire               clk,
    input  wire               rst,
    input  wire               wr_en,
    input  wire               rd_en,
    input  wire [DW-1:0]      wr_data,
    output wire [DW-1:0]      rd_data,
    output wire               full,
    output wire               empty
);

    localparam [AW:0] DEPTH = (1 << AW);

    reg [AW-1:0] wr_ptr;
    reg [AW-1:0] rd_ptr;
    reg [AW:0]   fifo_count;

    wire do_write;
    wire do_read;

    assign do_write = wr_en && !full;
    assign do_read  = rd_en && !empty;

    assign full  = (fifo_count == 1);  // ISSUE 3 BUG: full goes high when only one word is stored
    assign empty = (fifo_count == 0);

    sync_ram #(
        .DW(DW),
        .AW(AW)
    ) ram_inst (
        .clk(clk),
        .we(do_write),
        .waddr(wr_ptr),
        .raddr(rd_ptr),
        .din(wr_data),
        .dout(rd_data)
    );

    always @(posedge clk) begin
        if (rst) begin
            wr_ptr     <= {AW{1'b0}};
            rd_ptr     <= {AW{1'b0}};
            fifo_count <= {(AW+1){1'b0}};
        end else begin
            if (do_write) begin
                wr_ptr <= wr_ptr + 1'b1;
            end

            if (do_read) begin
                rd_ptr <= rd_ptr + 1'b1;
            end

            case ({do_write, do_read})
                2'b10: fifo_count <= fifo_count + 1'b1;
                2'b01: fifo_count <= fifo_count - 1'b1;
                default: fifo_count <= fifo_count;
            endcase
        end
    end

endmodule

