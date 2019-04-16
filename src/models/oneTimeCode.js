const
	notError = require('not-error').notError,
	Schema = require('mongoose').Schema,
	notLocale = require('not-locale'),
	uuidv4  =  require('uuidv4');

const DEFAULT_TTL = 3; //in minutes
const DEFAULT_TTL_MIN = 1; //in minutes
const DEFAULT_TTL_MAX = 60; //in minutes

exports.DEFAULT_TTL  = DEFAULT_TTL;
exports.DEFAULT_TTL_MIN  = DEFAULT_TTL_MIN;
exports.DEFAULT_TTL_MAX  = DEFAULT_TTL_MAX;
exports.thisModelName = 'OneTimeCode';
exports.keepNotExtended = false;

exports.enrich = {
	versioning: true,
	increment: false,
	validators: true
};

exports.thisSchema = {
	code: {
		type: String,
		required: true
	},
	validTill: {
		type: Date,
		required: true
	},
	created: {
		type: Date,
		default: Date.now
	},
	active: {
		type: Boolean,
		default: true,
		required: true
	},
	redeemed: {
		type: Date,
		required: false
	},
	payload:{
		type: Schema.Types.Mixed,
		required: false
	}
};

exports.thisStatics = {
	createCode(payload = {}, ttl = DEFAULT_TTL){
		let OneTimeCode = this;
		ttl = parseInt(ttl);
		if ((ttl >= DEFAULT_TTL_MIN) && (ttl <= DEFAULT_TTL_MAX)){
			let now = new Date();
			now.setMinutes(now.getMinutes() + ttl);
			let code = new OneTimeCode({
				code:       uuidv4(),
				validTill:  now,
				payload
			});
			return code.save();
		}else{
			return Promise.reject(new notError(notLocale.say('one_time_code_ttl_not_valid', {min: DEFAULT_TTL_MIN, max: DEFAULT_TTL_MAX})));
		}
	},
	findValid(code){
		let now = new Date();
		let OneTimeCode = this;
		let searchQuery = OneTimeCode.findOne({code: code, active: true, validTill: {$gte: now}});
		return searchQuery.exec();
	},
	redeemCode(code){
		if (this.isCode(code)){
			return this.findValid(code)
				.then((result)=>{
					if(result){
						result.redeemed = new Date();
						return result.invalidate();
					}else{
						throw new notError(notLocale.say('one_time_code_not_valid'));
					}
				});
		}else{
			return Promise.reject(new notError(notLocale.say('one_time_code_not_in_format')));
		}
	},
	isCode(str){
		return ((typeof str === 'string') && (uuidv4.is(str)));
	}
};

exports.thisVirtuals = {};

exports.thisMethods = {
	isRedeemed(){
		return (typeof this.redeemed !== 'undefined' && this.redeemed !== null);
	},
	isValid(code) {
		let now = new Date();
		if (typeof code === 'undefined' || code === null){
			code = this.code;
		}
		if(typeof code === 'string' && uuidv4.is(code)){
			return (this.active && (code === this.code) && (now.getTime() < this.validTill.getTime()));
		}else{
			return false;
		}
	},
	invalidate(){
		this.active = false;
		return this.save();
	}
};
