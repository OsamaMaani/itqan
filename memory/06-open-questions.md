# 06 — Open Questions

Only **product** questions live here — how the owner wants to use Itqan. Technical questions are
decided by the building session and recorded as ADRs. When answered, mark **ANSWERED** with the
date and keep the text.

---

**Q1. Should the week start on Saturday?** Defaulted to Saturday (ADR-009). Sunday or Monday are
one tap away in Settings. *Owner: owner. Blocks: nothing.*

**Q2. Arabic interface?** The UI is English (he wrote the brief in English). An Arabic/RTL UI is
roughly a day of work if wanted. *Owner: owner. Blocks: S2-07.*

**Q3. Will you use it on more than one device, or share it soon?** Decides when Stage 4 (sync /
accounts) is worth building. *Owner: owner. Blocks: Stage 4.*

**Q4. How do you count Quran revision — juz, hizb, pages, or surahs? Revision only, or also new
memorisation?** Shapes the Stage 3 revision map. *Owner: owner. Blocks: S3-01.*

**Q5. Plan around prayer times?** Today could group tasks by "after Fajr / after Dhuhr / …"
instead of morning/afternoon/evening, with local prayer times. *Owner: owner. Blocks: nothing yet.*

**Q6. ~~iPhone access and sync — which approach?~~ ANSWERED 2026-10-16:** GitHub sync — built
as ADR-016, iPhone reminders via Calendar export (ADR-017). Original text: Options were laid out in chat on 2026-10-16
(recommended: private GitHub repo as a free sync store + the app on GitHub Pages installed on the
iPhone). Nothing built until the owner chooses. *Owner: owner. Blocks: Stage 4.*

**Q7. Photos in memories?** Needs IndexedDB storage and binary-safe backups (ADR-014).
*Owner: owner. Blocks: S2-12.*
