
## Status: Fixing Critical Bugs (Print & PDF)

- **Goal**: Fix the "Blank Page" issue on direct print and improve PDF export quality.
- **Current Action**: Analyzing `LabelBMN.jsx` and `label_bmn.py` to understand the current broken implementations.
- **Next Steps**:
  1.  Fix "Direct Print" by ensuring styles are correctly applied in the print window.
  2.  Switch PDF generation to `weasyprint` for 1:1 visual fidelity.
