const guidelineIndex = {
  "ovarian": {
    "version": "4.2026",
    "date": "2026-04-10",
    "sha256": "8ae65eeb0653244174e878ad05da985c85b300776127c148170ae04a08513525",
    "pages": [
      [7, "OV-1 · Clinical presentation / workup"],
      [8, "OV-2 · Primary treatment"],
      [9, "OV-3 · Diagnosis after previous surgery"],
      [10, "OV-4 · Pathologic staging"],
      [11, "OV-5 · Post-primary / maintenance therapy"],
      [12, "OV-6 · Monitoring / recurrence workup"],
      [13, "OV-7 · Platinum-resistant disease"],
      [14, "OV-8 · Platinum-sensitive disease"],
      [34, "OV-A · Principles of imaging"],
      [43, "OV-C · Pathology / molecular analysis"],
      [47, "OV-D · Systemic therapy"],
      [67, "OV-F · WHO histologic classification"]
    ]
  },
  "vaginal": {
    "version": "2.2026",
    "date": "2025-12-04",
    "sha256": "51bb07d743547cca2b7556dd76131db2e6a1d357563b8f50665f4f0298b9008b",
    "pages": [
      [
        7,
        "VAG-1 \u00b7 Workup"
      ],
      [
        8,
        "VAG-2 \u00b7 Primary treatment"
      ],
      [
        9,
        "VAG-3 \u00b7 Postoperative treatment"
      ],
      [
        10,
        "VAG-4 \u00b7 Surveillance"
      ],
      [
        11,
        "VAG-5 \u00b7 Locoregional recurrence"
      ],
      [
        12,
        "VAG-6 \u00b7 Distant disease"
      ],
      [
        15,
        "VAG-B \u00b7 Imaging"
      ],
      [
        23,
        "VAG-D \u00b7 Systemic therapy"
      ]
    ]
  },
  "cervical": {
    "version": "2.2026",
    "date": "2025-11-10",
    "sha256": "5c430a9969b110159c83092770cfbe64c6a7f576c406b90a91d8edc659f24cb9",
    "pages": [
      [
        10,
        "CERV-1 \u00b7 Workup"
      ],
      [
        11,
        "CERV-2 · Stage IA1, IA2, IB1, IB2 — Fertility-Sparing Primary Treatment"
      ],
      [
        13,
        "CERV-3 · Stage IA1 — Non-Fertility-Sparing Primary Treatment"
      ],
      [
        15,
        "CERV-4 · Stage IA2, IB1 (+ conservative surgery criteria) — Non-Fertility-Sparing Primary Treatment"
      ],
      [
        16,
        "CERV-5 · Stage IB1 (− conservative surgery criteria), IB2, IB3, IIA1, IIA2 — Primary Treatment"
      ],
      [
        17,
        "CERV-6 \u00b7 Adjuvant treatment"
      ],
      [
        18,
        "CERV-7 · Stage IIB, IIIA, IIIB, IIIC1–2, IVA — Primary Treatment"
      ],
      [
        19,
        "CERV-8 \u00b7 Incidental finding after hysterectomy"
      ],
      [
        21,
        "CERV-10 \u00b7 Surveillance"
      ],
      [
        22,
        "CERV-11 \u00b7 Locoregional recurrence"
      ],
      [
        23,
        "CERV-12 · Stage IVB or Recurrence with Distant Metastases"
      ],
      [
        34,
        "CERV-B \u00b7 Imaging"
      ],
      [
        56,
        "CERV-E · Sedlis Criteria"
      ],
      [
        57,
        "CERV-F \u00b7 Systemic therapy"
      ],
      [
        63,
        "ST-1 \u00b7 FIGO cervical cancer staging (2018)"
      ]
    ]
  },
  "uterine": {
    "version": "3.2026",
    "date": "2026-06-16",
    "sha256": "a9b9722053e719c7f33bd561a79ae1aef64b3c7c70c424b7bc4eaec54ae9109b",
    "pages": [
      [
        10,
        "UN-1 \u00b7 Initial evaluation"
      ],
      [
        11,
        "ENDO-1 \u00b7 Disease limited to uterus"
      ],
      [
        12,
        "ENDO-2 \u00b7 Cervical involvement"
      ],
      [
        13,
        "ENDO-3 \u00b7 Extrauterine disease"
      ],
      [
        14,
        "ENDO-4 \u00b7 Adjuvant treatment"
      ],
      [
        19,
        "ENDO-8 \u00b7 Fertility-sparing criteria"
      ],
      [
        20,
        "ENDO-9 \u00b7 Surveillance"
      ],
      [
        21,
        "ENDO-10 \u00b7 Locoregional recurrence"
      ],
      [
        22,
        "ENDO-11 \u00b7 Serous carcinoma"
      ],
      [
        23,
        "ENDO-12 \u00b7 Clear cell carcinoma"
      ],
      [
        24,
        "ENDO-13 \u00b7 Undifferentiated / dedifferentiated"
      ],
      [
        25,
        "ENDO-14 \u00b7 Carcinosarcoma"
      ],
      [
        30,
        "ENDO-B \u00b7 Imaging"
      ],
      [
        38,
        "ENDO-D \u00b7 Systemic therapy"
      ],
      [
        45,
        "UTSARC-1 \u00b7 Sarcoma pathway"
      ]
    ]
  }
};

const referenceSections = {
  ovarian: {
    staging: [7, 9, 10, 34, 43, 67],
    treatment: [8, 11, 12, 13, 14, 47]
  },
  uterine: {
    staging: [10, 11, 12, 13, 30],
    treatment: [14, 19, 20, 21, 22, 23, 24, 25, 38, 45]
  },
  cervical: {
    staging: [63, 10, 34],
    treatment: [11, 13, 15, 16, 17, 18, 19, 21, 22, 23, 56, 57]
  },
  vaginal: {
    staging: [7, 15],
    treatment: [8, 9, 10, 11, 12, 23]
  }
};
