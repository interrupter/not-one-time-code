
const
	expect = require('chai').expect,
	assert = require('chai').assert,
	notError = require('not-error'),
	path = require('path'),
	notLocale = require('not-locale'),
	Proto = require('not-node').Proto,
	uuidv4  =  require('uuidv4'),
	OneTimeCode = require('../src/models/oneTimeCode.js'),
	mongoose = require('mongoose'),
	MongoMemoryServer = require('mongodb-memory-server').MongoMemoryServer,
	mongoServer = new MongoMemoryServer();

before((done) => {
	notLocale.fromDir(path.join(__dirname, '../src/locales'));
	mongoServer
		.getConnectionString()
		.then((mongoUri) => {
			return mongoose.connect(mongoUri, {}, (err) => {
				if (err) {
					done(err);
				}
			});
		})
		.then(()=>{
			Proto.fabricate(OneTimeCode, {}, mongoose);
			console.log('DB connected, OneTimeCode model fabricated!');
			done();
		})
		.catch((e)=>{
			console.error(e);
			done(e);
		});
});

after((done) => {
	mongoose.disconnect();
	mongoServer.stop();
	done();
});

describe('OneTimeCode', function () {
	it('create code, no payload, default TTL', (done) => {
		OneTimeCode.OneTimeCode.createCode()
			.then((result)=>{
				expect(result.payload).to.be.deep.equal({});
				expect(result.active).to.be.true;
				expect(result.validTill).to.be.a('date');
				expect(result.created).to.be.a('date');
				expect(result.redeemed).to.be.an('undefined');
				expect(uuidv4.is(result.code)).to.be.true;
				done();
			})
			.catch((err)=>{
				done(err);
			});
	});
	it('create code, no payload, not default TTL', (done) => {
		OneTimeCode.OneTimeCode.createCode({}, 10)
			.then((result)=>{
				expect(result.payload).to.be.deep.equal({});
				expect(result.active).to.be.true;
				expect(result.validTill).to.be.a('date');
				expect(result.created).to.be.a('date');
				expect(result.redeemed).to.be.an('undefined');
				expect(uuidv4.is(result.code)).to.be.true;
				done();
			})
			.catch((err)=>{
				done(err);
			});
	});
	it('create code, not empty payload, not default TTL', (done) => {
		OneTimeCode.OneTimeCode.createCode({verification: 'code', 'action': 'submit'}, 10)
			.then((result)=>{
				expect(result.payload).to.be.deep.equal({
					verification: 'code', 'action': 'submit'
				});
				expect(result.active).to.be.true;
				expect(result.validTill).to.be.a('date');
				expect(result.created).to.be.a('date');
				expect(result.redeemed).to.be.an('undefined');
				expect(uuidv4.is(result.code)).to.be.true;
				done();
			})
			.catch((err)=>{
				done(err);
			});
	});

	it('create code, not empty payload, not valid TTL', (done) => {
		OneTimeCode.OneTimeCode.createCode({verification: 'code', 'action': 'submit'}, -10)
			.then(()=>{
				done(new Error('Worked fine, this is wrong.'));
			})
			.catch(()=>{
				done();
			});
	});

	it('create code with payload and valid TTL, isValid, invalidate, isValid', (done) => {
		OneTimeCode.OneTimeCode.createCode({verification: 'code', 'action': 'submit'}, 10)
			.then((result)=>{
				expect(result.payload).to.be.deep.equal({
					verification: 'code', 'action': 'submit'
				});
				expect(result.active).to.be.true;
				expect(result.validTill).to.be.a('date');
				expect(result.created).to.be.a('date');
				expect(result.redeemed).to.be.an('undefined');
				expect(uuidv4.is(result.code)).to.be.true;
				expect(result.isValid()).to.be.true;
				expect(result.isRedeemed()).to.be.false;
				return result.invalidate();
			})
			.then((result)=>{
				expect(result.isValid()).to.be.false;
				expect(result.isRedeemed()).to.be.false;
				result.code = 'pork, fish and beef enter a bar';
				expect(result.isValid()).to.be.false;
				expect(result.isValid('finished')).to.be.false;
				done();
			})
			.catch((err)=>{
				done(err);
			});
	});

	it('findValid, ok', (done) => {
		let code = '',
		 payload = {verification: 'code', 'action': 'submit'};
		OneTimeCode.OneTimeCode.createCode(payload, 10)
			.then((result)=>{
				code = result.code;
				return OneTimeCode.OneTimeCode.findValid(code);
			})
			.then((result)=>{
				expect(result).to.be.not.null;
				expect(result).to.be.not.undefined;
				expect(result.payload).to.be.deep.equal(payload);
				expect(result.active).to.be.true;
				expect(result.validTill).to.be.a('date');
				expect(result.created).to.be.a('date');
				expect(result.redeemed).to.be.an('undefined');
				expect(uuidv4.is(result.code)).to.be.true;
				expect(result.code).to.be.equal(code);
				expect(result.isValid()).to.be.true;
				expect(result.isRedeemed()).to.be.false;
				done();
			})
			.catch((err)=>{
				done(err);
			});
	});

	it('findValid, failed', (done) => {
		let code = '',
		 payload = {verification: 'code', 'action': 'submit'};
		OneTimeCode.OneTimeCode.createCode(payload, 10)
			.then((result)=>{
				code = result.code;
				return OneTimeCode.OneTimeCode.findValid('asdiueriueqrg');
			})
			.then((result)=>{
				expect(result).to.be.null;
				done();
			})
			.catch((err)=>{
				done(err);
			});
	});

	it('redeemCode, ok', (done) => {
		let code = '',
		 payload = {verification: 'code', 'action': 'submit'};
		OneTimeCode.OneTimeCode.createCode(payload, 10)
			.then((result)=>{
				code = result.code;
				return OneTimeCode.OneTimeCode.redeemCode(code);
			})
			.then((result)=>{
				expect(result).to.be.not.null;
				expect(result).to.be.not.undefined;
				expect(result.payload).to.be.deep.equal(payload);
				expect(result.active).to.be.false;
				expect(result.validTill).to.be.a('date');
				expect(result.created).to.be.a('date');
				expect(result.redeemed).to.be.a('date');
				expect(uuidv4.is(result.code)).to.be.true;
				expect(result.code).to.be.equal(code);
				expect(result.isValid()).to.be.false;
				expect(result.isRedeemed()).to.be.true;
				done();
			})
			.catch((err)=>{
				done(err);
			});
	});

	it('redeemCode, failed, code is not of type', (done) => {
		OneTimeCode.OneTimeCode.createCode()
			.then(()=>{
				return OneTimeCode.OneTimeCode.redeemCode('asdiueriueqrg');
			})
			.then(()=>{
				done(new Error('Worked fine, this is wrong.'));
			})
			.catch((err)=>{
				expect(err.message).to.be.equal(notLocale.say('one_time_code_not_in_format'));
				done();
			});
	});

	it('redeemCode, failed, code is not exists', (done) => {
		OneTimeCode.OneTimeCode.createCode()
			.then(()=>{
				return OneTimeCode.OneTimeCode.redeemCode(uuidv4());
			})
			.then(()=>{
				done(new Error('Worked fine, this is wrong.'));
			})
			.catch((err)=>{
				expect(err.message).to.be.equal(notLocale.say('one_time_code_not_valid'));
				done();
			});
	});
});
