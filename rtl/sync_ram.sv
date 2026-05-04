`timescale 1ns/1ps

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
