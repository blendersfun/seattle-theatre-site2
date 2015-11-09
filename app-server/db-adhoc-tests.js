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

db.Person.create({
	firstName: 'John', 
	middleName: 'Test1', 
	lastName: 'Doe'
}).then(
	personId => {
		console.log('Person.create: ', personId, '\n---');

		return db.Person.addAsCollaborator(personId, 17, 1)
			.then(insertId => ({personId, insertId}));
	}
).then(
	({personId, insertId}) => {
		console.log('Person.addAsCollaborator: ', insertId, '\n---');

		return db.Person.getCollaboratorWithShowAndRole(17, 1)
			.then(person => ({personId, person}))
	}
).then(
	({personId, person}) => {
		console.log('Person.getCollaboratorWithShowAndRole: ', person, '\n---');

		return db.Person.deleteById(personId);
	}
).then(
	rowCount => console.log('Person.deleteById: ', rowCount, '\n---')
).catch(e => console.log(e));
