# RAC Commute Coach MVP Design

## Product shape

RAC Commute Coach is a local-first, mobile-first reading companion. It has four views: Day list, Day editor, Day reader, and backup. Navigation stays shallow and uses a fixed three-item bottom bar.

## Data and persistence

All Days use the requested schema and are stored as one versioned JSON payload in `localStorage`. Every state-changing interaction persists immediately. Export downloads the full payload; import validates and normalizes it before replacement.

## Markdown and questions

The editor accepts a full Markdown document. A parser splits second-level headings into sections, recognizes terminology-card headings, and extracts Q sections containing A-D options, Answer, and Explanation. Parsed questions are merged without overwriting existing answer state. Questions can also be edited manually.

## Reading and marking

Each section renders as Markdown with a compact marking control. Terminology cards are collapsible. Questions use large A-D buttons, hide answers by default, and support uncertainty plus the same four marks as sections.

## Question package

The package generator groups question and section marks, wrong answers, and free notes into a plain-text format designed for copying into ChatGPT.

## Visual direction

The interface uses a warm paper background, ink-green controls, large Chinese reading type, generous line height, and restrained borders. It avoids animation and dashboard ornament.

## Verification

Pure functions cover parsing, statistics, package generation, and data normalization. The production build and a mobile-sized browser walkthrough verify the complete workflow.
