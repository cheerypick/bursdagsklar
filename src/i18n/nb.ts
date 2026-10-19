/**
 * All Norwegian UI strings (spec §10). Screens import from here; nothing is hard-coded in screens.
 * To add a language later, add a file with the same shape and switch on locale.
 */
export const BRAND = 'bursdagsklar';

export const nb = {
  brand: BRAND,
  common: {
    next: 'Neste',
    back: 'Tilbake',
    change: 'Endre',
    done: 'Ferdig',
    step: (n: number, of: number) => `Steg ${n} av ${of}`,
  },
  welcome: {
    title: 'Hele bursdagen, klar.',
    lede: 'Fortell oss hvem som har bursdag. Vi lager invitasjonen, maten, kaken og programmet – og minner deg på resten.',
    cta: 'Planlegg bursdagen',
    note: 'Tar under ett minutt. Ingen innlogging.',
    heroAlt: 'Et pyntet bursdagsbord hjemme med kake, ballonger og pastellfarger',
    continueDraft: 'Fortsett der du slapp',
  },
  name: {
    title: 'Hvem har bursdag?',
    lede: 'Bare fornavnet. Det kommer på invitasjonen.',
    placeholder: 'Fornavn',
    label: 'Fornavn på bursdagsbarnet',
  },
  age: {
    title: (navn: string) => `Hvor gammel blir ${navn}?`,
    lede: 'Alderen styrer leker, mengder og hvor lang festen bør være.',
    label: (n: number) => `${n} år`,
  },
  date: {
    title: 'Når er festen?',
    lede: 'Vi regner ut fristene bakover fra datoen.',
    placeholder: 'For eksempel 8. november',
    label: 'Dato for festen',
    youWrote: 'Du skrev',
    pickInstead: 'Velg i kalenderen',
    time: (range: string) => `Kl. ${range}`,
    fits: (alder: number, tekst: string) => `Passer for ${alder}-åringer: ${tekst}`,
    start: 'Start',
    end: 'Slutt',
    shortNotice: 'Det er kort tid, men det går. Vi lager en kortere plan.',
  },
  kids: {
    title: 'Hvor mange barn inviterer dere?',
    lede: (navn: string) => `Uten ${navn}. Voksne teller vi når svarene kommer.`,
    unit: 'barn',
    fewer: 'Færre barn',
    more: 'Flere barn',
    hintSmall:
      'Hele avdelingen? Mange barnehager har som regel at alle i gruppa, eller alle jentene eller guttene, blir invitert.',
    hintSchool:
      'Hele klassen? Mange skoler har som regel at alle i klassen, eller alle jentene eller guttene, blir invitert.',
  },
  theme: {
    title: (navn: string) => `Hva er ${navn} opptatt av nå?`,
    lede: 'Temaet går igjen i invitasjonen, kaken, piñataen og skattejakten.',
    cta: 'Lag planen',
  },
  ready: {
    title: (gen: string) => `${gen} fest er klar.`,
    lede: (dager: number, n: number) =>
      `Alt det tunge er gjort. Du har ${dager} ${dager === 1 ? 'dag' : 'dager'} og ${n} ${n === 1 ? 'ting' : 'ting'} å gjøre denne uka.`,
    invite: 'Invitasjon og melding til foreldrene',
    todos: 'Gjøremål med datoer',
    cta: 'Se planen',
  },
  plan: {
    eyebrow: (tema: string) => `Hjemmebursdag · ${tema}`,
    title: (gen: string, alder: number) => `${gen} ${alder}-årsdag`,
    meta: (dato: string, tid: string, barn: number) => `${dato} · kl. ${tid} · ${barn} barn`,
    section: 'Alt til festen',
    newParty: 'Ny fest',
    confirmNew: 'Vil du starte en ny fest? Denne festen slettes fra telefonen.',
    confirmYes: 'Ja, start på nytt',
    confirmNo: 'Avbryt',
    allDone: 'Alt er gjort. Kos dere på festen!',
    cards: {
      invite: { title: 'Invitasjon', sub: 'Kort, tekst og melding til foreldrene', badge: 'Klar til å sendes' },
      food: { title: 'Mat', sub: 'Hovedrett, saft, frukt og kake – mengder som holder', badgeChoose: 'Velg meny' },
      cake: { title: 'Kake' },
      programme: { title: 'Program og leker' },
      todo: { title: 'Gjøremål', sub: 'Alt du må huske, med datoer', badge: (n: number) => `${n} denne uka` },
    },
  },
  todo: {
    title: 'Gjøremål',
    lede: 'Alt du må huske på, i riktig rekkefølge. Handling er bare to av punktene.',
    counter: (x: number, y: number) => `${x} av ${y} gjort`,
    markDone: (t: string) => `Marker som gjort: ${t}`,
    markUndone: (t: string) => `Marker som ikke gjort: ${t}`,
    deadline: 'Frist',
    homeTitle: 'Har dere dette hjemme?',
    homeLede: 'Trykk på det dere har. Da forsvinner det fra handlelista.',
    removed: 'Fjernet fra handlelista',
    added: 'Lagt til på handlelista',
  },
  home: {
    grill: 'Grill',
    langpanne: 'Langpanne',
    bursdagskrone: 'Bursdagskrone',
    'laken-fiskedam': 'Laken til fiskedam',
    fiskestang: 'Fiskestang',
    muffinsformer: 'Muffinsformer',
    saftdispenser: 'Saftdispenser',
    kakelys: 'Kakelys',
    'pappkrus-og-fat': 'Pappkrus og fat',
    ballonger: 'Ballonger',
    pizzahjul: 'Pizzahjul',
    'stor-kjele': 'Stor kjele',
  },
  tabs: { plan: 'Planen', todo: 'Gjøremål', day: 'Festdagen' },
  soon: {
    eyebrow: 'Kommer snart',
    invite: {
      title: 'Invitasjon',
      text: 'Her kommer det ferdige invitasjonskortet, teksten til foreldregruppa og påminnelsene. Alt er skrevet på forhånd og fylles ut med navn, dato og adresse.',
    },
    food: {
      title: 'Mat',
      text: 'Her velger du hovedrett: grillpølser, wienerpølser, pizza, taco eller din egen rett. Vi regner ut mengdene med litt ekstra, og lager handlelista.',
    },
    cake: { title: 'Kake', text: 'Her kommer kaken med oppskrift tilpasset antall gjester, og muffins til de minste.' },
    programme: {
      title: 'Program og leker',
      text: 'Her kommer et ferdig program med klokkeslett, leker, piñata og skattejakt.',
    },
    day: {
      title: 'Festdagen',
      text: 'På selve dagen samler vi alt i riktig rekkefølge: når du skal starte, hva som må være klart og hvem som har allergier.',
    },
    backToPlan: 'Tilbake til planen',
  },
  notFound: { title: 'Denne siden finnes ikke', cta: 'Til forsiden' },
  loading: 'Laster …',
};
