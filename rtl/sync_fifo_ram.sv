`timescale 1ns/1ps

module sync_fifo_ram
  #(parameter DW = 8,
    parameter AW = 4)
(
    input  wire               clk,
    input  wire               rst,
    input  wire               wr_en,
    input  wire               rd_en,
    input  wire [DW-1:0]      wr_data,
    output wire [DW-1:0]      rd_data,
    output wire               full,
    output wire               empty
);

    // AW is "address width" in bits.
    // If AW=4, the RAM has 2^4 = 16 locations (address 0..15).
    // DEPTH therefore needs the numeric value 16.
    // We declare DEPTH as [AW:0] (AW+1 bits) so it can hold 2^AW exactly.
    // With only AW bits, value 16 would overflow when AW=4.
    localparam [AW:0] DEPTH = (1 << AW);

    // wr_ptr / rd_ptr are RAM addresses, so they need AW bits, not AW+1.
    // Example AW=4: pointer range is 0..15, matching memory index range.
    // This is why declaration is [AW-1:0].
    reg [AW-1:0] wr_ptr;
    reg [AW-1:0] rd_ptr;

    // fifo_count stores "number of words currently in FIFO".
    // Count must represent 0..DEPTH (inclusive):
    //   - 0 when empty
    //   - DEPTH when full
    // That requires AW+1 bits, so declaration is [AW:0].
    reg [AW:0]   fifo_count;

    wire do_write;
    wire do_read;

    assign do_write = wr_en && !full;
    assign do_read  = rd_en && !empty;

    // Full when count reaches DEPTH (e.g. 16 for AW=4).
    // Empty when count is 0.
    assign full  = (fifo_count == DEPTH);
    assign empty = (fifo_count == 0);

    sync_ram #(
        .DW(DW),
        .AW(AW)
    ) ram_inst (
        .clk(clk),
        .we(do_write),
        .waddr(wr_ptr),
        .raddr(rd_ptr),
        .din(wr_data),
        .dout(rd_data)
    );

    always @(posedge clk) begin
        if (rst) begin
            // AW bits are used for address pointers.
            wr_ptr     <= {AW{1'b0}};
            rd_ptr     <= {AW{1'b0}};
            // AW+1 bits are used for occupancy count.
            fifo_count <= {(AW+1){1'b0}};
        end else begin
            if (do_write) begin
                wr_ptr <= wr_ptr + 1'b1;
            end

            if (do_read) begin
                rd_ptr <= rd_ptr + 1'b1;
            end

            case ({do_write, do_read})
                2'b10: fifo_count <= fifo_count + 1'b1;
                2'b01: fifo_count <= fifo_count - 1'b1;
                default: fifo_count <= fifo_count;
            endcase
        end
    end

endmodule
