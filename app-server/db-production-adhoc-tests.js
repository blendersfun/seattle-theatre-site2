import db from './database';

console.log('\nstart tests');
console.log('---');

db.Production.getByShowId(108).then(
	production => console.log('Production.getByShowId: exists: ', production, '\n---')
).catch(e => console.log(e));

db.Production.getListByProducingOrgId(3).then(
	({upcomingProductions, pastProductions}) => console.log(
		'Production.getListByProducingOrgId: upcomingProductions.length: ', upcomingProductions.length, 
		'\nlast upcomingProduction: ', upcomingProductions.pop(), '\n---'
	)
).catch(e => console.log(e));

/*

  "Create" operation test:
   1. create user
   2. create org admined by created user
   3. create production for created org
   4. delete script
   5. delete org (will auto delete production)
   6. delete user

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

		return db.Production.create({
			orgId: producingOrg.id,
			isScripted: true,
			isSingleEvent: false,
			stagingTitle: null,
			description: null,
			scriptTitle: 'TestScript1',
			synopsis: 'Very simple narrative. Garbage is dumped onto the stage and then it ends.',
			opening: 1456819200000,
			closing: 1459494000000,
			spaceId: 1
		}).then(
			showId => ({producingOrg, user, showId})
		);
	}
).then(
	({producingOrg, user, showId}) => {
		console.log('Production.create: successful: ', showId, '\n---');

		return db.Production.getByShowId(showId)
			.then(production => ({producingOrg, user, production}));
	}
).then(
	({producingOrg, user, production}) => {
		console.log('Production.getById: successful: ', production, '\n---');

		return db.Script.deleteById(production.scriptId).then(
			rowCount => ({rowCount, producingOrg, user})
		);
	}
).then(
	({rowCount, producingOrg, user}) => {
		console.log('Script.deleteById: successful: ', rowCount, '\n---');

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
