import { computeAge, esaminaData, ETA_MINIMA, formattaData } from '@/lib/age';

/**
 * LA CASELLA DELLA DATA DI NASCITA.
 *
 * Segnalazione del collaudo (Alessio): «migliorare casella per data di nascita
 * nella schermata di registrazione». Era un campo di testo libero: chi
 * scriveva 24-12-1999 si vedeva rifiutare una data giusta, e l'errore arrivava
 * solo dopo aver premuto «Crea account».
 */

describe('le barre le mette l app', () => {
  it('mentre si scrive, cifra dopo cifra', () => {
    expect(formattaData('2')).toBe('2');
    expect(formattaData('24')).toBe('24');
    expect(formattaData('241')).toBe('24/1');
    expect(formattaData('2412')).toBe('24/12');
    expect(formattaData('241219')).toBe('24/12/19');
    expect(formattaData('24121999')).toBe('24/12/1999');
  });

  it('accetta quello che la gente scrive davvero', () => {
    // Sono i formati che prima venivano RIFIUTATI pur essendo la stessa data.
    expect(formattaData('24-12-1999')).toBe('24/12/1999');
    expect(formattaData('24 12 1999')).toBe('24/12/1999');
    expect(formattaData('24/12/1999')).toBe('24/12/1999');
  });

  it('non lascia scrivere oltre la data', () => {
    expect(formattaData('241219999999')).toBe('24/12/1999');
  });

  it('cancellare funziona: non rimette le barre da sola', () => {
    // Se l'utente cancella fino a "24/1", riformattare deve dare "24/1" e non
    // "24/1/" — altrimenti la barra si ripresenta e non si riesce a tornare
    // indietro.
    expect(formattaData('24/1')).toBe('24/1');
    expect(formattaData('24/')).toBe('24');
  });
});

describe('cosa dice il campo mentre si scrive', () => {
  const oggi = new Date('2026-08-25T12:00:00Z');

  it('finché è incompleta non accusa di niente', () => {
    // Dare dell'errore a chi ha scritto due cifre su otto è solo fastidioso.
    expect(esaminaData('24', oggi).stato).toBe('incompleta');
    expect(esaminaData('24/12/19', oggi).stato).toBe('incompleta');
  });

  it('una data maggiorenne va bene e dice gli anni', () => {
    const esito = esaminaData('24/12/1999', oggi);
    expect(esito.stato).toBe('ok');
    if (esito.stato === 'ok') expect(esito.anni).toBe(26);
  });

  it('distingue «data inesistente» da «sei minorenne»', () => {
    // Prima erano lo stesso messaggio, e sono due problemi diversi: uno si
    // corregge, l'altro no.
    expect(esaminaData('31/02/1999', oggi)).toEqual({
      stato: 'non-valida',
      motivo: 'Questa data non esiste. Controlla giorno e mese.',
    });
    expect(esaminaData('01/01/2020', oggi).stato).toBe('troppo-giovane');
  });

  it('il giorno del diciottesimo compleanno si entra', () => {
    // Il caso di confine: chi compie 18 anni oggi non deve essere respinto.
    const esito = esaminaData('25/08/2008', oggi);
    expect(esito.stato).toBe('ok');
    if (esito.stato === 'ok') expect(esito.anni).toBe(ETA_MINIMA);
  });

  it('il giorno prima, no', () => {
    expect(esaminaData('26/08/2008', oggi).stato).toBe('troppo-giovane');
  });

  it("l'età si calcola alla data che riceve, non a quella del computer", () => {
    // ⚠️ Questo caso esiste perché i due test qui sopra hanno mentito per un
    // giorno. `esaminaData` riceveva `oggi` e lo usava solo per scartare le
    // date future: l'età la chiedeva a `computeAge`, che leggeva `new Date()`
    // per conto suo. I due casi di confine passavano solo finché la data finta
    // del test coincideva con quella vera della macchina — e il 26/08/2026
    // «il giorno prima, no» ha cominciato a fallire da solo.
    //
    // Un test che dipende dall'orologio di chi lo esegue dice la verità un
    // giorno su trecentosessantacinque. Queste due date sono lontane da
    // qualunque «oggi», quindi non possono più sbagliare per coincidenza.
    const nato = new Date(2000, 5, 15); // 15 giugno 2000
    expect(computeAge(nato, new Date(2020, 5, 14))).toBe(19); // vigilia
    expect(computeAge(nato, new Date(2020, 5, 15))).toBe(20); // compleanno
    expect(computeAge(nato, new Date(2020, 5, 16))).toBe(20); // il giorno dopo
  });

  it('intercetta l anno scritto male', () => {
    expect(esaminaData('24/12/1099', oggi).stato).toBe('non-valida');
  });
});
