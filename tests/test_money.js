const fs=require('fs');const h=fs.readFileSync(process.argv[2],'utf8');
const m=h.match(/function parseMoney\(s\)\{[\s\S]*?\n\}/)[0];
const logo=h.match(/function logoSeguro\(u\)\{[^\n]*\}/)[0];
const parseMoney=eval('('+m+')');
globalThis.S={config:{}};const logoSeguro=eval('('+logo+')');
const cases=[['1.500',1500],['R$ 1.234.567',1234567],['1.500,25',1500.25],['1,175.04',1175.04],['12,5',12.5],['12.50',12.5],['0,99',0.99],['100',100]];
let bad=0;for(const [i,o] of cases){const r=parseMoney(i);if(r!==o){bad++;console.log('FAIL',i,r,o)}}
for(const u of ['javascript:alert(1)','data:image/png;base64,AAAA" onerror="x','data:text/html;base64,AAA'])if(logoSeguro(u)){bad++;console.log('FAIL logo',u)}
if(!logoSeguro('data:image/png;base64,iVBORw0KGgo='))bad++;
console.log(bad?'FALHOU':'OK');process.exit(bad?1:0)
