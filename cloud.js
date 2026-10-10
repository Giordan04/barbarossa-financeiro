/* Login + nuvem por empresa (Supabase). Classic script: carregado DEPOIS do app, usa as globais S, save, render, toast, openModal.
   Sem supabaseUrl/supabaseAnonKey em config.js, não faz nada e o app segue 100% local. */
(function(){
  const CFG=window.APP_CONFIG||{};
  const CHAVE_EMPRESA='barbarossa_fin_v1_empresa'; // de qual empresa são os dados guardados neste aparelho
  const CHAVE_ESCOLHIDA='barbarossa_fin_v1_empresa_ativa';
  const C={ativo:false,empresa:null,papel:null,user:null,versao:0};
  window.CLOUD=C;
  if(!CFG.supabaseUrl||!CFG.supabaseAnonKey)return;
  if(typeof window.claude!=='undefined')return; // dentro do Claude a sincronização nativa continua valendo

  let sb=null,ultimoEnviado=null,timer=null,enviando=false,pendente=false,pausado=false;
  const $=s=>document.querySelector(s);
  const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ls={get:k=>{try{return localStorage.getItem(k)}catch(e){return null}},set:(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}},del:k=>{try{localStorage.removeItem(k)}catch(e){}}};

  function carregarLib(){
    return new Promise((ok,fail)=>{
      if(window.supabase&&window.supabase.createClient)return ok();
      const s=document.createElement('script');
      s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
      s.onload=ok;s.onerror=()=>fail(new Error('Não consegui carregar a biblioteca de login. Verifique a internet.'));
      document.head.appendChild(s);
    });
  }

  /* ---------- tela de login ---------- */
  const CSS=`
  #cloud-ov{position:fixed;inset:0;z-index:200;background:var(--bg);background-image:var(--glow);background-repeat:no-repeat;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto}
  #cloud-ov .box{width:100%;max-width:400px}
  #cloud-ov .lg{width:58px;height:58px;border-radius:16px;background:var(--grad);color:#d9b866;border:1px solid rgba(201,162,74,.45);display:grid;place-items:center;font-family:var(--serif);font-weight:600;font-size:30px;margin:0 auto 14px}
  #cloud-ov h1{text-align:center;font-size:24px;margin-bottom:4px}
  #cloud-ov .sub{text-align:center;color:var(--muted);font-size:13px;margin-bottom:18px}
  #cloud-ov .abas{display:flex;gap:6px;background:var(--card2);border:1px solid var(--border);border-radius:12px;padding:3px;margin-bottom:14px}
  #cloud-ov .abas button{flex:1;padding:9px;border-radius:9px;font-weight:600;font-size:13px;color:var(--muted)}
  #cloud-ov .abas button.on{background:linear-gradient(180deg,var(--pri2),var(--pri));color:var(--priText)}
  #cloud-ov .btn{width:100%;margin-top:6px}
  #cloud-ov .lnk{display:block;text-align:center;margin-top:12px;color:var(--muted);font-size:12.5px;text-decoration:underline;width:100%}
  #cloud-ov .msg{min-height:18px;margin-top:10px;text-align:center;font-size:12.5px;font-weight:600}
  #cloud-ov .msg.e{color:var(--red)}#cloud-ov .msg.o{color:var(--green)}`;
  function tela(html){
    let ov=$('#cloud-ov');
    if(!ov){
      if(!$('#cloud-css')){const st=document.createElement('style');st.id='cloud-css';st.textContent=CSS;document.head.appendChild(st)}
      ov=document.createElement('div');ov.id='cloud-ov';document.body.appendChild(ov);
    }
    ov.innerHTML='<div class="box">'+html+'</div>';
    return ov;
  }
  function fechaTela(){const ov=$('#cloud-ov');if(ov)ov.remove()}
  function msg(t,tipo){const m=$('#cloud-msg');if(m){m.textContent=t||'';m.className='msg '+(tipo||'')}}
  const cab=(sub)=>`<div class="lg">${E((CFG.nome||'F').trim().charAt(0).toUpperCase())}</div><h1>${E(CFG.nome||'Financeiro')}</h1><div class="sub">${sub}</div>`;
  const traduz=m=>{
    m=String(m||'');
    if(/Invalid login credentials/i.test(m))return 'E-mail ou senha incorretos.';
    if(/already registered|already been registered/i.test(m))return 'Este e-mail já tem conta. Use "Entrar".';
    if(/Password should be at least/i.test(m))return 'A senha precisa ter pelo menos 6 caracteres.';
    if(/Email not confirmed/i.test(m))return 'Confirme seu e-mail (veja a caixa de entrada) e tente de novo.';
    if(/rate limit|too many/i.test(m))return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
    if(/Failed to fetch|NetworkError/i.test(m))return 'Sem conexão com a internet.';
    return m;
  };

  function telaLogin(aba){
    aba=aba||'entrar';const novo=aba==='criar';
    tela(`${cab(novo?'Crie a conta da sua barbearia':'Entre para acessar o financeiro')}
    <div class="abas"><button data-a="entrar" class="${novo?'':'on'}">Entrar</button><button data-a="criar" class="${novo?'on':''}">Criar conta</button></div>
    <form id="cloud-f" novalidate>
      ${novo?'<div class="fld"><label>Nome da barbearia / salão</label><input id="cl-emp" autocomplete="organization" placeholder="Ex.: Barbearia do João"></div>':''}
      <div class="fld"><label>E-mail</label><input id="cl-em" type="email" autocomplete="email" inputmode="email" placeholder="voce@email.com"></div>
      <div class="fld"><label>Senha</label><input id="cl-pw" type="password" autocomplete="${novo?'new-password':'current-password'}" placeholder="${novo?'mínimo 6 caracteres':'sua senha'}"></div>
      <button class="btn" type="submit" id="cl-go">${novo?'Criar conta':'Entrar'}</button>
      ${novo?'':'<button class="lnk" type="button" id="cl-rec">Esqueci minha senha</button>'}
      <div id="cloud-msg" class="msg"></div>
    </form>`);
    document.querySelectorAll('#cloud-ov .abas button').forEach(b=>b.onclick=()=>telaLogin(b.dataset.a));
    const rec=$('#cl-rec');
    if(rec)rec.onclick=async()=>{
      const em=$('#cl-em').value.trim();if(!em){msg('Digite seu e-mail acima primeiro.','e');return}
      const {error}=await sb.auth.resetPasswordForEmail(em,{redirectTo:location.origin+location.pathname});
      error?msg(traduz(error.message),'e'):msg('Enviamos um link para redefinir a senha no seu e-mail.','o');
    };
    $('#cloud-f').onsubmit=async ev=>{
      ev.preventDefault();
      const em=$('#cl-em').value.trim(),pw=$('#cl-pw').value,nome=novo?$('#cl-emp').value.trim():'';
      if(novo&&nome.length<2){msg('Informe o nome da barbearia.','e');return}
      if(!/^\S+@\S+\.\S+$/.test(em)){msg('E-mail inválido.','e');return}
      if(pw.length<6){msg('A senha precisa ter pelo menos 6 caracteres.','e');return}
      const go=$('#cl-go');go.disabled=true;msg('');
      try{
        if(novo){
          const {data,error}=await sb.auth.signUp({email:em,password:pw,options:{data:{empresa_pendente:nome},emailRedirectTo:location.origin+location.pathname}});
          if(error)throw error;
          if(!data.session){ls.set('barbarossa_fin_v1_empresa_pendente',nome);msg('Conta criada! Confirme o e-mail que enviamos e depois volte e entre.','o');go.disabled=false;return}
          await aposLogin(data.session.user,nome);
        }else{
          const {data,error}=await sb.auth.signInWithPassword({email:em,password:pw});
          if(error)throw error;
          await aposLogin(data.user);
        }
      }catch(e){msg(traduz(e.message),'e');go.disabled=false}
    };
  }

  function telaNomeEmpresa(){
    tela(`${cab('Falta só um passo: qual o nome da sua barbearia ou salão?')}
    <form id="cloud-f"><div class="fld"><label>Nome da barbearia / salão</label><input id="cl-emp" placeholder="Ex.: Barbearia do João"></div>
    <button class="btn" type="submit">Continuar</button><button class="lnk" type="button" id="cl-out">Sair</button><div id="cloud-msg" class="msg"></div></form>`);
    $('#cl-out').onclick=()=>C.sair(true);
    $('#cloud-f').onsubmit=async ev=>{
      ev.preventDefault();const n=$('#cl-emp').value.trim();
      if(n.length<2){msg('Informe o nome.','e');return}
      try{await aposLogin(C.user,n)}catch(e){msg(traduz(e.message),'e')}
    };
  }

  /* ---------- fluxo após autenticar ---------- */
  async function minhasEmpresas(){
    const {data,error}=await sb.from('membros').select('papel, empresas(id,nome)').order('criado_em');
    if(error)throw error;
    return (data||[]).filter(m=>m.empresas).map(m=>({id:m.empresas.id,nome:m.empresas.nome,papel:m.papel}));
  }
  async function aposLogin(user,nomeNovaEmpresa){
    C.user=user;
    let lista=await minhasEmpresas();
    if(!lista.length){
      const nome=nomeNovaEmpresa||ls.get('barbarossa_fin_v1_empresa_pendente')||(user.user_metadata&&user.user_metadata.empresa_pendente);
      if(!nome){telaNomeEmpresa();return}
      const {error}=await sb.rpc('criar_empresa',{p_nome:nome});
      if(error)throw error;
      ls.del('barbarossa_fin_v1_empresa_pendente');
      lista=await minhasEmpresas();
    }
    const pref=ls.get(CHAVE_ESCOLHIDA);
    const emp=lista.find(x=>x.id===pref)||lista[0];
    C.empresa=emp;C.papel=emp.papel;C.lista=lista;
    await sincronizarInicial();
    C.ativo=true;
    fechaTela();
    setStatus('ao_vivo');
  }

  function dadosVazios(s){
    return !s||!((s.entradas||[]).length||(s.despesas||[]).length||(s.clientes||[]).length||(s.contas||[]).length||(s.colaboradores||[]).length||(s.contasPagar||[]).length||(s.contasReceber||[]).length);
  }
  function guardarCopiaLocal(){try{localStorage.setItem('barbarossa_fin_v1_copia_'+Date.now(),JSON.stringify(S))}catch(e){}}
  function aplicarEstado(obj){
    // substitui o estado em memória pelo da nuvem, mantendo o formato esperado pelo app
    const novo=Object.assign(blank(),obj);novo.imp=Object.assign(blank().imp,obj.imp||{});
    S=novo;
    try{ensureConfig()}catch(e){console.warn(e)}
    try{atualizarIconePWA()}catch(e){}
  }
  async function lerNuvem(){
    const {data,error}=await sb.from('app_state').select('data,versao').eq('empresa_id',C.empresa.id).single();
    if(error)throw error;
    return data;
  }
  async function sincronizarInicial(){
    const nuvem=await lerNuvem();
    C.versao=nuvem.versao;
    const donoLocal=ls.get(CHAVE_EMPRESA);
    const nuvemVazia=!nuvem.data||!Object.keys(nuvem.data).length||dadosVazios(nuvem.data);
    if(nuvemVazia){
      // empresa nova: sobe o que já existe neste aparelho (migração dos dados atuais) — a menos que sejam de OUTRA empresa
      if(donoLocal&&donoLocal!==C.empresa.id){guardarCopiaLocal();S=blank();ensureConfig()}
      ls.set(CHAVE_EMPRESA,C.empresa.id);
      await enviar(true);
    }else{
      if(!dadosVazios(S)&&donoLocal!==C.empresa.id)guardarCopiaLocal(); // nunca perde o que estava só neste aparelho
      aplicarEstado(nuvem.data);
      ultimoEnviado=JSON.stringify(S);
      ls.set(CHAVE_EMPRESA,C.empresa.id);
      try{localStorage.setItem(KEY,ultimoEnviado)}catch(e){}
    }
    render();
  }

  /* ---------- envio (com controle de versão) ---------- */
  function setStatus(v){try{setSyncStatus(v)}catch(e){}}
  C.agendar=function(){
    if(!C.ativo||pausado)return;
    if(C.papel==='contador'){return}
    clearTimeout(timer);timer=setTimeout(()=>enviar(false),1500);
  };
  async function enviar(primeiro){
    if(enviando){pendente=true;return}
    const json=JSON.stringify(S);
    if(json===ultimoEnviado)return;
    enviando=true;
    try{
      if(!primeiro)setStatus('carregando');
      const {data,error}=await sb.from('app_state')
        .update({data:JSON.parse(json),versao:C.versao+1,atualizado_em:new Date().toISOString(),atualizado_por:C.user.id})
        .eq('empresa_id',C.empresa.id).eq('versao',C.versao).select('versao');
      if(error)throw error;
      if(!data||!data.length){await conflito();return}
      C.versao=data[0].versao;ultimoEnviado=json;
      try{desmarcarSujo()}catch(e){}
      try{SYNC_ULTIMO=Date.now()}catch(e){}
      setStatus('ao_vivo');
    }catch(e){
      console.warn('falha ao enviar para a nuvem',e);
      setStatus('erro');
      clearTimeout(timer);timer=setTimeout(()=>enviar(false),8000); // tenta de novo sozinho
    }finally{
      enviando=false;
      if(pendente){pendente=false;C.agendar()}
    }
  }
  async function conflito(){
    // outro aparelho gravou antes: pergunta qual versão fica
    pausado=true;
    const nuvem=await lerNuvem();
    const fica=confirm('Os dados foram alterados em outro aparelho.\n\nOK = carregar a versão da nuvem (suas alterações desta tela serão descartadas)\nCancelar = manter a sua versão e sobrescrever a nuvem');
    if(fica){
      guardarCopiaLocal();aplicarEstado(nuvem.data);C.versao=nuvem.versao;ultimoEnviado=JSON.stringify(S);
      try{localStorage.setItem(KEY,ultimoEnviado)}catch(e){}
      render();setStatus('ao_vivo');
    }else{
      C.versao=nuvem.versao;ultimoEnviado=null;
    }
    pausado=false;
    if(!fica)setTimeout(()=>enviar(false),0);
  }
  // ao voltar para o app, busca mudanças feitas em outro aparelho (só se não houver nada pendente aqui)
  async function puxarSeNovo(){
    if(!C.ativo||enviando||pausado)return;
    if(JSON.stringify(S)!==ultimoEnviado)return;
    try{
      const {data,error}=await sb.from('app_state').select('versao').eq('empresa_id',C.empresa.id).single();
      if(error||!data||data.versao<=C.versao)return;
      const n=await lerNuvem();
      aplicarEstado(n.data);C.versao=n.versao;ultimoEnviado=JSON.stringify(S);
      try{localStorage.setItem(KEY,ultimoEnviado)}catch(e){}
      render();
    }catch(e){}
  }
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden'){clearTimeout(timer);if(C.ativo&&JSON.stringify(S)!==ultimoEnviado)enviar(false)}
    else puxarSeNovo();
  });
  window.addEventListener('online',()=>{if(C.ativo)enviar(false)});

  /* ---------- conta / sair ---------- */
  C.abrirConta=function(){
    const st={ao_vivo:'Sincronizado',carregando:'Salvando…',erro:'Sem conexão — tentando de novo'}[SYNC_STATUS]||'';
    const papel={dono:'Dono',gerente:'Gerente',contador:'Contador (só leitura)'}[C.papel]||C.papel;
    openModal(`<h2>Minha conta</h2><div class="sub">${E(C.empresa.nome)}</div>
    <div class="hint" style="margin:6px 0 12px"><b>Usuário:</b> ${E(C.user.email)}<br><b>Papel:</b> ${E(papel)}<br><b>Nuvem:</b> ${E(st)}</div>
    <div class="acts"><button class="btn sec" data-act="fechar">Fechar</button><button class="btn warn" onclick="CLOUD.sair()">Sair da conta</button></div>`);
  };
  C.sair=async function(semEnviar){
    if(!semEnviar&&C.ativo&&JSON.stringify(S)!==ultimoEnviado){
      clearTimeout(timer);await enviar(false);
      if(JSON.stringify(S)!==ultimoEnviado&&!confirm('Há alterações que ainda não foram salvas na nuvem. Sair mesmo assim? (elas serão perdidas)'))return;
    }
    C.ativo=false;
    try{await sb.auth.signOut()}catch(e){}
    guardarCopiaLocal();
    S=blank();ensureConfig();ultimoEnviado=null;
    try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}
    ls.del(CHAVE_EMPRESA);
    location.reload();
  };
  window.addEventListener('beforeunload',()=>{});

  /* ---------- início ---------- */
  (async function iniciar(){
    try{
      tela(cab('Carregando…'));
      await carregarLib();
      sb=window.supabase.createClient(CFG.supabaseUrl,CFG.supabaseAnonKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
      C.sb=sb;
      const {data}=await sb.auth.getSession();
      if(data&&data.session){
        try{await aposLogin(data.session.user)}
        catch(e){console.warn(e);tela(`${cab('Não foi possível carregar seus dados.')}<div class="msg e">${E(traduz(e.message))}</div><button class="btn" onclick="location.reload()">Tentar de novo</button><button class="lnk" onclick="CLOUD.sair(true)">Sair da conta</button>`)}
      }else telaLogin('entrar');
      sb.auth.onAuthStateChange((ev)=>{if(ev==='PASSWORD_RECOVERY')telaNovaSenha()});
    }catch(e){
      tela(`${cab('Sem conexão')}<div class="msg e">${E(traduz(e.message))}</div><button class="btn" onclick="location.reload()">Tentar de novo</button>`);
    }
  })();

  function telaNovaSenha(){
    tela(`${cab('Defina sua nova senha')}<form id="cloud-f"><div class="fld"><label>Nova senha</label><input id="cl-pw" type="password" autocomplete="new-password" placeholder="mínimo 6 caracteres"></div>
    <button class="btn" type="submit">Salvar senha</button><div id="cloud-msg" class="msg"></div></form>`);
    $('#cloud-f').onsubmit=async ev=>{
      ev.preventDefault();const pw=$('#cl-pw').value;
      if(pw.length<6){msg('Mínimo 6 caracteres.','e');return}
      const {error}=await sb.auth.updateUser({password:pw});
      if(error){msg(traduz(error.message),'e');return}
      location.href=location.pathname;
    };
  }
})();
