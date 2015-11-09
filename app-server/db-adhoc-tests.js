import db from './database';

console.log('\nstart tests');
console.log('---');

db.Person.getById(1).then(
	person => console.log('Person.getById: exists: ', person, '\n---')
).catch(e => console.log(e));

db.Person.search(['ja', 'au']).then(
	list => console.log('Person.search: (ja, au):', list, '\n---')
).catch(e => console.log(e));

db.Person.search(['jen']).then(
	list => console.log('Person.search: (jen):', list, '\n---')
).catch(e => console.log(e));

db.Person.search(['a']).then(
	list => console.log('Person.search: (a):', list, '\n---')
).catch(e => console.log(e));
