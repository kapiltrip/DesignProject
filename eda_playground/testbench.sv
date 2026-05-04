`timescale 1ns/1ps

// EDA Playground file name: testbench.sv
//
// Real project files combined in this file:
//   1. tb/fifo_if.svh
//   2. tb/transaction.svh
//   3. tb/generator.svh
//   4. tb/driver.svh
//   5. tb/monitor.svh
//   6. tb/scoreboard.svh
//   7. tb/environment.svh
//   8. tb/fifo_tb.sv
//
// Reason:
//   EDA Playground gives a default file called testbench.sv for verification
//   code. In the real local project, these are separate files under tb/ because
//   that is cleaner and easier to maintain.
//
// Important:
//   This combined EDA Playground file does not use `include lines because all
//   interface, class, environment, and top testbench code is already pasted
//   below in the correct order.

// ---------------------------------------------------------------------------
// Real file name: tb/fifo_if.svh
// ---------------------------------------------------------------------------
interface fifo_if #(parameter DW = 8);

  logic clk, rst;
  logic rd_en, wr_en;
  logic full, empty;
  logic [DW-1:0] wr_data;
  logic [DW-1:0] rd_data;

endinterface

// ---------------------------------------------------------------------------
// Real file name: tb/transaction.svh
// ---------------------------------------------------------------------------
class transaction;

  rand bit oper;
  bit rd_en, wr_en;
  rand bit [7:0] wr_data;
  bit full, empty;
  bit [7:0] rd_data;

  constraint oper_ctrl {
    oper dist {1 :/ 50, 0 :/ 50};
  }

  constraint wr_data_ctrl {
    wr_data inside {[1:10]};
  }

endclass

// ---------------------------------------------------------------------------
// Real file name: tb/generator.svh
// ---------------------------------------------------------------------------
class generator;

  transaction tr;
  mailbox #(transaction) mbx;
  int count = 0;
  int i = 0;

  event next;
  event done;

  function new(mailbox #(transaction) mbx);
    this.mbx = mbx;
    tr = new();
  endfunction

  task run();
    repeat (count) begin
      tr = new();
      assert (tr.randomize()) else $error("Randomization failed");
      i++;
      mbx.put(tr);
      $display("[GEN] : Oper : %0d wr_data : %0d iteration : %0d",
               tr.oper, tr.wr_data, i);
      @(next);
    end
    -> done;
  endtask

endclass

// ---------------------------------------------------------------------------
// Real file name: tb/driver.svh
// ---------------------------------------------------------------------------
class driver;

  virtual fifo_if fif;
  mailbox #(transaction) mbx;
  transaction datac;

  function new(mailbox #(transaction) mbx);
    this.mbx = mbx;
  endfunction

  task reset();
    fif.rst <= 1'b1;
    fif.rd_en <= 1'b0;
    fif.wr_en <= 1'b0;
    fif.wr_data <= 0;
    repeat (5) @(posedge fif.clk);
    fif.rst <= 1'b0;
    $display("[DRV] : DUT Reset Done");
    $display("------------------------------------------");
  endtask

  task write(input bit [7:0] data);
    @(negedge fif.clk);
    fif.rst <= 1'b0;
    fif.rd_en <= 1'b0;
    fif.wr_en <= 1'b1;
    fif.wr_data <= data;
    @(negedge fif.clk);
    fif.wr_en <= 1'b0;
    $display("[DRV] : DATA WRITE  wr_data : %0d", data);
    @(negedge fif.clk);
  endtask

  task read();
    @(negedge fif.clk);
    fif.rst <= 1'b0;
    fif.rd_en <= 1'b1;
    fif.wr_en <= 1'b0;
    @(negedge fif.clk);
    fif.rd_en <= 1'b0;
    $display("[DRV] : DATA READ");
    @(negedge fif.clk);
  endtask

  task run();
    forever begin
      mbx.get(datac);
      if (datac.oper == 1'b1)
        write(datac.wr_data);
      else
        read();
    end
  endtask

endclass

// ---------------------------------------------------------------------------
// Real file name: tb/monitor.svh
// ---------------------------------------------------------------------------
class monitor;

  virtual fifo_if fif;
  mailbox #(transaction) mbx;
  transaction tr;

  function new(mailbox #(transaction) mbx);
    this.mbx = mbx;
  endfunction

  task run();
    forever begin
      tr = new();
      @(posedge fif.clk);
      tr.wr_en = fif.wr_en;
      tr.rd_en = fif.rd_en;
      tr.wr_data = fif.wr_data;
      tr.full = fif.full;
      tr.empty = fif.empty;

      if (tr.wr_en || tr.rd_en) begin
        #1;
        tr.rd_data = fif.rd_data;
        mbx.put(tr);
        $display("[MON] : wr_en:%0d rd_en:%0d wr_data:%0d rd_data:%0d full:%0d empty:%0d",
                 tr.wr_en, tr.rd_en, tr.wr_data, tr.rd_data, tr.full, tr.empty);
      end
    end
  endtask

endclass

// ---------------------------------------------------------------------------
// Real file name: tb/scoreboard.svh
// ---------------------------------------------------------------------------
class scoreboard;

  mailbox #(transaction) mbx;
  transaction tr;
  event next;
  bit [7:0] wr_data_q[$];
  bit [7:0] temp;
  int err = 0;

  function new(mailbox #(transaction) mbx);
    this.mbx = mbx;
  endfunction

  task run();
    forever begin
      mbx.get(tr);
      $display("[SCO] : wr_en:%0d rd_en:%0d wr_data:%0d rd_data:%0d full:%0d empty:%0d",
               tr.wr_en, tr.rd_en, tr.wr_data, tr.rd_data, tr.full, tr.empty);

      if (tr.rd_en == 1'b1) begin
        if (tr.empty == 1'b0) begin
          if (wr_data_q.size() == 0) begin
            $error("[SCO] : SCOREBOARD QUEUE EMPTY");
            err++;
          end
          else begin
            temp = wr_data_q.pop_front();

            if (tr.rd_data == temp)
              $display("[SCO] : DATA MATCH");
            else begin
              $error("[SCO] : DATA MISMATCH expected:%0d actual:%0d",
                     temp, tr.rd_data);
              err++;
            end
          end
        end
        else begin
          $display("[SCO] : FIFO IS EMPTY");
        end

        $display("--------------------------------------");
      end

      if (tr.wr_en == 1'b1) begin
        if (tr.full == 1'b0) begin
          wr_data_q.push_back(tr.wr_data);
          $display("[SCO] : DATA STORED IN QUEUE :%0d", tr.wr_data);
        end
        else begin
          $display("[SCO] : FIFO is full");
        end
        $display("--------------------------------------");
      end

      -> next;
    end
  endtask

endclass

// ---------------------------------------------------------------------------
// Real file name: tb/environment.svh
// ---------------------------------------------------------------------------
class environment;

  generator gen;
  driver drv;
  monitor mon;
  scoreboard sco;
  mailbox #(transaction) gdmbx;
  mailbox #(transaction) msmbx;
  event nextgs;
  virtual fifo_if fif;

  function new(virtual fifo_if fif);
    gdmbx = new();
    gen = new(gdmbx);
    drv = new(gdmbx);
    msmbx = new();
    mon = new(msmbx);
    sco = new(msmbx);
    this.fif = fif;
    drv.fif = this.fif;
    mon.fif = this.fif;
    gen.next = nextgs;
    sco.next = nextgs;
  endfunction

  task pre_test();
    drv.reset();
  endtask

  task test();
    fork
      gen.run();
      drv.run();
      mon.run();
      sco.run();
    join_any
  endtask

  task post_test();
    wait(gen.done.triggered);
    $display("---------------------------------------------");
    $display("Error Count :%0d", sco.err);
    $display("---------------------------------------------");
    $finish();
  endtask

  task run();
    pre_test();
    test();
    post_test();
  endtask

endclass

// ---------------------------------------------------------------------------
// Real file name: tb/fifo_tb.sv
// ---------------------------------------------------------------------------
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
