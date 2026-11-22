import type { Messages } from './es'

export const en: Messages = {
 key:'Key',chord:'Chord',allOf:(r:string)=>`All ${r} chords`,libHelp:'Tap a chord to use it above; ‹ › for its variations.',triads:'Triads',sevenths:'7ths',listen:'▶ Play',notes:'Notes',intervals:'Intervals',back:'◀ Back',walk:'Next ▶',hearBoth:'Play the change',progressions:'Progressions',pickKey:'Pick a key',wheelHelp:'Outer ring: major keys. Middle ring: minor keys. Yellow marks the chords in the chosen key.',anyChord:'Any chord',settings:'Settings',language:'Language',notation:'Note names',capo:'Capo',lefty:'Left-handed',no:'No',yes:'Yes',major:'major',minor:'minor',chordsIn:'Chords in',position:'Position',of:'of',frets:'frets',open:'open',easy:'easy',mid:'medium',hard:'hard',shape:'shape',bass:'bass',root:'Root',third:'Third',fifth:'Fifth',seventh:'Sixth / seventh',color:'Colour (2, 4, 9)',bigDots:'Large dots: the chosen position',inv:['Root position','1st inversion','2nd inversion','3rd inversion','4th inversion'],next:'To the next chord',dDown:'Down a 3rd',dUp:'Up a 3rd',dStep:'Next degree',dVar:'Variant',stay1:'stays',stayN:'stay',move1:'Move one finger',moveN:(n:number)=>`Move ${n} fingers`,same:'Same position.',onStr:'on string',down:'down',up:'up',fret1:'fret',fretN:'frets',semi1:'semitone',semiN:'semitones',becomes:(a:string,b:string,c:string,d:string)=>`the ${a} of ${b} becomes the ${c} of ${d}`,adds:'add',drops:'stops sounding',sig0:'No sharps or flats',sharps:(n:number)=>`${n} sharp${n>1?'s':''}`,flats:(n:number)=>`${n} flat${n>1?'s':''}`,sigL:'Key signature',relL:'Relative',scaleL:'Scale',neighL:'Neighbours (share 6 of 7)',capoOn:(n:number)=>`Capo at fret ${n}: frets are counted from it.`,reent:'Re-entrant tuning: one string is higher than the next, so the real bass may not be on the first string.',pianoNote:'Two-octave keyboard from C3. The ringed key is the root.',harm:'major V (harmonic minor)',
  navChords:'Chords',navPractice:'Practice',navKey:'Key',navMine:'Mine',
  noPosition:'No position for this bass on this instrument',
  search:'Search a chord: C, G7, Am/E…',
  overBass:'over',
  importErrors:{invalid_json:'The file is not valid JSON.',wrong_app:'This file is not an Eduka Music backup.',unsupported_version:'This backup is from an unsupported version.',invalid_shape:'The file does not have the expected format.'},
  importDone:'Backup imported',exportData:'Export backup',importData:'Import backup',
  favorites:'Favourites',savedProgressions:'Saved progressions',
  iv:{R:'root','2':'2nd','9':'9th','♭3':'minor 3rd','3':'3rd','4':'4th','♭5':'flat 5th','5':'5th','♯5':'sharp 5th','6':'6th','♭♭7':'diminished 7th','♭7':'minor 7th','7':'major 7th'},
  q:{maj:'major',m:'minor',dim:'diminished',aug:'augmented',sus2:'suspended 2',sus4:'suspended 4',maj7:'major seventh','7':'dominant seventh',m7:'minor seventh',m7b5:'half-diminished',dim7:'diminished seventh','7sus4':'seventh sus4','6':'sixth',m6:'minor sixth',add9:'add9','9':'ninth',m9:'minor ninth',maj9:'major ninth'},
  g:{T:'Triads',S:'Sevenths',C:'Colour'},
  P:{pop:'Pop',jazz:'Jazz',fifties:'Fifties',blues:'Blues / rock',cycle:'Cycle of thirds',anda:'Andalusian cadence',minc:'Classic minor',ballad:'Minor ballad'},
  inst:{guitar:'Guitar',piano:'Piano',ukulele:'Ukulele',cuatro:'Venezuelan cuatro',timple:'Timple',bandurria:'Bandurria'}
}


