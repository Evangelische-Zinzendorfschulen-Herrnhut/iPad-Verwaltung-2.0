import sqlite3,json,pathlib
root=pathlib.Path(__file__).parent
people=json.loads((root/'people.json').read_text())
c=sqlite3.connect('file:db/iPad-Verwaltung.db?mode=ro',uri=True)
c.row_factory=sqlite3.Row
out=[]
for p in people:
    uid=p['legacy_user_id']; email=p['email']
    p['legacy_person']=[dict(x) for x in c.execute('select * from User where UserID=?',(uid,))]
    p['legacy_sets']=[dict(x) for x in c.execute('select * from Sets where UserID=? or (Email is not null and lower(Email)=lower(?))',(uid,email))]
    p['legacy_history']=[dict(x) for x in c.execute('select * from SetUserZuordnung where UserID=?',(uid,))]
    out.append(p)
(root/'analysis.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
for p in out:
    print(p['first_name'],p['last_name'],p['legacy_user_id'], 'Sets:',[(x['SetID'],x['SetStatus'],x['UserID']) for x in p['legacy_sets']], 'History:',[(x['SetID'],x['AusgabeDatum'],x['RueckgabeDatum']) for x in p['legacy_history']], 'Note:',[(x['Anmerkung']) for x in p['legacy_person']])
