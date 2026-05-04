`ifndef SCOREBOARD_SVH
`define SCOREBOARD_SVH

class scoreboard;

  mailbox #(transaction) mbx;   // Mailbox for communication
  transaction tr;               // Transaction object for monitoring
  event next;
  bit [7:0] wr_data_q[$];       // Queue to store written data
  bit [7:0] temp;               // Temporary data storage
  int err = 0;                  // Error count

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
              $error("[SCO] : DATA MISMATCH expected:%0d actual:%0d", temp, tr.rd_data);
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

`endif
