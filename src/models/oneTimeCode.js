const
	notError = require('not-error').notError,
	Schema = require('mongoose').Schema,
	notLocale = require('not-locale'),
	uuid  =  require('uuid');

const DEFAULT_TTL = 3; //in minutes
const DEFAULT_TTL_MIN = 1; //in minutes
const DEFAULT_TTL_MAX = 60; //in minutes

module.exports.DEFAULT_TTL  = DEFAULT_TTL;
module.exports.DEFAULT_TTL_MIN  = DEFAULT_TTL_MIN;
module.exports.DEFAULT_TTL_MAX  = DEFAULT_TTL_MAX;
module.exports.thisModelName = 'OneTimeCode';
module.exports.keepNotExtended = false;

module.exports.enrich = {
	versioning: true,
	increment: false,
	validators: true
};

module.exports.thisSchema = {
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

module.exports.thisStatics = {
	createCode(payload = {}, ttl = DEFAULT_TTL){
		let OneTimeCode = this;
		ttl = parseInt(ttl);
		if ((ttl >= DEFAULT_TTL_MIN) && (ttl <= DEFAULT_TTL_MAX)){
			let now = new Date();
			now.setMinutes(now.getMinutes() + ttl);
			let code = new OneTimeCode({
				code:       uuid.v4(),
				validTill:  now,
				payload
			});
			return code.save();
		}else{
			return Promise.reject(new notError(notLocale.say('one_time_code_ttl_not_valid', {min: DEFAULT_TTL_MIN, max: DEFAULT_TTL_MAX})));
		}
	},
	findValid(code){
		if (this.isCode(code)){
			let now = new Date();
			let searchQuery = this.findOne({code: code, active: true, validTill: { $gte: now } });
			return searchQuery.exec();
		}else{
			return Promise.reject(new notError(notLocale.say('one_time_code_not_in_format')));
		}
	},
	redeemCode(code){
		if (this.isCode(code)){
			return this.findValid(code)
				.then((result)=>{
					if(result){
						return result.redeem();
					}else{
						throw new notError(notLocale.say('one_time_code_not_valid'));
					}
				});
		}else{
			return Promise.reject(new notError(notLocale.say('one_time_code_not_in_format')));
		}
	},
	isCode(str){
		return ((typeof str === 'string') && (uuid.validate(str)));
	}
};

module.exports.thisVirtuals = {};

module.exports.thisMethods = {
	isRedeemed(){
		return (typeof this.redeemed !== 'undefined' && this.redeemed !== null);
	},
	isValid(code) {
		let now = new Date();
		if (typeof code === 'undefined' || code === null){
			code = this.code;
		}
		if(typeof code === 'string' && uuid.validate(code)){
			return (this.active && (code === this.code) && (now.getTime() < this.validTill.getTime()));
		}else{
			return false;
		}
	},
	invalidate(){
		this.active = false;
		return this.save();
	},
	redeem(){
		this.redeemed = new Date();
		return this.invalidate();
	}
};
