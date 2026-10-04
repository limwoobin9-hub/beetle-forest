// Supabase Auth hashes passwords and issues sessions. No mail is sent.
const base=Deno.env.get('SUPABASE_URL')!;
const secret=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}').default||Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const published=Object.values(JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')||'{}'));
published.push(Deno.env.get('SUPABASE_ANON_KEY'));
const origins=new Set(['https://beetle-forest.vercel.app','http://localhost:5173','http://localhost:5174','http://127.0.0.1:5173']);
const usernamePattern=/^[a-z0-9_]{3,20}$/;
async function api(path:string,body:unknown,key:string){
  const headers:Record<string,string>={'apikey':key,'Content-Type':'application/json'};
  if(key.startsWith('eyJ'))headers.Authorization=`Bearer ${key}`;
  const response=await fetch(`${base}${path}`,{method:'POST',headers,body:JSON.stringify(body)});
  return {ok:response.ok,status:response.status,data:await response.json()};
}
async function limit(value:string,seconds:number,max:number){
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${secret}:${value}`));
  const fingerprint=Array.from(new Uint8Array(bytes),v=>v.toString(16).padStart(2,'0')).join('');
  const result=await api('/rest/v1/rpc/beetle_consume_auth_limit',{p_fingerprint:fingerprint,p_seconds:seconds,p_max:max},secret);
  if(!result.ok)throw new Error('limit unavailable');
  return result.data===true;
}
Deno.serve(async(req:Request)=>{
  const origin=req.headers.get('Origin');
  const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin'};
  if(origin&&origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
  headers['Access-Control-Allow-Headers']='apikey,content-type';
  headers['Access-Control-Allow-Methods']='POST,OPTIONS';
  const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers});
  if(origin&&!origins.has(origin))return reply({error:'허용되지 않은 접속입니다.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(req.method!=='POST')return reply({error:'POST 요청이 필요합니다.'},405);
  const key=req.headers.get('apikey')||'';
  // Login and signup validate credentials below; a session is not needed yet.
  if(!published.includes(key))return reply({error:'접속 정보를 확인해 주세요.'},401);
  try{
    const text=await req.text();
    if(text.length>4096)return reply({error:'입력 내용이 너무 깁니다.'},413);
    const body=JSON.parse(text),username=typeof body.username==='string'?body.username.trim().toLowerCase():'';
    const password=body.password;
    if(!['signup','login'].includes(body.action)||!usernamePattern.test(username))return reply({error:'아이디는 영문·숫자·밑줄 3~20자로 입력해 주세요.'},400);
    if(typeof password!=='string'||password.length<8||password.length>72)return reply({error:'비밀번호는 8~72자로 입력해 주세요.'},400);
    const ip=(req.headers.get('cf-connecting-ip')||req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();
    if(!await limit(`${body.action}:ip:${ip}`,900,body.action==='signup'?8:50)||!await limit(`${body.action}:id:${username}`,900,body.action==='signup'?5:15))return reply({error:'시도가 너무 많아요. 15분 뒤 다시 시도해 주세요.'},429);
    // Reserved internal identifier; it is never shown or used for email delivery.
    const email=`${username}@beetle-forest.invalid`;
    if(body.action==='signup'){
      const created=await api('/auth/v1/admin/users',{email,password,email_confirm:true,app_metadata:{app:'beetle-forest'},user_metadata:{username}},secret);
      if(!created.ok){
        if(created.data?.code==='email_exists'||created.data?.msg?.includes('already')||created.data?.message?.includes('already'))return reply({error:'이미 사용 중인 아이디입니다.'},409);
        if(created.status===422)return reply({error:'이 비밀번호로 가입할 수 없어요. 다른 비밀번호를 입력해 주세요.'},400);
        return reply({error:'가입하지 못했어요. 잠시 뒤 다시 시도해 주세요.'},503);
      }
    }
    const signed=await api('/auth/v1/token?grant_type=password',{email,password},key);
    if(!signed.ok||signed.data?.user?.app_metadata?.app!=='beetle-forest')return reply({error:body.action==='signup'?'가입은 완료됐어요. 로그인해 주세요.':'아이디 또는 비밀번호가 맞지 않아요.'},401);
    return reply({session:signed.data,username});
  }catch(error){
    if(error instanceof SyntaxError)return reply({error:'입력 내용을 확인해 주세요.'},400);
    return reply({error:'연결하지 못했어요. 잠시 뒤 다시 시도해 주세요.'},503);
  }
});
