`timescale 1ns/1ps

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
