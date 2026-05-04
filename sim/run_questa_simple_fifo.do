transcript file sim_simple_fifo.log
if {[file exists work]} {
  vdel -lib work -all
}
vlib work
vlog -sv +define+USE_SIMPLE_FIFO -f files.f
vsim -voptargs=+acc work.tb
run -all
quit -f
