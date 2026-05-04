`ifndef TRANSACTION_SVH
`define TRANSACTION_SVH

class transaction;

  rand bit oper;             // Randomized bit for operation control (1 or 0)
  bit rd_en, wr_en;          // Read and write enable bits
  rand bit [7:0] wr_data;    // 8-bit data input
  bit full, empty;           // Flags for full and empty status
  bit [7:0] rd_data;         // 8-bit data output

  constraint oper_ctrl {
    oper dist {1 :/ 50, 0 :/ 50};  // 50% write and 50% read
  }

  constraint wr_data_ctrl {
    wr_data inside {[1:10]};
  }

endclass

`endif
