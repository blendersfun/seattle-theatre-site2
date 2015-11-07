import db from './database';

console.log('\nstart tests');
console.log('---');

db.ProducingOrg.getAll().then(
	orgs => console.log('ProducingOrg.getAll: length: ', orgs.length, ', last: ', orgs.pop(), '\n---')
).catch(e => console.log(e));


db.ProducingOrg.getById(95).then(
	org => console.log('ProducingOrg.getById: found: ', org, '\n---')
).catch(e => console.log(e));


db.ProducingOrg.getById(0).then(
	org => console.log('ProducingOrg.getById: not found: ', org, '\n---')
).catch(e => console.log(e));


db.ProducingOrg.getByOrgAdminUserId(219).then(
	org => console.log('ProducingOrg.getByOrgAdminUserId: found: ', org, '\n---')
).catch(e => console.log(e));


db.ProducingOrg.getByOrgAdminUserId(0).then(
	org => console.log('ProducingOrg.getByOrgAdminUserId: not found: ', org, '\n---')
).catch(e => console.log(e));


/*

  "Create" operation test:
   1. create user
   2. create org admined by created user
   3. delete org
   4. delete user

 */

db.User.create({ email: "testUser1@gmail.com", password: "test123" }).then(
	user => {
		console.log('User.create: successful: ', user, '\n---');

		return db.ProducingOrg.create({ 
			userId: user.id, 
			name: 'TestOrg1', 
			missionStatement: 'To create garbage data.'
		});
	}
).then(
	({producingOrg, user}) => {
		console.log('ProducingOrg.create: successful: ', producingOrg, ' \nuser:', user, '\n---');

		return db.ProducingOrg.deleteById(producingOrg.id).then(
			rowCount => ({rowCount, user})
		);
	}
).then(
	({rowCount, user}) => {
		console.log('ProducingOrg.deleteById: successful: ', rowCount, '\n---');

		return db.User.deleteById(user.id);
	}
).then(
	rowCount => {
		console.log('User.deleteById: successful: ', rowCount, '\n---');
	}
).catch(e => console.log(e));
