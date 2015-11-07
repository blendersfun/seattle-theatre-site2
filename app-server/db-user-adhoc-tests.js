import db from './database';

console.log('\nstart tests');
console.log('---');

db.User.getById(215).then(
	user => console.log('User.getById: existing user: ', user, '\n---')
).catch(e => console.log(e));

db.User.getById(1).then(
	user => console.log('User.getById: user not found: ', user, '\n---')
).catch(e => console.log(e));

db.User.getById("abc").then(
	user => console.log('User.getById: bad arg: ', user, '\n---')
).catch(e => console.log(e));

db.User.getIdAndPasswordByEmail("two.a.ron@gmail.com").then(
	result => console.log('User.getIdAndPasswordByEmail: exists: ', result, '\n---')
).catch(e => console.log(e));

db.User.getIdAndPasswordByEmail("x@gmail.com").then(
	result => console.log('User.getIdAndPasswordByEmail: does not exist: ', result, '\n---')
).catch(e => console.log(e));

db.User.create({ email: "testUser1@gmail.com", password: "test123" }).then(
	user => {
		console.log('User.create: successful: ', user, '\n---');

		return db.User.create({ email: "testUser1@gmail.com", password: "test123" }).catch(
			err => ({err, user})
		);
	}
).then(
	({err, user}) => {
		console.log('User.create: duplicate error: ', err, '\n---');

		return db.User.deleteById(user.id);
	}
).then(
	rowCount => {
		console.log('User.delete: ', rowCount, '\n---');
	}
).catch(e => console.log(e));
