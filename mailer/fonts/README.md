# Fonturile facturilor PDF

`Poppins-Regular.ttf` și `Poppins-Bold.ttf` sunt puse în fiecare factură PDF (vezi `invoice-pdf.mjs`).
Le folosim pentru că au toate literele românești (ă, â, î, ș, ț), pe care fonturile standard din PDF
nu le au.

- Font: Poppins, Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins)
- Licență: SIL Open Font License, versiunea 1.1 (https://openfontlicense.org).
  Fontul se poate folosi, modifica (cum am făcut mai jos), include și distribui gratuit, inclusiv în
  documente comerciale; doar nu se vinde separat. Poppins nu are „nume rezervat” (nota de copyright
  nu declară unul), așa că varianta micșorată își poate păstra numele.

## De ce sunt mai mici decât originalul (~26 KB în loc de ~160 KB)

Poppins are și literele scrierii devanagari (India) și tabele pentru ligaturi și kerning, de care o
factură românească nu are nevoie. Le-am scos ca fiecare PDF să fie de ~3 ori mai mic (contează: PDF-urile
se păstrează în baza de date, migrația 030). Au rămas toate literele latinești (inclusiv ă, â, î, ș, ț),
cifrele, semnele de punctuație și simbolurile (€, „”, –, …). Desenul literelor e neschimbat.

Le-am făcut cu fontTools, din fișierele originale de pe Google Fonts:

```
pyftsubset Poppins-Regular.ttf --unicodes-file=litere.txt --layout-features="" \
  --drop-tables+=GSUB,GPOS,GDEF,kern,DSIG --no-hinting --name-IDs='*' --name-languages='*' \
  --notdef-outline --output-file=Poppins-Regular.ttf
```

`litere.txt` = toate caracterele din Poppins, fără cele devanagari (U+0900–097F, U+A8E0–A8FF,
U+1CD0–1CFF). La fel pentru `Poppins-Bold.ttf`.
