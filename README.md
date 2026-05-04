# Synchronous FIFO SystemVerilog Project

This is the basic FIFO verification project built from the course skeleton.
The code is intentionally kept close to the original class-based structure, but
the DUT signal names now match your RTL:

- `clk`
- `rst`
- `wr_en`
- `rd_en`
- `wr_data`
- `rd_data`
- `full`
- `empty`

## Layout

- `rtl/sync_fifo.sv` - FIFO with internal memory array.
- `rtl/sync_ram.sv` - synchronous RAM used by the RAM-integrated FIFO.
- `rtl/sync_fifo_ram.sv` - FIFO integrated with `sync_ram`.
- `tb/fifo_tb.sv` - top-level testbench. By default it tests `sync_fifo_ram`.
- `tb/*.svh` - interface and class-based verification components.
- `sim/files.f` - compile file list.
- `sim/run_questa.do` - Questa/ModelSim run script for `sync_fifo_ram`.
- `sim/run_questa_simple_fifo.do` - Questa/ModelSim run script for `sync_fifo`.

## Run

This testbench uses SystemVerilog classes, mailboxes, randomization, and virtual
interfaces, so use a simulator with full SystemVerilog verification support
such as Questa/ModelSim, VCS, or Xcelium.

For Questa/ModelSim:

```tcl
cd sim
vsim -do run_questa.do
```

To test the simple FIFO instead:

```tcl
cd sim
vsim -do run_questa_simple_fifo.do
```

The simulation creates `dump.vcd` and prints the generator, driver, monitor, and
scoreboard activity. The final line reports the scoreboard error count.
