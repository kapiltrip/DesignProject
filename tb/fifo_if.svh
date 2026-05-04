`ifndef FIFO_IF_SVH
`define FIFO_IF_SVH

// Define an interface for the FIFO
interface fifo_if #(parameter DW = 8);

  logic clk, rst;              // Clock and reset signals
  logic rd_en, wr_en;          // Read and write enable signals
  logic full, empty;           // Flags indicating FIFO status
  logic [DW-1:0] wr_data;      // Data input
  logic [DW-1:0] rd_data;      // Data output

endinterface

`endif
