# Assertion-Based FIFO Verification Presentation Plan

Audience: Design Project viva / academic review panel for PVL292.

Objective: Present the SystemVerilog FIFO verification project as a concise technical story: problem, design, verification approach, assertion plan, five injected faults, evidence, conclusion, and future UVM migration.

Narrative arc:
1. Establish the project identity and why FIFO verification matters.
2. Explain why SystemVerilog was chosen instead of plain Verilog.
3. Show the DUT architecture and class-based verification environment.
4. Explain the assertion strategy and negative-testing method.
5. Walk through five failures using actual logs/waveforms.
6. Summarize what assertions and scoreboard each contributed.
7. Close with limitations, future work, and references.

Slide list:
1. Title
2. Presentation roadmap
3. Why FIFO verification matters
4. Why SystemVerilog over Verilog
5. OOP concepts in SystemVerilog
6. How OOP appears in this FIFO testbench
7. Synchronous FIFO basics
8. DUT architecture: sync_fifo_ram with sync_ram
9. Verification environment
10. Assertion-based verification plan
11. Fault injection methodology
12. Baseline expected behavior
13. Issues 1 and 2 results
14. Issue 3 result
15. Issue 4 result
16. Issue 5 result
17. Comparative result summary
18. Key findings and project contribution
19. Conclusion, future work, and references

Source plan:
- Local report: `C:\Users\kapil\Downloads\TIET_Assertion_Based_FIFO_Verification_Report.docx`
- Local RTL/assertions: `rtl/sync_fifo_ram.sv`, `rtl/sync_ram.sv`, `tb/assert_fifo_ram.sv`, `tb/*.svh`
- Evidence screenshots: `images/issue1` through `images/issue5`
- Embedded report diagrams: `outputs/fifo_presentation/scratch/docx_media/image1.jpeg` through `image18.png`
- IEEE 1800-2023 page for SystemVerilog scope and features: https://standards.ieee.org/ieee/1800/7743/
- Accellera UVM community page for UVM/SystemVerilog reuse context: https://accellera.com/community/uvm
- Accellera UVM standards download page for UVM reuse/interoperability statement: https://www.uvmworld.org/downloads/standards/uvm
- Accellera UVM working group page for future UVM migration rationale: https://www.accellera.org/activities/working-groups/uvm

Visual system:
- 16:9 technical presentation, quiet academic style.
- Light background, dark text, TIET red accent, teal verification accent, amber warning accent.
- Use editable PowerPoint text, tables, and native shapes for all slide labels and diagrams.
- Use screenshots as evidence panels, cropped with readable captions.
- Use a compact title band and slide number on each slide.

Image plan:
- Slide 1: TIET logo from report.
- Slide 5: Basic FIFO principle diagram.
- Slide 6: Synchronous FIFO with separate RAM diagram.
- Slide 7: SystemVerilog testbench organization diagram.
- Slides 11-14: Actual issue screenshots from `images/issue*`.
- Slide 15: Editable comparative table.

Editability plan:
- Titles, bullets, tables, labels, and references are editable PowerPoint objects.
- Local screenshots remain as image evidence only.
- No screenshot-only slides.
