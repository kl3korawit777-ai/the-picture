---
title: CRISPR และ AlphaFold เทคโนโลยีที่สามารถปฏิวัติวงการ Bio-Tech และการแพทย์
dek: หลักการทำงาน การนำไปใช้ และข้อจำกัดของเครื่องมือตัดแต่งยีนกับ AI
  ทำนายโครงสร้างโปรตีน สองผลงานที่ได้รับรางวัลโนเบลสาขาเคมี
category: bioinformatics
date: 2026-11-11
status: published
featured: true
covers:
  - type: image
    src: /media/covers/mw8ztqep-imgyhwfc.jpg
    alt: CRISPR-Cas9 Gene Editing Modifying DNA Strand
    caption: CRISPR-Cas9 Gene Editing Modifying DNA Strand
    credit: stock.adobe.com
  - type: image
    src: /media/covers/mw8zx9e5-kikz3aku.jpg
    alt: CRISPR-CAS9 gene editing complex from Streptococcus pyogenes.
    caption: CRISPR-CAS9 gene editing complex from Streptococcus pyogenes.
    credit: stock.adobe.com
  - type: image
    src: /media/covers/mw8zzol9-s76jpwxo.jpg
    alt: 3D rendering of E3 ubiquitin-protein ligase HECTD1 as predicted by
      alphafold and colored according to confidence in the model.
    caption: 3D rendering of E3 ubiquitin-protein ligase HECTD1 as predicted by
      alphafold and colored according to confidence in the model.
    credit: stock.adobe.com
references:
  - "The Royal Swedish Academy of Sciences. Press release: The Nobel Prize in Chemistry 2020. 7 ตุลาคม 2020. https://www.nobelprize.org/prizes/chemistry/2020/press-release/"
  - "The Royal Swedish Academy of Sciences. Press release: The Nobel Prize in Chemistry 2024. 9 ตุลาคม 2024. https://www.nobelprize.org/prizes/chemistry/2024/press-release/"
  - "U.S. Food and Drug Administration. FDA Approves First Gene Therapies to Treat Patients with Sickle Cell Disease. 8 ธันวาคม 2023. https://www.fda.gov/news-events/press-announcements/fda-approves-first-gene-therapies-treat-patients-sickle-cell-disease"
  - "U.S. Food and Drug Administration. CASGEVY (exagamglogene autotemcel). https://www.fda.gov/vaccines-blood-biologics/casgevy"
  - "Abramson J, Adler J, Dunger J, et al. Accurate structure prediction of biomolecular interactions with AlphaFold 3. Nature. 2024;630(8016):493-500. doi:10.1038/s41586-024-07487-w"
  - "AlphaFold Protein Structure Database. EMBL-EBI และ Google DeepMind. https://alphafold.ebi.ac.uk/"
  - "European Molecular Biology Laboratory. AlphaFold reveals the structure of the protein universe. 28 กรกฎาคม 2022. https://www.embl.org/news/science/alphafold-200-million/"
  - "Meng H, Yan Y, Yi C, Li D, et al. Precise DNA base editing using AlphaFold3-based contact modelling. Nature. 2026;656(8127):463-473. doi:10.1038/s41586-026-10794-z"
  - "Musunuru K, Grandinette SA, Ahrens-Nicklas RC, et al. Patient-Specific In Vivo Gene Editing to Treat a Rare Genetic Disease. N Engl J Med. 2025. doi:10.1056/NEJMoa2504747"
  - "Wattanapanitch M, Damkham N, Potirat P, et al. One-step genetic correction of hemoglobin E/beta-thalassemia patient-derived iPSCs by the CRISPR/Cas9 system. Stem Cell Research & Therapy. 2018;9:46. doi:10.1186/s13287-018-0779-3"
  - "สำนักงานพัฒนาวิทยาศาสตร์และเทคโนโลยีแห่งชาติ. Genomics Thailand: Present and Future. 2022. https://www.nstda.or.th/nac/2022/wp-content/uploads/2022/04/Genomics-Thailand-Present-and-Future.pdf"
  - "ประกาศกระทรวงเกษตรและสหกรณ์ เรื่อง การรับรองสิ่งมีชีวิตที่พัฒนาจากเทคโนโลยีการปรับแต่งจีโนม เพื่อใช้ประโยชน์ในภาคการเกษตร พ.ศ. 2567. ราชกิจจานุเบกษา, 16 กรกฎาคม 2567"
short_title: CRISPR และ AlphaFold
lead: บทความนี้จะอธิบายหลักการทำงาน การนำไปใช้ประโยชน์ และข้อจำกัดของ CRISPR
  และ AlphaFold โดยอ้างอิงจากงานวิจัยและแหล่งข้อมูลที่เชื่อถือได้
description: หลักการทำงาน การนำไปใช้ประโยชน์ และข้อจำกัดของ CRISPR และ AlphaFold
---
## บทนำ {#intro}

เทคโนโลยีชีวภาพคือการนำสิ่งมีชีวิตหรือส่วนของสิ่งมีชีวิตมาใช้ประโยชน์ ตั้งแต่เรื่องใกล้ตัวอย่างการหมักไวน์หรือการใช้ยีสต์ทำขนมปัง ไปจนถึงการผลิตยารักษาโรคในปัจจุบัน

ช่วงกว่า 30 ปีที่ผ่านมา นับตั้งแต่โครงการถอดรหัสจีโนมมนุษย์ ([[hgp|Human Genome Project]]) เริ่มขึ้นในปี ค.ศ. 1990 และเสร็จสิ้นในปี ค.ศ. 2003 วงการนี้ก้าวหน้าไปมาก และมีเครื่องมือสองอย่างที่เปลี่ยนวิธีทำงานของนักวิทยาศาสตร์อย่างเห็นได้ชัด คือ

{{duo}}

**CRISPR (CRISPR-Cas9)**

เป็นเครื่องมือที่เกี่ยวข้องกับการตัดแต่งยีน ตัดต่อ แก้ไข หรือเปลี่ยนรหัสพันธุกรรม (DNA) ตรงตำแหน่งที่กำหนดได้ และมีความแม่นยำสูง

---

**AlphaFold**

เป็นระบบ AI ที่พัฒนาโดย Google DeepMind ใช้ทำนายว่าโปรตีนจะพับตัวเป็นโครงสร้างสามมิติแบบไหน ซึ่งช่วยให้นักวิทยาศาสตร์เข้าใจได้ว่าโปรตีนนั้นทำหน้าที่อย่างไร

{{/duo}}

ทั้งสองเทคโนโลยีได้รับการยอมรับในระดับสูงสุด โดย CRISPR ทำให้ Emmanuelle Charpentier และ Jennifer A. Doudna ได้รับรางวัลโนเบลสาขาเคมีในปี 2020

ต่อมาส่วนในปี 2024 Demis Hassabis และ John Jumper ได้รับรางวัลโนเบลสาขาเคมีจากผลงานการทำนายโครงสร้างโปรตีนด้วย AlphaFold ร่วมกับ David Baker จากผลงานการออกแบบโปรตีนด้วยคอมพิวเตอร์

## CRISPR {#crispr}

CRISPR ถูกดัดแปลงมาจากระบบภูมิคุ้มกันของแบคทีเรีย ซึ่งแบคทีเรียใช้จดจำและตัด DNA ของไวรัสที่เคยเข้ามารุกราน นักวิจัยจึงนำกลไกนี้มาปรับใช้ ให้ตัด DNA ได้ตรงตำแหน่งที่ต้องการ โดยเปลี่ยนแค่ลำดับของ [[grna|RNA นำทาง (guide RNA)]] เท่านั้น

จุดนี้เองที่ทำให้ CRISPR ใช้งานง่ายกว่าเครื่องมือแก้ไขยีนรุ่นก่อน เพราะเครื่องมือรุ่นเก่าต้องออกแบบและสร้างโปรตีนขึ้นมาใหม่ทุกครั้งที่จะเปลี่ยนตำแหน่งเป้าหมาย ซึ่งใช้ทั้งเวลาและงบประมาณสูง แต่ CRISPR เพียงเปลี่ยน RNA นำทางสายสั้น ๆ ก็เปลี่ยนเป้าหมายได้แล้ว การวิจัยจึงทำได้เร็วขึ้นและประหยัดกว่ามาก

ความท้าทายอยู่ที่การหาตำแหน่ง รหัสพันธุกรรมมนุษย์มี 3 พันล้านตัวอักษร ถ้าขึงเป็นเส้นตรงจะยาวราว 2 เมตร แต่จุดที่ต้องแก้มีขนาดแค่ 10 ถึง 20 ตัวอักษร

### ส่วนประกอบ {#parts}

| ส่วนประกอบ | หน้าที่ | เปรียบเสมือน |
| --- | --- | --- |
| Cas9 | เข้าไปตัด DNA ตรงจุดที่กำหนด เพื่อลบยีนที่ผิดปกติออก | กรรไกรโมเลกุล |
| guide RNA (gRNA) | เพื่อค้นหาตำแหน่งของ DNA ที่ต้องการแก้ไขในเซลล์ | GPS (RNA นำทาง) |
| [[pam\|PAM]] | เป็นลำดับ DNA สั้น ๆ ที่อยู่ติดกับเป้าหมาย Cas9 ต้องตรวจพบ หากไม่มี PAM ต่อให้รหัสตรงกัน Cas9 ก็จะไม่ทำงาน | ระบบรักษาความปลอดภัย |

{{figure src="" alt="[alt ภาพระบบ CRISPR-Cas9]" caption="ระบบ CRISPR-Cas9" credit="Bioneer (https://eng.bioneer.com)"}}

### กลไกการตัดและการซ่อมแซม {#mechanism}

1. Cas9 จับกับ gRNA แล้วสแกนหาDNAที่มี PAM
2. เมื่อพบ PAM และลำดับเป้าหมายจับคู่กับ gRNA Cas9 จะตัดดีเอ็นเอสายคู่ให้ขาดที่ตำแหน่งใกล้ PAM
3. เซลล์จะซ่อมแซมรอยขาดด้วยหนึ่งในสองวิธี

| วิธีซ่อมแซม | ลักษณะ |
| --- | --- |
| NHEJ (non-homologous end joining) | ต่อปลายขาดเข้าด้วยกันโดยตรง ไม่ต้องมีแม่แบบ และมักเกิดการเพิ่มหรือลดเบสเล็กน้อย |
| HDR (homology-directed repair) | ซ่อมโดยใช้DNAแม่แบบใส่เข้าไปแทนที่ |

{{mech}}

{{figure src="" alt="[alt ภาพกลไกการทำงานของ CRISPR-Cas9]" caption="กลไกการทำงานของ CRISPR-Cas9" credit="Iota Sciences (https://iotasciences.com)"}}

ยา CRISPR ตัวแรกของโลกชื่อ Casgevy ได้รับอนุมัติจากองค์การอาหารและยาสหรัฐเมื่อ 8 ธันวาคม 2023 สำหรับโรคเม็ดเลือดแดงรูปเคียว และตามด้วยโรคธาลัสซีเมียชนิดที่ต้องรับเลือดประจำ

หลัการของ Casgevy คือเอาเซลล์ต้นกำเนิดของผู้ป่วยออกมาแก้ไขนอกร่างกาย แล้วค่อยใส่กลับเข้าไป ข้อดีคือปลอดภัยเพราะเช็คได้ก่อน ข้อเสียคือใช้ได้แค่กับเซลล์ที่ดึงออกมาได้ จะเอาสมองหรือตับทั้งก้อนออกมาแก้ไขไม่ได้

{{figure src="" alt="[alt ภาพ Casgevy]" caption="Casgevy" credit="Vertex Pharmaceuticals (https://casgevy.com)"}}

## AlphaFold {#alphafold}

AlphaFold คือปัญญาประดิษฐ์ของ Google DeepMind ที่ทำนายรูปร่างสามมิติของโปรตีนจากรหัสพันธุกรรม

โปรตีนเกิดจากสายกรดอะมิโนที่พับตัวเป็นรูปร่างสามมิติเฉพาะ และรูปร่างจะเป็นตัวกำหนดหน้าที่

โปรตีนทำงานได้ตามรูปร่างที่มันพับตัว เหมือนลูกกุญแจที่ต้องมีร่องถูกต้องถึงจะไขแม่กุญแจได้ ถ้าอยากทำยามาจับโปรตีนตัวใดตัวหนึ่ง ต้องรู้รูปร่างของมันก่อน แต่การหารูปร่างเคยต้องฉายรังสีเอกซ์จากทุกทิศแล้วประกอบภาพ ใช้เวลาเป็นปีต่อหนึ่งโครงสร้าง และโปรตีนบางชนิดทำมาหลายสิบปีก็ยังไม่สำเร็จ

AlphaFold รับลำดับกรดอะมิโนของโปรตีน และข้อมูลเปรียบเทียบกับลำดับของโปรตีนใกล้เคียงจากสิ่งมีชีวิตอื่น (multiple sequence alignment) เข้าสู่โครงข่ายประสาทเทียมที่ฝึกจากโครงสร้างโปรตีนที่ทราบแล้ว แล้วให้ตำแหน่งสามมิติของอะตอมในโปรตีนออกมาโดยมี

วิธีการทำงานคล้ายกับ AI สร้างภาพ เวอร์ชันล่าสุดเริ่มจากกลุ่มอะตอมที่กระจายมั่ว แล้วค่อย ๆ จัดเรียงจนเป็นโครงสร้าง เวอร์ชัน 2 ทำนายได้แค่ตัวโปรตีน ส่วนเวอร์ชัน 3 ที่ออกเมื่อพฤษภาคม 2024 ทำนายได้ด้วยว่าโปรตีนจะจับกับยา กับดีเอ็นเอ หรือกับอาร์เอ็นเอ อย่างไร ซึ่งเป็นสิ่งที่วงการยาต้องการจริง

ตลอด 50 ปี นักวิทยาศาสตร์ทั่วโลกช่วยกันหาโครงสร้างได้ราว 200,000 ชิ้น AlphaFold ปล่อยออกมา 214 ล้านชิ้น ภายในเวลาไม่กี่ปี และเปิดให้ใช้ฟรี

### ค่า pLDDT {#plddt}

AlphaFold ให้ค่า pLDDT (0 ถึง 100) ต่อกรดอะมิโนแต่ละตำแหน่ง

| pLDDT | ความหมายโดยทั่วไป |
| --- | --- |
| มากกว่า 90 | มั่นใจสูงมาก ใช้ดูรายละเอียดของโครงสร้างได้ |
| 70 ถึง 90 | มั่นใจ รูปร่างหลักน่าเชื่อถือ |
| 50 ถึง 70 | มั่นใจต่ำ ควรตีความระมัดระวัง |
| น้อยกว่า 50 | มั่นใจต่ำมาก มักบริเวณที่ไม่มีรูปร่างตายตัว |

{{figure src="" alt="[alt ภาพค่า pLDDT]" caption="Evaluating the accuracy of model predictions. pLDDT confidence measure in the B factor field (a) N monomer, (b) N dimer, (c) PAE plot for N dimer, images were generated by UCSF ChimeraX, version 1.6.1." credit="ResearchGate (https://researchgate.net)"}}

## CRISPR และ AlphaFold ทำงานร่วมกันอย่างไร {#together}

Cas9 ก็คือโปรตีน และ AlphaFold คือเครื่องมือที่เข้าใจโปรตีนดีที่สุดเท่าที่มนุษย์มี

ปัญหาเรื้อรังของ CRISPR คือการตัดผิดตำแหน่ง ([[offtarget|off-target]]) บางครั้ง gRNA จับกับตำแหน่งที่คล้ายเป้าหมายแต่ไม่เหมือนทุกเบส ทำให้ Cas9 ตัดผิดตำแหน่ง ซึ่งเป็นประเด็นด้านความปลอดภัยสำคัญโดยเฉพาะในการรักษาโรค

อีกปัญหาคือขนาด การส่งยีนเข้าร่างกายมักใช้ไวรัสที่ถูกทำให้ไม่ก่อโรคเป็นพาหนะ แต่ไวรัสบรรจุของได้จำกัด และโปรตีน Cas ส่วนใหญ่ตัวใหญ่เกินกว่าจะยัดลงไปได้ มีทีมใช้ AlphaFold ย่อเอนไซม์ Cas13 ลงได้ 250 ถึง 270 กรดอะมิโน จนบรรจุลงไวรัสพาหนะได้

## ประเทศไทยจะใช้ประโยชน์อย่างไร {#thailand}

Genomics Thailand เริ่มปี 2019 ด้วยงบ 4,500 ล้านบาท ตั้งเป้าถอดรหัสพันธุกรรมคนไทย 50,000 ราย ครอบคลุมมะเร็ง โรคหายาก โรคเรื้อรัง โรคติดเชื้อ และการเลือกยาให้เหมาะกับพันธุกรรมแต่ละคน

อย่างไรก็ตาม นักวิจัยในวงการมองว่าช่องว่างที่แท้จริงอยู่ที่กำลังคนและโรงงานผลิต โรงงานต้นแบบของ BIOTEC ที่เปิดเมื่อปี 2023 มีขนาด 300 ลิตร ซึ่งเล็กมากเมื่อเทียบกับที่ยีนบำบัดต้องใช้ และงบประมาณส่วนใหญ่ยังไหลไปที่เทคโนโลยีปลายทางมากกว่างานวิจัยพื้นฐาน
