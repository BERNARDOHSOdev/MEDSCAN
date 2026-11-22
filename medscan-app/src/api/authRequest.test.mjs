import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requestSession, AUTH_TIMEOUT_MS} from './authRequest.js';

test('login allows cold startup and preserves valid session', async()=>{
 assert.equal(AUTH_TIMEOUT_MS,60000);
 const session={token:'test-token',user:{name:'Test'}};
 const result=await requestSession('https://example.invalid/api','/auth/login',{email:'test@example.invalid'},async(url,options)=>{
  assert.equal(url,'https://example.invalid/api/auth/login');
  assert.equal(options.method,'POST');
  return {ok:true,json:async()=>session};
 });
 assert.deepEqual(result,session);
});
test('cookie mode sends credentials and accepts a response without a token',async()=>{
 const user={id:'one'};
 const result=await requestSession('https://example.invalid/api','/auth/login',{},async(_url,options)=>{
  assert.equal(options.credentials,'include'); assert.equal(options.headers['X-Medscan-Session'],'cookie');
  return {ok:true,json:async()=>({user})};
 },1000,true);
 assert.deepEqual(result,{user});
});
test('credentials error is distinguished from connection failure',async()=>{
 await assert.rejects(requestSession('','',{},async()=>({ok:false,status:401,json:async()=>({})})),/E-mail ou senha incorretos/);
 await assert.rejects(requestSession('','',{},async()=>{throw new TypeError('network')}),/Verifique sua internet/);
});
test('a rate-limited login displays the server message',async()=>{
 await assert.rejects(requestSession('','',{},async()=>({ok:false,status:429,json:async()=>({message:'Muitas tentativas. Tente novamente mais tarde.'})})),/Muitas tentativas/);
});
test('timeout has a specific message and aborts the request',async()=>{
 await assert.rejects(requestSession('','',{},async(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted')))),10),/demorou para responder/);
});
test('invalid session and server outage do not look like a successful login',async()=>{
 await assert.rejects(requestSession('','',{},async()=>({ok:true,json:async()=>({})})),/sessão válida/);
 await assert.rejects(requestSession('','',{},async()=>({ok:false,status:503,json:async()=>({})})),/temporariamente indisponível/);
});
