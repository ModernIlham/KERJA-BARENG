
## Test Result - Fix Print & PDF

### Completed Tests
- [ ] Direct Print fixes (JS window.write)
- [ ] Background PDF Generation (WeasyPrint)

### Notes
- Direct print modified to use `document.write` instead of Blob URL.
- PDF generation now accepts HTML from frontend for 1:1 fidelity.
