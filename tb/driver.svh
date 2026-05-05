`ifndef DRIVER_SVH
`define DRIVER_SVH

class driver;

  virtual fifo_if.DRV fif;      // Driver modport view of the FIFO interface
  mailbox #(transaction) mbx;   // Mailbox for communication
  transaction datac;            // Transaction object for communication

  function new(mailbox #(transaction) mbx);
    this.mbx = mbx;
  endfunction

  // Reset the DUT
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

  // Write data to the FIFO
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

  // Read data from the FIFO
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

  // Apply random stimulus to the DUT
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

`endif
