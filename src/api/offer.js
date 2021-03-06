import StellarSdk from 'stellar-sdk'
import {getServer} from './server'
import { address as getAddress } from './account'
import { getAsset } from './assets'
var Promise = require('es6-promise').Promise

// query address offers
// return Promise
export function queryOffer(address, limit = 200) {
  return getServer().offers('accounts', address).limit(limit).call();
};

function _offer(seed,selling, buying, amount, price) {
  amount = amount.toFixed(7);//Math.round(amount, 7);
  console.debug('Sell', amount, selling.code, 'for', buying.code, '@', price);
  return getServer().loadAccount(getAddress(seed)).then(function(account){
    //account.incrementSequenceNumber();
    var op = StellarSdk.Operation.manageOffer({
      selling: selling,
      buying: buying,
      amount: amount,
      price : price.toString()
    });
    var tx = new StellarSdk.TransactionBuilder(account).addOperation(op).build();
    tx.sign(StellarSdk.Keypair.fromSecret(seed));
    return getServer().submitTransaction(tx);
  });
}

// option {type:'buy', currency:'XLM', issuer: '', base: 'CNY', base_issuer: 'GXXX', amount: 100, price: 0.01}
export function offer(seed, option) {
  console.debug('%s %s %s use %s@ %s', option.type, option.amount, option.currency, option.base, option.price);
  var buying, selling;
  var selling_amount, selling_price;
  
  if (option.type == 'buy') {
    selling = getAsset(option.base, option.base_issuer);
    buying = getAsset(option.currency, option.issuer);
    selling_amount = option.amount * option.price;
    selling_price = 1 / option.price;
  } else {
    selling = getAsset(option.currency, option.issuer);
    buying = getAsset(option.base, option.base_issuer);
    selling_amount = option.amount;
    selling_price = option.price;
  }
  console.log(selling_amount)
  console.log(typeof selling_amount)
  return _offer(seed,selling, buying, selling_amount, selling_price);
};

export function cancel(seed,offer) {
  console.log('------cancel-----')
  console.log(offer)
  var selling, buying, price, offer_id;
  if (typeof offer === 'object') {
    selling = offer.selling;
    selling = offer.selling.asset_type==='native' ? new StellarSdk.Asset.native():new StellarSdk.Asset(offer.selling.asset_code, offer.selling.asset_issuer);
    buying  = offer.buying.asset_type==='native' ? new StellarSdk.Asset.native():new StellarSdk.Asset(offer.buying.asset_code, offer.buying.asset_issuer);
    price   = Number(offer.price).toFixed(7);
    offer_id = offer.id;
  } else {
    //TODO ??
    selling = StellarSdk.Asset.native();
    buying  = new StellarSdk.Asset('DUMMY', account.accountId());
    price   = "1";
    offer_id = offer;
  }
  console.log(selling)
  console.log(buying)
  console.debug('Cancel Offer', offer_id);
  return getServer().loadAccount(getAddress(seed)).then((account)=>{
    //account.incrementSequenceNumber();
    var op = StellarSdk.Operation.manageOffer({
      selling: selling,
      buying: buying,
      amount: "0",
      price : price,
      offerId : offer_id
    });
    var tx = new StellarSdk.TransactionBuilder(account).addOperation(op).build();
    tx.sign(StellarSdk.Keypair.fromSecret(seed));
    return getServer().submitTransaction(tx);
  });

}

export function myofferConvert(sellasset,buyasset,my){
  let data = []
  my.forEach(ele=>{
    let sellcode = 'XLM'
    let sellissuer = null
    let buycode = 'XLM'
    let buyissuer = null
    if(ele.selling.asset_type!='native'){
      sellcode = ele.selling.asset_code
      sellissuer = ele.selling.asset_issuer
    }
    if(ele.buying.asset_type!='native'){
      buycode = ele.buying.asset_code
      buyissuer = ele.buying.asset_issuer 
    }
    let obj = null
    if(sellcode === sellasset.code 
        && buycode === buyasset.code
        && (sellissuer === sellasset.issuer
          || (sellissuer === null && (sellasset.issuer === null||sellasset.issuer === undefined))
        )
        && (buyissuer === buyasset.issuer
          || (buyissuer === null && (buyasset.issuer === null||buyasset.issuer === undefined))
        ) 
        ){
      obj = Object.assign({}, ele, {type: 'sell'})
      obj.amount = Number(obj.amount)
      obj.price = Number(obj.price)
      obj.base = Number((obj.amount * obj.price).toFixed(7))
      data.push(obj)
    }else if(
      buycode === sellasset.code 
        && sellcode === buyasset.code
        && (buyissuer === sellasset.issuer
          || (buyissuer === null && (sellasset.issuer === null||sellasset.issuer === undefined))
        )
        && (sellissuer === buyasset.issuer
          || (sellissuer=== null && (buyasset.issuer===null||buyasset.issuer === undefined))
        )
    ){
      obj = Object.assign({}, ele, {type: 'buy'})
      obj.amount = Number(obj.amount)
      obj.price = Number(obj.price)
      obj.base = Number((obj.amount * obj.price).toFixed(7))
      obj.price = Number((1 / obj.price).toFixed(4))
      data.push(obj)
    }
  })
  console.log('-------------------data:')
  console.log(data)
  data.sort(function(a,b){
    return b.price - a.price
  })
  return data
}
