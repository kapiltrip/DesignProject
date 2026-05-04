`timescale 1ns/1ps

`include "fifo_if.svh"
`include "transaction.svh"
`include "generator.svh"
`include "driver.svh"
`include "monitor.svh"
`include "scoreboard.svh"
`include "environment.svh"

module tb;

  localparam int DW = 8;
  localparam int AW = 4;

  fifo_if #(DW) fif();

`ifdef USE_SIMPLE_FIFO
  sync_fifo #(
    .DW(DW),
    .AW(AW)
  ) dut (
    .clk(fif.clk),
    .rst(fif.rst),
    .wr_en(fif.wr_en),
    .rd_en(fif.rd_en),
    .wr_data(fif.wr_data),
    .rd_data(fif.rd_data),
    .full(fif.full),
    .empty(fif.empty)
  );
`else
  // Default DUT is the FIFO integrated with a separate synchronous RAM.
  // Compile with +define+USE_SIMPLE_FIFO to test sync_fifo instead.
  sync_fifo_ram #(
    .DW(DW),
    .AW(AW)
  ) dut (
    .clk(fif.clk),
    .rst(fif.rst),
    .wr_en(fif.wr_en),
    .rd_en(fif.rd_en),
    .wr_data(fif.wr_data),
    .rd_data(fif.rd_data),
    .full(fif.full),
    .empty(fif.empty)
  );
`endif

  initial begin
    fif.clk <= 0;
  end

  always #10 fif.clk <= ~fif.clk;

  environment env;

  initial begin
    env = new(fif);
    env.gen.count = 10;
    env.run();
  end

  initial begin
    $dumpfile("dump.vcd");
    $dumpvars(0, tb);
  end

endmodule
