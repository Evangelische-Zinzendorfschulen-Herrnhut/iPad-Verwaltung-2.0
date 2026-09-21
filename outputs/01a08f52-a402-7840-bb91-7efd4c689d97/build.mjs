import fs from 'node:fs/promises';
import {Workbook,SpreadsheetFile} from '@oai/artifact-tool';
const dir=decodeURIComponent(new URL('.',import.meta.url).pathname);
const people=JSON.parse(await fs.readFile(dir+'analysis.json','utf8'));
const groups=new Map();
for(const p of people){const key=p.first_name+' '+p.last_name;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(p);}
const rows=[];
for(const [name,ps] of groups){
 let hints=[],sources=[];
 for(const p of ps){
  for(const h of p.history||[]){hints.push(`Historisch: Set ${h.set}, zurück ${h.returned||'unbekannt'}.`);sources.push('Supabase: set_person_assignment');}
  for(const s of p.legacy_sets){hints.push(`SQLite: Set ${s.SetID}, Status ${s.SetStatus}; nur Altbestand.`);sources.push('SQLite: Sets (UserID/E-Mail)');}
 }
 if(name==='Ruslana Jäger'){hints=['Importnotiz: früher Set 400, später Lehrer-iPad; aktuelle Setnummer unbekannt. Zwei Datensätze (13/32), hier eine Zeile.'];sources=['Supabase/SQLite: Personennotiz UserID 13 und 32'];}
 if(['Matthias Aust','Maria Seidel'].includes(name)){hints=['Eigenes iPad laut Personen-/Importnotiz. Kein Schul-Set dokumentiert.'];sources=['Supabase person / SQLite User.Anmerkung'];}
 if(!hints.length){hints=['Kein Set-Hinweis in den geprüften Personen-, Set- und Ausleihdaten.'];sources=['Supabase + SQLite: User, Sets, SetUserZuordnung'];}
 rows.push([name,null,null,null,[...new Set(hints)].join(' '),[...new Set(sources)].join('; '),ps.map(p=>p.legacy_user_id).sort((a,b)=>a-b).join(', ')]);
}
if(rows.length!==33)throw Error('Expected 33 people');
const w=Workbook.create(),s=w.worksheets.add('Setnummern klären');s.showGridLines=false;
s.getRange('A2').values=[['Lehrkräfte – Setnummern ergänzen']];
s.getRange('A3').values=[['33 Personen · Stand 15.09.2026 · Gelbe Felder ausfüllen. Historische Hinweise sind keine aktuellen Zuordnungen.']];
s.getRange('A4').values=[['Quellen: Supabase iPadVerwaltung2.0 und db/iPad-Verwaltung.db (nur lesend). Keine Datenbankänderung durch diese Datei.']];
s.getRange('A6:G6').values=[['Name','Setnummer bestätigt','Ergebnis bestätigt','Eigene Bemerkung','Vorhandene Hinweise','Quelle des Hinweises','Legacy-UserID']];
s.getRange('A7:G39').values=rows;
s.getRange('A1:G39').format.font={name:'Arial',size:11,color:'#243044'};
s.getRange('A1:G39').format.verticalAlignment='center';
s.getRange('A2').format.font={name:'Arial',size:16,bold:true,color:'#243044'};
s.getRange('A3:A4').format.font={name:'Arial',size:10,color:'#586574'};
const widths=[240,135,180,240,560,260,110];
for(let i=0;i<widths.length;i++)s.getRangeByIndexes(0,i,39,1).format.columnWidthPx=widths[i];
s.getRange('A6:G6').format={fill:'#34465A',font:{name:'Arial',size:11,bold:true,color:'#FFFFFF'},wrapText:true,rowHeight:36};
s.getRange('A7:G39').format.wrapText=true;s.getRange('A7:G39').format.rowHeight=64;
for(let i=7;i<=39;i++)if(i%2===1)s.getRange(`A${i}:G${i}`).format.fill='#F1F4F7';
s.getRange('B7:D39').format.fill='#FFF2CC';
s.getRange('B7:B39').setNumberFormat('0');
s.getRange('G7:G39').setNumberFormat('@');
s.getRange('C7:C39').dataValidation={rule:{type:'list',values:['Set bestätigt','Eigenes iPad','Kein Schul-Set','Noch unklar']}};
s.dataValidations.add({range:'B7:B39',rule:{type:'whole',operator:'between',formula1:1,formula2:99999}});
const t=s.tables.add('A6:G39',true,'LehrerSetklaerung');t.showFilterButton=true;
s.freezePanes.freezeRows(6);
w.recalculate();
console.log((await w.inspect({kind:'table',range:"'Setnummern klären'!A6:G10",tableMaxRows:5,tableMaxCols:7,maxChars:2500})).ndjson);
const output=await SpreadsheetFile.exportXlsx(w);await output.save(dir+'Lehrer-Setnummern-Klaerung.xlsx');
for(const [name,range] of [['preview','A1:G12'],['preview-bottom','A30:G39']]){const img=await w.render({sheetName:s.name,range,scale:1,format:'png'});await fs.writeFile(dir+name+'.png',new Uint8Array(await img.arrayBuffer()));}
console.log('Exported 33 rows; blank input columns B-D; previews saved.');
