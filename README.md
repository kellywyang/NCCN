# Gyn Onc Prechart

A static precharting workspace suitable for GitHub Pages. Serve this folder over HTTP locally or publish it to GitHub Pages; browser modules require HTTP rather than opening index.html directly. Mozilla PDF.js is bundled locally under vendor/ with its license and version. No CDN is required.

## Included

- Five disease-site categories and consult, treatment-review, and surveillance templates.
- A tumor-grade field beside disease site, with separate staging/grading and treatment-plan guideline views.
- Editable A&P drafts, clipboard copying, and an explicit reset.
- Official NCCN reference links and a device-local PDF viewer with a separate-tab fallback.
- No saved notes, analytics, patient database, external AI calls, or uploaded PDFs. Drafts remain in memory until reset or page reload. Selected guideline PDFs are stored in private browser storage on that device and reopen automatically. Clipboard contents remain under operating-system control.

## Clinical content

This is a documentation scaffold, not a validated clinical decision support system. It does not supply NCCN algorithms, assert guideline concordance, select therapy, calculate stage, or clear a patient for treatment. Page shortcuts and editable surveillance starters use the supplied ovarian 4.2026 (2026-04-10), vaginal 2.2026 (2025-12-04), cervical 2.2026 (2025-11-10), and uterine 3.2026 (2026-06-16) editions. These are not represented as the latest available guidelines. Consult and treatment starters are general documentation scaffolds, not full guideline-derived treatment pathways. A vulvar source document has not been supplied. Uterine surveillance starter is for endometrial carcinoma, not sarcoma. The clinician must verify diagnosis, grade, stage, guideline version, branch, and patient-specific plan. Bracketed text must be completed or removed before signing. Never infer that an examination, counseling, or record review occurred from a template.

NCCN PDFs are not distributed in the repository. The maintained browser library saves authorized PDFs only in private device storage; the clinical screen does not expose PDF replacement controls. “Clear visit” preserves saved guidelines. Clearing site data or using another browser/device requires the library to be maintained again. Check applicable permissions before republishing guideline content. The app is not affiliated with NCCN.

## GitHub Pages

Place all files in this folder, including guidelines.js and vendor/, in the repository's publishing root. In repository Settings → Pages, select Deploy from a branch, your publishing branch, and `/ (root)`. All asset URLs are relative, so both personal and project Pages URLs work. GitHub Pages hosting and repository availability depend on your account settings.

Do not commit patient information or guideline PDFs. A personal GitHub Pages URL is not an access-control mechanism. Use de-identified context in this tool.

## Verification

Check all disease and visit selections, editable draft preservation, rebuild confirmation, reset, clipboard behavior, local PDF persistence/removal, and narrow-screen layout before clinical use. Official external links may require login or may change.
