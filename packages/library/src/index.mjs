const catalog={
 coil:{label:'Contactor coil',terminals:['A1','A2'],prefix:'K'},
 switch:{label:'Switch contact',terminals:['13','14'],prefix:'S'},
 motor:{label:'Three-phase motor',terminals:['U','V','W','PE'],prefix:'M'},
 terminal:{label:'Feed-through terminal',terminals:['1','2'],prefix:'X'}
};
export function symbolDefinition(key){if(!Object.hasOwn(catalog,key))throw new Error('Unknown symbol');return structuredClone({key,version:1,...catalog[key]})}
export function listSymbols(){return Object.keys(catalog).map(symbolDefinition)}
