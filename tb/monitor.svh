`ifndef MONITOR_SVH
`define MONITOR_SVH

class monitor;

  virtual fifo_if.MON fif;      // Monitor modport view of the FIFO interface
  mailbox #(transaction) mbx;   // Mailbox for communication
  transaction tr;               // Transaction object for monitoring

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

`endif
