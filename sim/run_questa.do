transcript file sim.log
if {[file exists work]} {
  vdel -lib work -all
}
vlib work
vlog -sv -f files.f
vsim -voptargs=+acc work.tb
run -all
quit -f
