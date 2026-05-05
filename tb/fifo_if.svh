`ifndef FIFO_IF_SVH
`define FIFO_IF_SVH

// Define an interface for the FIFO
interface fifo_if #(parameter DW = 8);

  logic clk, rst;              // Clock and reset signals
  logic rd_en, wr_en;          // Read and write enable signals
  logic full, empty;           // Flags indicating FIFO status
  logic [DW-1:0] wr_data;      // Data input
  logic [DW-1:0] rd_data;      // Data output

  // Driver view: can drive FIFO inputs and observe FIFO status.
  modport DRV (
    input  clk,
    input  full, empty,
    output rst, rd_en, wr_en, wr_data
  );

  // Monitor view: read-only view of all FIFO interface signals.
  modport MON (
    input clk, rst, rd_en, wr_en, wr_data, rd_data, full, empty
  );

endinterface

`endif
