import {createClient} from './backend.js';
import {accountStorage,CloudSaves} from './cloud-saves.js';
export const SUPABASE_URL='https://kokysdjdcooxbcnrprsv.supabase.co';
export const PUBLISHABLE_KEY='sb_publishable_Yh1rORnfzItLDM3QNM3KQQ_rdPTLWis';
export const client=createClient(SUPABASE_URL,PUBLISHABLE_KEY,{auth:{storageKey:'little-forest-auth-v1',detectSessionInUrl:false},global:{fetch:(url,init={})=>fetch(url,{...init,signal:init.signal?AbortSignal.any([init.signal,AbortSignal.timeout(15000)]):AbortSignal.timeout(15000)})}});
export function validCredentials(username,password){
 if(!/^[a-z0-9_]{3,20}$/.test(username.trim().toLowerCase()))throw new Error('아이디는 영문·숫자·밑줄 3~20자로 입력해 주세요.');
 if(password.length<8||password.length>72)throw new Error('비밀번호는 8~72자로 입력해 주세요.');
}
export async function authenticate(action,username,password){
 validCredentials(username,password);
 let response;
 try{response=await fetch(`${SUPABASE_URL}/functions/v1/beetle-auth`,{method:'POST',headers:{apikey:PUBLISHABLE_KEY,'Content-Type':'application/json'},body:JSON.stringify({action,username:username.trim().toLowerCase(),password}),signal:AbortSignal.timeout(15000)});}catch{throw new Error('로그인 서버에 연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.');}
 const result=await response.json();if(!response.ok)throw new Error(result.error||'로그인하지 못했어요.');
 const {data,error}=await client.auth.setSession({access_token:result.session.access_token,refresh_token:result.session.refresh_token});
 if(error)throw new Error('로그인 정보를 저장하지 못했어요. 다시 로그인해 주세요.');return data.user;
}
export async function resumeAccount(){const {data,error}=await client.auth.getSession();if(error)throw error;return data.session?.user?.app_metadata?.app==='beetle-forest'?data.session.user:null;}
export async function openAccount(user,storage,notify){const scoped=accountStorage(storage,user.id),cloud=new CloudSaves(client,scoped,user.id,notify);await cloud.load();return {user,storage:scoped,cloud};}
export async function signOut(){const {error}=await client.auth.signOut({scope:'local'});if(error)throw new Error('로그아웃하지 못했어요. 연결을 확인해 주세요.');}
